"""
Gemini Live API WebSocket proxy.

Handles bidirectional audio streaming with Gemini 2.5 Flash Live.
Gemini calls functions (tool calls) instead of generating text/audio responses.
The UI updates based on function call results.
"""

import json
import asyncio
import websockets
from typing import Any, Callable, Awaitable, Optional

from app.core.config import settings

GEMINI_WS_URL = (
    "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha"
    ".GenerativeService.BidiGenerateContent"
)

# Tool definitions for Gemini
RAMBLE_TOOLS = [
    {
        "function_declarations": [
            {
                "name": "search_products",
                "description": (
                    "Search for products in the Amazon Now grocery catalog. "
                    "Use this when the user mentions a product, brand, or item "
                    "they want to add to their cart."
                ),
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "query": {
                            "type": "STRING",
                            "description": (
                                "Search query based on what the user said. "
                                "Include brand name, product type, and any details. "
                                "Examples: 'blue lays', 'amul milk', 'bread', 'chocos 1kg'"
                            ),
                        },
                        "category": {
                            "type": "STRING",
                            "description": (
                                "Optional category filter. One of: dairy, bakery, grocery, "
                                "snacks, beverages, fruits-vegetables, household, "
                                "personal-care, pharmacy"
                            ),
                        },
                    },
                    "required": ["query"],
                },
            },
            {
                "name": "add_to_canvas",
                "description": (
                    "Add a product to the shopping canvas (live cart). "
                    "Call search_products first to get the product_id."
                ),
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "product_id": {
                            "type": "STRING",
                            "description": "Product ID from search_products result",
                        },
                        "quantity": {
                            "type": "INTEGER",
                            "description": "Quantity to add (default 1)",
                        },
                    },
                    "required": ["product_id"],
                },
            },
            {
                "name": "update_canvas_item",
                "description": (
                    "Update an existing item on the canvas. Use this to change "
                    "quantity or replace a product. Get canvas state first via get_canvas."
                ),
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "canvas_index": {
                            "type": "INTEGER",
                            "description": "Index of the item to update (0-based, from get_canvas)",
                        },
                        "product_id": {
                            "type": "STRING",
                            "description": "New product ID (if replacing the product entirely)",
                        },
                        "quantity": {
                            "type": "INTEGER",
                            "description": "New quantity",
                        },
                    },
                    "required": ["canvas_index"],
                },
            },
            {
                "name": "remove_from_canvas",
                "description": "Remove an item from the canvas by its index.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "canvas_index": {
                            "type": "INTEGER",
                            "description": "Index of item to remove (0-based, from get_canvas)",
                        },
                    },
                    "required": ["canvas_index"],
                },
            },
            {
                "name": "get_canvas",
                "description": (
                    "Get the current canvas contents, total price, and all item details. "
                    "Call this before update or remove to know current indices."
                ),
                "parameters": {
                    "type": "OBJECT",
                    "properties": {},
                },
            },
            {
                "name": "notify_user",
                "description": (
                    "Send a message to the user when you cannot find a product, "
                    "when the search result doesn't match what they asked for, "
                    "or when you need to inform them of something. "
                    "Use kind='warning' for not found, 'success' for confirmations, 'error' for failures."
                ),
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "message": {
                            "type": "STRING",
                            "description": "Short message to show the user (max 60 chars). E.g. \"Couldn't find 'xyz' in our catalog\"",
                        },
                        "kind": {
                            "type": "STRING",
                            "description": "One of: success, warning, error, info",
                        },
                    },
                    "required": ["message"],
                },
            },
        ]
    }
]

SYSTEM_INSTRUCTION = """You are a silent voice shopping assistant for Amazon Now grocery delivery app.
You listen to the user and manage their shopping canvas using ONLY function calls.

WORKFLOW for adding a product:
1. User mentions a product → call search_products
2. Look at the results carefully:
   - Check if the top result's name/brand actually matches what the user asked for
   - If it matches well (e.g. user said "maggi" and result is "Maggi Noodles") → call add_to_canvas
   - If it does NOT match (e.g. user said "laptop" but result is "mouse") → call notify_user with a warning
   - If no results returned → call notify_user to tell user the item wasn't found
3. After adding, DO NOT call notify_user — the UI shows a confirmation automatically

CROSS-VERIFICATION RULES:
- User says "lays chips" → result "Lays Classic Salted" ✓ → add it
- User says "amul milk" → result "Amul Fresh Toned Milk" ✓ → add it
- User says "car battery" → result "AA Battery Pack" — ask yourself: does this match intent? Yes → add it
- User says "laptop charger" → result "Lip Balm" ✗ → call notify_user("Couldn't find laptop charger in grocery catalog", "warning")
- User says "airplane ticket" → result "Air Freshener" ✗ → notify_user("We only stock grocery items", "warning")

OTHER RULES:
- Update quantity/replace → call update_canvas_item directly
- Remove item → call remove_from_canvas directly
- get_canvas ONLY when user asks "what's in my cart"
- If user says "done", "checkout", "that's all" → do nothing
- NEVER generate text or audio. ONLY function calls. Total silence.

You are a FUNCTION CALLER ONLY."""


class GeminiLiveClient:
    """
    Proxies audio between a browser WebSocket and Gemini Live API.
    Handles Gemini function calls by executing them and returning results.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        self._ws = None
        self._session_id = None

    async def connect(self):
        """Connect to Gemini Live API WebSocket."""
        url = f"{GEMINI_WS_URL}?key={self.api_key}"
        print(f"[Gemini] Connecting to {GEMINI_WS_URL}")
        print(f"[Gemini] Model: models/{self.model}")
        self._ws = await websockets.connect(
            url,
            max_size=2**22,
            ping_interval=20,
            ping_timeout=10,
        )
        print(f"[Gemini] WebSocket connected")

        setup_msg = {
            "setup": {
                "model": f"models/{self.model}",
                "generation_config": {
                    "response_modalities": ["AUDIO"],
                },
                "system_instruction": {
                    "parts": [{"text": SYSTEM_INSTRUCTION}]
                },
                "tools": RAMBLE_TOOLS,
            }
        }

        await self._ws.send(json.dumps(setup_msg))
        print(f"[Gemini] Setup sent, waiting for setupComplete...")

        resp = await self._ws.recv()
        data = json.loads(resp)
        print(f"[Gemini] Setup response: {list(data.keys())}")
        if "setupComplete" in data:
            print(f"[Gemini] ✓ Setup complete")
            return True
        print(f"[Gemini] ✗ Unexpected setup response: {data}")
        return False

    async def send_audio(self, audio_data: str):
        """Send base64 audio chunk to Gemini."""
        if not self._ws:
            print("[Gemini] ✗ send_audio called but no WebSocket")
            return

        msg = {
            "realtimeInput": {
                "audio": {
                    "data": audio_data,
                    "mimeType": "audio/pcm;rate=16000"
                }
            }
        }
        await self._ws.send(json.dumps(msg))

    async def send_audio_end(self):
        """Signal end of audio turn via turnComplete."""
        if not self._ws:
            return
        print("[Gemini] → send_audio_end (turnComplete)")
        # Just signal turn complete — no empty text parts (causes 1008)
        msg = {
            "clientContent": {
                "turnComplete": True,
            }
        }
        await self._ws.send(json.dumps(msg))

    async def receive(self) -> dict | None:
        if not self._ws:
            return None
        try:
            raw = await asyncio.wait_for(self._ws.recv(), timeout=30)
            data = json.loads(raw)
            # Log non-audio responses
            keys = list(data.keys())
            if "toolCall" in data:
                calls = data["toolCall"].get("functionCalls", [])
                print(f"[Gemini] ← toolCall: {[c.get('name') for c in calls]}")
            elif "serverContent" in data:
                sc = data["serverContent"]
                if sc.get("turnComplete"):
                    print(f"[Gemini] ← turnComplete")
                parts = sc.get("modelTurn", {}).get("parts", [])
                for p in parts:
                    if "text" in p:
                        print(f"[Gemini] ← text: {p['text'][:80]}")
                    elif "inlineData" in p:
                        print(f"[Gemini] ← audio chunk ({len(p['inlineData'].get('data',''))} bytes b64)")
            elif keys not in [["setupComplete"]]:
                print(f"[Gemini] ← {keys}")
            return data
        except asyncio.TimeoutError:
            print("[Gemini] ← timeout (30s)")
            return None
        except websockets.exceptions.ConnectionClosed as e:
            print(f"[Gemini] ← connection closed: {e}")
            return None

    def parse_function_call(self, data: dict) -> tuple[str, dict] | None:
        """
        Extract function call from Gemini response.
        Handles both serverContent.modelTurn and top-level toolCall formats.
        Returns (function_name, arguments) or None.
        """
        # Format 1: toolCall (audio modality Live API)
        if "toolCall" in data:
            calls = data["toolCall"].get("functionCalls", [])
            if calls:
                fc = calls[0]
                return fc.get("name", ""), fc.get("args", {})

        # Format 2: serverContent.modelTurn.parts (text modality)
        if "serverContent" in data:
            content = data["serverContent"]
            parts = content.get("modelTurn", {}).get("parts", [])
            for part in parts:
                if "functionCall" in part:
                    fc = part["functionCall"]
                    return fc.get("name", ""), fc.get("args", {})

        return None

    def is_turn_complete(self, data: dict) -> bool:
        """Check if Gemini finished its turn."""
        if "serverContent" in data:
            return data["serverContent"].get("turnComplete", False)
        return False

    async def send_function_result(self, name: str, result: dict, call_id: str = ""):
        """Send function execution result back to Gemini."""
        if not self._ws:
            return

        msg = {
            "toolResponse": {
                "functionResponses": [
                    {
                        "id": call_id,
                        "name": name,
                        "response": result,
                    }
                ]
            }
        }
        await self._ws.send(json.dumps(msg))

    async def close(self):
        """Close the WebSocket connection."""
        if self._ws:
            await self._ws.close()
            self._ws = None
