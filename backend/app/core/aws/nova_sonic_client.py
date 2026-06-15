"""
Nova Sonic Live Client — AWS equivalent of GeminiLiveClient.

Uses InvokeModelWithBidirectionalStream (HTTP/2) to stream audio to
Amazon Nova Sonic and receive function calls back, exactly like
Gemini Live API.

Same interface as GeminiLiveClient so the ramble router can swap
between the two with a config flag.

Set in .env:
  VOICE_PROVIDER=nova_sonic   # or gemini (default)
  AWS_ACCESS_KEY_ID=...
  AWS_SECRET_ACCESS_KEY=...
  AWS_REGION=ap-south-1
  NOVA_SONIC_MODEL=amazon.nova-sonic-v1:0
"""

import json
import uuid
import asyncio
import base64
from typing import Optional, Callable, Awaitable

from aws_sdk_bedrock_runtime.client import (
    BedrockRuntimeClient,
    InvokeModelWithBidirectionalStreamOperationInput,
)
from aws_sdk_bedrock_runtime.models import (
    InvokeModelWithBidirectionalStreamInputChunk,
    BidirectionalInputPayloadPart,
)
from aws_sdk_bedrock_runtime.config import Config
from smithy_aws_core.identity.environment import EnvironmentCredentialsResolver
from smithy_aws_core.identity.static import StaticCredentialsResolver

from app.core.config import settings


class NovaSonicQuotaError(Exception):
    """Raised when Nova Sonic returns throttling / quota error."""
    pass


# ── Tool definitions (same as Gemini RAMBLE_TOOLS) ───────────────────────────

def _make_tool_config() -> list[dict]:
    """Build Nova Sonic tool definitions for the ramble canvas."""
    return [
        {
            "toolSpec": {
                "name": "search_products",
                "description": (
                    "Search for products in the Amazon Now grocery catalog. "
                    "Use when the user mentions a product they want to add."
                ),
                "inputSchema": {
                    "json": json.dumps({
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query. Include brand, product type, details."
                            },
                            "category": {
                                "type": "string",
                                "description": (
                                    "Optional category filter: dairy, bakery, grocery, snacks, "
                                    "beverages, fruits-vegetables, household, personal-care, pharmacy"
                                )
                            }
                        },
                        "required": ["query"]
                    })
                }
            }
        },
        {
            "toolSpec": {
                "name": "add_to_canvas",
                "description": "Add a product to the shopping canvas. Call search_products first to get the product_id.",
                "inputSchema": {
                    "json": json.dumps({
                        "type": "object",
                        "properties": {
                            "product_id": {"type": "string", "description": "Product ID from search_products result"},
                            "quantity": {"type": "integer", "description": "Quantity to add (default 1)"}
                        },
                        "required": ["product_id"]
                    })
                }
            }
        },
        {
            "toolSpec": {
                "name": "update_canvas_item",
                "description": "Update quantity or replace an existing canvas item.",
                "inputSchema": {
                    "json": json.dumps({
                        "type": "object",
                        "properties": {
                            "canvas_index": {"type": "integer", "description": "0-based index of item"},
                            "product_id": {"type": "string", "description": "New product ID (if replacing)"},
                            "quantity": {"type": "integer", "description": "New quantity"}
                        },
                        "required": ["canvas_index"]
                    })
                }
            }
        },
        {
            "toolSpec": {
                "name": "remove_from_canvas",
                "description": "Remove an item from the canvas by index.",
                "inputSchema": {
                    "json": json.dumps({
                        "type": "object",
                        "properties": {
                            "canvas_index": {"type": "integer", "description": "0-based index of item to remove"}
                        },
                        "required": ["canvas_index"]
                    })
                }
            }
        },
        {
            "toolSpec": {
                "name": "get_canvas",
                "description": "Get the current canvas contents. Call only when user asks what's in their cart.",
                "inputSchema": {
                    "json": json.dumps({"type": "object", "properties": {}})
                }
            }
        },
        {
            "toolSpec": {
                "name": "notify_user",
                "description": (
                    "Send a notification to the user — e.g. product not found, "
                    "search result doesn't match intent, or confirmation."
                ),
                "inputSchema": {
                    "json": json.dumps({
                        "type": "object",
                        "properties": {
                            "message": {"type": "string", "description": "Short message (max 60 chars)"},
                            "kind": {"type": "string", "description": "One of: success, warning, error, info"}
                        },
                        "required": ["message"]
                    })
                }
            }
        },
    ]


SYSTEM_PROMPT = """You are a silent voice shopping assistant for Amazon Now grocery delivery app.
Listen to the user and manage their shopping canvas using ONLY tool calls. No spoken responses.

WORKFLOW:
1. User mentions a product → call search_products
2. Verify the top result matches what they asked for:
   - Matches well → call add_to_canvas
   - Doesn't match → call notify_user with a warning
   - No results → call notify_user("Couldn't find X in our catalog", "warning")
3. Update quantity/replace → call update_canvas_item
4. Remove item → call remove_from_canvas
5. "What's in my cart" → call get_canvas
6. "Done" / "checkout" → do nothing

NEVER speak or generate audio responses. ONLY make tool calls."""


class NovaSonicClient:
    """
    Bidirectional streaming client for Amazon Nova Sonic.
    Same interface as GeminiLiveClient so the ramble router can swap between them.
    """

    def __init__(
        self,
        region: Optional[str] = None,
        model_id: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
    ):
        self.region = region or settings.AWS_REGION
        self.model_id = model_id or settings.NOVA_SONIC_MODEL
        self.access_key = access_key or settings.AWS_ACCESS_KEY_ID
        self.secret_key = secret_key or settings.AWS_SECRET_ACCESS_KEY

        self._client: Optional[BedrockRuntimeClient] = None
        self._stream = None
        self._is_active = False

        # Session identifiers
        self._prompt_name = str(uuid.uuid4())
        self._audio_content_name = str(uuid.uuid4())

        # Tool call state
        self._pending_tool_name: Optional[str] = None
        self._pending_tool_id: Optional[str] = None
        self._pending_tool_content: str = ""

        # Output queue — receives parsed events for the ramble receive loop
        self._output_queue: asyncio.Queue = asyncio.Queue()

        self._response_task: Optional[asyncio.Task] = None
        self._audio_input_queue: asyncio.Queue = asyncio.Queue()
        self._audio_send_task: Optional[asyncio.Task] = None

    # ── Connection ──────────────────────────────────────────────────────────

    def _make_client(self) -> BedrockRuntimeClient:
        if self.access_key and self.secret_key:
            resolver = StaticCredentialsResolver(
                access_key_id=self.access_key,
                secret_access_key=self.secret_key,
            )
        else:
            resolver = EnvironmentCredentialsResolver()

        config = Config(
            endpoint_uri=f"https://bedrock-runtime.{self.region}.amazonaws.com",
            region=self.region,
            aws_credentials_identity_resolver=resolver,
        )
        return BedrockRuntimeClient(config=config)

    async def connect(self) -> bool:
        """Open the bidirectional stream and send setup events. Returns True on success."""
        print(f"[NovaSonic] Connecting — model={self.model_id} region={self.region}")
        try:
            self._client = self._make_client()
            self._stream = await self._client.invoke_model_with_bidirectional_stream(
                InvokeModelWithBidirectionalStreamOperationInput(model_id=self.model_id)
            )
            self._is_active = True
            print("[NovaSonic] Stream opened")
        except Exception as e:
            msg = str(e)
            if "throttl" in msg.lower() or "quota" in msg.lower() or "limit" in msg.lower():
                raise NovaSonicQuotaError(f"Nova Sonic rate limited: {msg}")
            print(f"[NovaSonic] Connection failed: {e}")
            return False

        # Send setup sequence
        await self._send_raw(self._session_start_event())
        await asyncio.sleep(0.05)
        await self._send_raw(self._prompt_start_event())
        await asyncio.sleep(0.05)
        await self._send_raw(self._system_prompt_event())
        await asyncio.sleep(0.05)
        await self._send_raw(self._system_prompt_end_event())
        await asyncio.sleep(0.05)
        # Open the audio content block
        await self._send_raw(self._audio_content_start_event())
        await asyncio.sleep(0.05)

        # Start background tasks
        self._response_task = asyncio.create_task(self._receive_loop())
        self._audio_send_task = asyncio.create_task(self._audio_send_loop())

        print("[NovaSonic] ✓ Setup complete")
        return True

    # ── Audio ───────────────────────────────────────────────────────────────

    async def send_audio(self, audio_b64: str):
        """Queue a base64-encoded PCM16 audio chunk."""
        if not self._is_active:
            return
        await self._audio_input_queue.put(audio_b64)

    async def send_audio_end(self):
        """Signal end of user turn (VAD end)."""
        if not self._is_active:
            return
        print("[NovaSonic] → audio_end (contentEnd)")
        await self._send_raw(self._content_end_event(self._prompt_name, self._audio_content_name))

    async def _audio_send_loop(self):
        """Drain the audio queue and send chunks to Nova Sonic."""
        while self._is_active:
            try:
                b64 = await asyncio.wait_for(self._audio_input_queue.get(), timeout=1.0)
                event = json.dumps({
                    "event": {
                        "audioInput": {
                            "promptName": self._prompt_name,
                            "contentName": self._audio_content_name,
                            "content": b64,
                        }
                    }
                })
                await self._send_raw(event)
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                if self._is_active:
                    print(f"[NovaSonic] Audio send error: {e}")

    # ── Receive ─────────────────────────────────────────────────────────────

    async def _receive_loop(self):
        """Read events from Nova Sonic and put parsed data on _output_queue."""
        try:
            while self._is_active:
                try:
                    output = await self._stream.await_output()
                    result = await output[1].receive()
                    if result.value and result.value.bytes_:
                        raw = result.value.bytes_.decode("utf-8")
                        data = json.loads(raw)
                        await self._output_queue.put(data)
                except StopAsyncIteration:
                    break
                except Exception as e:
                    msg = str(e)
                    if "throttl" in msg.lower() or "quota" in msg.lower():
                        await self._output_queue.put({"_error": "quota", "message": msg})
                    else:
                        print(f"[NovaSonic] Receive error: {e}")
                    break
        finally:
            self._is_active = False
            await self._output_queue.put(None)  # Sentinel

    async def receive(self) -> Optional[dict]:
        """
        Get next event from Nova Sonic.
        Returns None on timeout/stream end.
        Raises NovaSonicQuotaError on quota errors.
        Compatible with GeminiLiveClient.receive().
        """
        try:
            data = await asyncio.wait_for(self._output_queue.get(), timeout=30)
            if data is None:
                return None
            if isinstance(data, dict) and data.get("_error") == "quota":
                raise NovaSonicQuotaError(data.get("message", "Nova Sonic quota exceeded"))

            # Log relevant events
            event = data.get("event", {})
            if "toolUse" in event:
                print(f"[NovaSonic] ← toolUse: {event['toolUse'].get('toolName')}")
            elif "contentEnd" in event:
                ctype = event["contentEnd"].get("type", "")
                if ctype == "TOOL":
                    print(f"[NovaSonic] ← contentEnd TOOL")
            elif "completionEnd" in event:
                print(f"[NovaSonic] ← completionEnd")
            elif "textOutput" in event:
                role = event["textOutput"].get("role", "")
                txt = event["textOutput"].get("content", "")[:60]
                print(f"[NovaSonic] ← text [{role}]: {txt}")

            return data
        except asyncio.TimeoutError:
            print("[NovaSonic] ← timeout (30s)")
            return None

    # ── Function call parsing (GeminiLiveClient compatible) ─────────────────

    def parse_function_call(self, data: dict) -> Optional[tuple[str, dict]]:
        """
        Extract a function call from a Nova Sonic event.
        Nova Sonic sends toolUse content across multiple events:
          - contentStart (type=TOOL) or toolUse event → stores name/id
          - contentEnd (type=TOOL)  → trigger to send tool result

        Returns (fn_name, fn_args) when a complete tool call is ready.
        Compatible with GeminiLiveClient.parse_function_call().
        """
        event = data.get("event", {})

        # Nova Sonic sends toolUse as a single event with name + content
        if "toolUse" in event:
            tu = event["toolUse"]
            self._pending_tool_name = tu.get("toolName", "")
            self._pending_tool_id = tu.get("toolUseId", "")
            raw_content = tu.get("content", "{}")
            try:
                self._pending_tool_content = json.loads(raw_content) if isinstance(raw_content, str) else raw_content
            except json.JSONDecodeError:
                self._pending_tool_content = {}
            return None  # Wait for contentEnd TOOL to fire

        # contentEnd with type=TOOL means "now send the result"
        if "contentEnd" in event and event["contentEnd"].get("type") == "TOOL":
            if self._pending_tool_name:
                name = self._pending_tool_name
                args = self._pending_tool_content if isinstance(self._pending_tool_content, dict) else {}
                self._pending_tool_name = None
                self._pending_tool_content = {}
                return (name, args)

        return None

    def is_turn_complete(self, data: dict) -> bool:
        """Check if Nova Sonic finished its turn. Compatible with GeminiLiveClient."""
        event = data.get("event", {})
        return "completionEnd" in event

    async def send_function_result(self, name: str, result: dict, call_id: str = ""):
        """
        Send tool result back to Nova Sonic.
        Compatible with GeminiLiveClient.send_function_result().
        """
        if not self._is_active:
            return

        tool_use_id = call_id or self._pending_tool_id or str(uuid.uuid4())
        content_name = str(uuid.uuid4())
        result_str = json.dumps(result)

        print(f"[NovaSonic] → toolResult for {name} ({tool_use_id[:8]}...)")

        # Tool content start
        await self._send_raw(json.dumps({
            "event": {
                "contentStart": {
                    "promptName": self._prompt_name,
                    "contentName": content_name,
                    "interactive": False,
                    "type": "TOOL",
                    "role": "TOOL",
                    "toolResultInputConfiguration": {
                        "toolUseId": tool_use_id,
                        "type": "TEXT",
                        "textInputConfiguration": {"mediaType": "text/plain"}
                    }
                }
            }
        }))

        # Tool result
        await self._send_raw(json.dumps({
            "event": {
                "toolResult": {
                    "promptName": self._prompt_name,
                    "contentName": content_name,
                    "content": result_str,
                }
            }
        }))

        # Tool content end
        await self._send_raw(self._content_end_event(self._prompt_name, content_name))

    # ── Close ────────────────────────────────────────────────────────────────

    async def close(self):
        """Close the stream gracefully."""
        if not self._is_active:
            return
        self._is_active = False
        print("[NovaSonic] Closing stream")

        # Cancel background tasks
        for task in [self._response_task, self._audio_send_task]:
            if task and not task.done():
                task.cancel()

        try:
            await self._send_raw(self._content_end_event(self._prompt_name, self._audio_content_name))
            await self._send_raw(json.dumps({"event": {"promptEnd": {"promptName": self._prompt_name}}}))
            await self._send_raw(json.dumps({"event": {"sessionEnd": {}}}))
            if self._stream:
                await self._stream.input_stream.close()
        except Exception as e:
            print(f"[NovaSonic] Close error (ok): {e}")

    # ── Event builders ───────────────────────────────────────────────────────

    def _session_start_event(self) -> str:
        return json.dumps({
            "event": {
                "sessionStart": {
                    "inferenceConfiguration": {
                        "maxTokens": 1024,
                        "topP": 0.9,
                        "temperature": 0.3,
                    }
                }
            }
        })

    def _prompt_start_event(self) -> str:
        return json.dumps({
            "event": {
                "promptStart": {
                    "promptName": self._prompt_name,
                    # No audioOutputConfiguration → no audio response
                    "textOutputConfiguration": {"mediaType": "text/plain"},
                    "toolUseOutputConfiguration": {"mediaType": "application/json"},
                    "toolConfiguration": {"tools": _make_tool_config()},
                }
            }
        })

    def _system_prompt_event(self) -> str:
        content_name = str(uuid.uuid4())
        self._system_content_name = content_name
        return json.dumps({
            "event": {
                "contentStart": {
                    "promptName": self._prompt_name,
                    "contentName": content_name,
                    "type": "TEXT",
                    "role": "SYSTEM",
                    "interactive": False,
                    "textInputConfiguration": {"mediaType": "text/plain"}
                }
            }
        }) + "\n" + json.dumps({
            "event": {
                "textInput": {
                    "promptName": self._prompt_name,
                    "contentName": content_name,
                    "content": SYSTEM_PROMPT,
                }
            }
        })

    def _system_prompt_end_event(self) -> str:
        return self._content_end_event(self._prompt_name, self._system_content_name)

    def _audio_content_start_event(self) -> str:
        return json.dumps({
            "event": {
                "contentStart": {
                    "promptName": self._prompt_name,
                    "contentName": self._audio_content_name,
                    "type": "AUDIO",
                    "interactive": True,
                    "role": "USER",
                    "audioInputConfiguration": {
                        "mediaType": "audio/lpcm",
                        "sampleRateHertz": 16000,
                        "sampleSizeBits": 16,
                        "channelCount": 1,
                        "audioType": "SPEECH",
                        "encoding": "base64",
                    }
                }
            }
        })

    def _content_end_event(self, prompt_name: str, content_name: str) -> str:
        return json.dumps({
            "event": {
                "contentEnd": {
                    "promptName": prompt_name,
                    "contentName": content_name,
                }
            }
        })

    async def _send_raw(self, event_json: str):
        """Send a raw JSON event over the HTTP/2 stream."""
        if not self._stream:
            return
        try:
            chunk = InvokeModelWithBidirectionalStreamInputChunk(
                value=BidirectionalInputPayloadPart(bytes_=event_json.encode("utf-8"))
            )
            await self._stream.input_stream.send(chunk)
        except Exception as e:
            if self._is_active:
                print(f"[NovaSonic] Send error: {e}")
