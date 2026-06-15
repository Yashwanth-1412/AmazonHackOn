"""
Ramble router — WebSocket endpoint for voice + vision to canvas shopping.

Voice provider controlled by VOICE_PROVIDER env var:
  VOICE_PROVIDER=gemini      → Google Gemini Live API (default, supports audio + image)
  VOICE_PROVIDER=nova_sonic  → Amazon Nova Sonic (audio only, requires AWS credentials)
"""

import json
import asyncio
import base64
from typing import Optional, Union
from dataclasses import dataclass, field
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.core.config import settings
from app.core.gemini.live_client import GeminiLiveClient, GeminiQuotaError, GeminiSessionExpired
from app.core.aws.nova_sonic_client import NovaSonicClient, NovaSonicQuotaError
from app.core.embeddings.product_index import product_index
from app.db.helpers import table, _serialize

router = APIRouter(prefix="/api/ramble", tags=["ramble"])

# Unified type alias
VoiceClient = Union[GeminiLiveClient, NovaSonicClient]
VoiceQuotaError = (GeminiQuotaError, NovaSonicQuotaError)


def _make_voice_client() -> VoiceClient:
    """Factory: returns the correct voice client based on VOICE_PROVIDER setting."""
    provider = settings.VOICE_PROVIDER.lower()
    if provider == "nova_sonic":
        if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
            print("[Ramble] ⚠ VOICE_PROVIDER=nova_sonic but AWS credentials missing — falling back to Gemini")
            return GeminiLiveClient()
        print(f"[Ramble] Using Nova Sonic (region={settings.AWS_REGION})")
        return NovaSonicClient()
    print(f"[Ramble] Using Gemini Live (model={settings.GEMINI_MODEL})")
    return GeminiLiveClient()


# ── Canvas State ──────────────────────────────────────────────────────────────

@dataclass
class CanvasItem:
    index: int
    product_id: str
    name: str
    brand: str
    variant: str
    category: str
    price: float
    quantity: int
    image: str = ""

    def to_dict(self) -> dict:
        return {
            "index": self.index,
            "product_id": self.product_id,
            "name": self.name,
            "brand": self.brand,
            "variant": self.variant,
            "category": self.category,
            "price": self.price,
            "quantity": self.quantity,
            "image": self.image,
        }


@dataclass
class CanvasState:
    items: list[CanvasItem] = field(default_factory=list)

    def add(self, product: dict, quantity: int = 1) -> dict:
        """Add a product to canvas. Returns updated canvas state."""
        item = CanvasItem(
            index=len(self.items),
            product_id=product["id"],
            name=product["name"],
            brand=product.get("brand", ""),
            variant=product.get("variant", ""),
            category=product.get("category", ""),
            price=float(product.get("price", 0)),
            quantity=quantity,
            image=f"/api/products/{product['id']}/image",
        )
        self.items.append(item)
        # Re-index
        for i, item in enumerate(self.items):
            item.index = i
        return self.to_dict()

    def update(
        self,
        index: int,
        product_id: Optional[str] = None,
        quantity: Optional[int] = None,
        new_product: Optional[dict] = None,
    ) -> dict:
        """Update an existing canvas item."""
        if 0 <= index < len(self.items):
            item = self.items[index]
            if product_id and new_product:
                item.product_id = new_product["id"]
                item.name = new_product["name"]
                item.brand = new_product.get("brand", "")
                item.variant = new_product.get("variant", "")
                item.category = new_product.get("category", "")
                item.price = float(new_product.get("price", 0))
                item.image = new_product.get("logo_url", "")
            if quantity is not None:
                item.quantity = max(1, quantity)
        return self.to_dict()

    def remove(self, index: int) -> dict:
        """Remove an item by index."""
        if 0 <= index < len(self.items):
            self.items.pop(index)
            # Re-index
            for i, item in enumerate(self.items):
                item.index = i
        return self.to_dict()

    def clear(self):
        """Clear all items."""
        self.items.clear()

    def total(self) -> float:
        return sum(item.price * item.quantity for item in self.items)

    def to_dict(self) -> dict:
        return {
            "canvas": [item.to_dict() for item in self.items],
            "total": round(self.total(), 2),
            "item_count": len(self.items),
        }


# ── Product Catalog Helpers ───────────────────────────────────────────────────

import json as _json
from pathlib import Path as _Path

_CATALOG_PATH = _Path(__file__).parent.parent / "db" / "catalog.json"
_catalog_cache: dict = {}

def _get_catalog() -> dict:
    if not _catalog_cache:
        try:
            data = _json.loads(_CATALOG_PATH.read_text())
            _catalog_cache.update({p["id"]: p for p in data})
        except Exception as e:
            print(f"[Ramble] Failed to load catalog: {e}")
    return _catalog_cache

async def get_product_by_id(product_id: str) -> Optional[dict]:
    """Fetch a single product from catalog.json (fast, in-memory)."""
    catalog = _get_catalog()
    product = catalog.get(product_id)
    if product:
        return product
    # Fallback: try DynamoDB
    try:
        products_table = table("products")
        resp = products_table.get_item(
            Key={"PK": f"PRODUCT#{product_id}", "SK": "METADATA"}
        )
        item = resp.get("Item")
        if not item:
            return None
        item = _serialize(item)
        item.pop("PK", None)
        item.pop("SK", None)
        return item
    except Exception:
        return None


CONFIDENCE_THRESHOLD = 0.55  # below this score = not confident enough to add

async def search_products(query: str, category: Optional[str] = None) -> list[dict]:
    """Search products using embedding index. Only returns results above confidence threshold."""
    results = await product_index.search_from_catalog(query, top_k=5)

    # Filter by category if specified
    if category:
        results = [r for r in results if r.get("category") == category]

    # Filter by confidence threshold
    confident = [r for r in results if r.get("score", 0) >= CONFIDENCE_THRESHOLD]

    return confident


# ── WebSocket Endpoint ────────────────────────────────────────────────────────

@router.websocket("/stream")
async def ramble_stream(
    websocket: WebSocket,
    user_id: str = Query(default="u001"),
):
    """
    Ramble WebSocket endpoint.

    Client sends:
      {"type": "audio", "audio": "<base64>"}   — audio chunk
      {"type": "action", "action": "add_to_cart"|"discard"}  — canvas action
      {"type": "pause"}   — pause listening
      {"type": "resume"}  — resume listening
      {"type": "stop"}    — end session

    Server sends:
      {"type": "status", "status": "ready"|"listening"|"processing"}
      {"type": "canvas_update", ...}  — full canvas state after every mutation
      {"type": "product_found", ...}  — when search finds a product
      {"type": "error", "message": "..."}
    """
    await websocket.accept()

    canvas = CanvasState()
    gemini = _make_voice_client()
    is_paused = False

    try:
        # Connect to Gemini Live API
        await websocket.send_json({"type": "status", "status": "connecting"})

        try:
            connected = await gemini.connect()
        except VoiceQuotaError:
            print("[Ramble] Gemini quota exhausted — telling user")
            await websocket.send_json({
                "type": "toast",
                "kind": "error",
                "message": "Gemini is rate limited. Wait 1-2 min and try again.",
            })
            await websocket.close()
            return

        if not connected:
            await websocket.send_json({
                "type": "error",
                "message": "Failed to connect to Gemini. Check GEMINI_API_KEY.",
            })
            return

        await websocket.send_json({"type": "status", "status": "ready"})

        # Start Gemini receive loop
        gemini_task = asyncio.create_task(
            _gemini_receive_loop(gemini, canvas, websocket, user_id)
        )

        # Handle incoming messages from browser
        audio_chunks = 0
        while True:
            try:
                data = await websocket.receive_json()

                msg_type = data.get("type", "")

                if msg_type == "audio":
                    audio_b64 = data.get("audio", "")
                    if audio_b64 and not is_paused:
                        audio_chunks += 1
                        if audio_chunks == 1:
                            print(f"[Ramble] First audio chunk received ({len(audio_b64)} chars b64)")
                        elif audio_chunks % 50 == 0:
                            print(f"[Ramble] {audio_chunks} audio chunks sent to Gemini")
                        await gemini.send_audio(audio_b64)

                elif msg_type == "audio_end":
                    print(f"[Ramble] audio_end — total chunks: {audio_chunks}")
                    audio_chunks = 0
                    if not is_paused:
                        await gemini.send_audio_end()

                elif msg_type == "image":
                    # Vision scan — send photo to Gemini, same canvas pipeline
                    image_b64 = data.get("image", "")
                    mime    = data.get("mime", "image/jpeg")
                    if image_b64:
                        print(f"[Ramble] Image received ({len(image_b64)} chars b64, {mime})")
                        await websocket.send_json({"type": "status", "status": "scanning"})
                        await gemini.send_image(image_b64, mime)
                    else:
                        await websocket.send_json({"type": "error", "message": "Empty image data"})

                elif msg_type == "pause":
                    is_paused = True
                    await websocket.send_json({"type": "status", "status": "paused"})

                elif msg_type == "resume":
                    is_paused = False
                    await websocket.send_json({"type": "status", "status": "listening"})

                elif msg_type == "action":
                    action = data.get("action", "")
                    if action == "add_to_cart":
                        # Move canvas items to cart
                        await websocket.send_json({
                            "type": "cart_action",
                            "action": "add_to_cart",
                            "items": [item.to_dict() for item in canvas.items],
                            "total": canvas.total(),
                        })
                        canvas.clear()
                        await websocket.send_json({
                            "type": "canvas_update",
                            **canvas.to_dict(),
                        })
                    elif action == "discard":
                        canvas.clear()
                        await websocket.send_json({
                            "type": "canvas_update",
                            **canvas.to_dict(),
                        })
                    elif action == "remove_item":
                        index = data.get("canvas_index", 0)
                        canvas.remove(index)
                        # No need to send canvas_update — frontend already updated locally

                elif msg_type == "stop":
                    break

            except WebSocketDisconnect:
                break
            except Exception as e:
                await websocket.send_json({"type": "error", "message": str(e)})

        gemini_task.cancel()

    except VoiceQuotaError:
        print("[Ramble] Gemini quota exhausted mid-session")
        try:
            await websocket.send_json({
                "type": "toast",
                "kind": "error",
                "message": "Gemini is rate limited. Wait 1-2 min and try again.",
            })
        except Exception:
            pass
    except GeminiSessionExpired:
        # Should be handled in _gemini_receive_loop, but catch here as fallback
        print("[Ramble] Gemini session expired (fallback handler)")
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[Ramble] ERROR: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        await gemini.close()
        try:
            await websocket.close()
        except Exception:
            pass  # already closed


# ── Gemini Receive Loop ───────────────────────────────────────────────────────

async def _gemini_receive_loop(
    gemini: VoiceClient,
    canvas: CanvasState,
    websocket: WebSocket,
    user_id: str,
):
    """
    Continuously receive messages from voice client (Gemini or Nova Sonic).
    Handles function calls, session expiry, quota errors.
    """
    while True:
        try:
            data = await gemini.receive()
        except VoiceQuotaError:
            raise  # Propagate to main handler
        except GeminiSessionExpired:
            print("[Ramble] Gemini session expired (8 min) — reconnecting...")
            try:
                await websocket.send_json({"type": "toast", "kind": "info", "message": "Refreshing session..."})
            except Exception:
                pass
            # Reconnect with a fresh GeminiLiveClient, preserving canvas
            await gemini.close()
            new_gemini = _make_voice_client()
            try:
                connected = await new_gemini.connect()
                if connected:
                    # Swap out the old client in place
                    gemini.__dict__.update(new_gemini.__dict__)
                    print("[Ramble] Gemini reconnected — session resumed")
                    try:
                        await websocket.send_json({"type": "toast", "kind": "success", "message": "Session refreshed — keep speaking!"})
                    except Exception:
                        pass
                    continue
            except VoiceQuotaError:
                raise
            except Exception as e:
                print(f"[Ramble] Reconnect failed: {e}")
            return
        if data is None:
            continue

        # Nova Sonic: image not supported notification
        if data.get("_nova_image_unsupported"):
            await websocket.send_json({
                "type": "toast", "kind": "warning",
                "message": data.get("message", "Vision requires Gemini — set VOICE_PROVIDER=gemini")
            })
            continue

        # Check for function calls — handle ALL calls in one toolCall
        fn_call = gemini.parse_function_call(data)
        if fn_call:
            # Get ALL function calls from this message
            all_calls = []
            if "toolCall" in data:
                all_calls = data["toolCall"].get("functionCalls", [])
            else:
                # serverContent format — single call
                fn_name, fn_args = fn_call
                all_calls = [{"name": fn_name, "args": fn_args, "id": ""}]

            print(f"[Ramble] {len(all_calls)} function call(s): {[c.get('name') for c in all_calls]}")

            # Execute all calls and collect responses
            responses = []
            for call in all_calls:
                fn_name = call.get("name", "")
                fn_args = call.get("args", {})
                call_id = call.get("id", "")
                print(f"[Ramble] → {fn_name}({fn_args})")
                result = await _handle_function_call(fn_name, fn_args, canvas, user_id, websocket)
                print(f"[Ramble] ← {fn_name} result={result.get('status')} canvas={len(canvas.items)} items")
                responses.append({"id": call_id, "name": fn_name, "response": result})

            # Send all responses in one toolResponse
            await gemini._ws.send(json.dumps({
                "toolResponse": {
                    "functionResponses": responses
                }
            }))

            # Send canvas update to browser
            update = {"type": "canvas_update", **canvas.to_dict()}
            print(f"[Ramble] → canvas_update: {len(canvas.items)} items ₹{canvas.total()}")
            await websocket.send_json(update)

        # Check turn complete
        if gemini.is_turn_complete(data):
            pass  # Canvas already updated above


# ── Function Call Handler ─────────────────────────────────────────────────────

async def _handle_function_call(
    name: str,
    args: dict,
    canvas: CanvasState,
    user_id: str,
    websocket: WebSocket = None,
) -> dict:
    """Execute a Gemini function call and return the result."""

    async def notify(msg: str, kind: str = "info"):
        """Send a toast notification to the browser."""
        if websocket:
            try:
                await websocket.send_json({"type": "toast", "kind": kind, "message": msg})
            except Exception:
                pass

    if name == "search_products":
        query = args.get("query", "")
        category = args.get("category")
        results = await search_products(query, category)

        if not results:
            print(f"[Ramble] No confident results for '{query}' (threshold={CONFIDENCE_THRESHOLD})")
            await notify(f"Couldn't find \"{query}\" — try being more specific", "warning")
            return {
                "status": "not_found",
                "query": query,
                "results": [],
                "count": 0,
                "message": f"No products found for '{query}' above confidence threshold.",
            }

        best_score = results[0].get("score", 0)
        print(f"[Ramble] search '{query}' → {len(results)} results, best={best_score:.3f}")
        return {
            "status": "success",
            "query": query,
            "results": results,
            "count": len(results),
        }

    elif name == "add_to_canvas":
        product_id = args.get("product_id", "")
        quantity = args.get("quantity", 1)
        product = await get_product_by_id(product_id)
        if not product:
            await notify(f"Product not found in catalog", "error")
            return {"status": "error", "message": f"Product {product_id} not found"}
        canvas_state = canvas.add(product, quantity)
        brand = product.get("brand", "")
        name_str = product.get("name", "")
        label = f"{brand} {name_str}".strip()
        await notify(f"Added {label} ×{quantity}", "success")
        return {
            "status": "success",
            "action": "added",
            "product": label,
            **canvas_state,
        }

    elif name == "update_canvas_item":
        index = args.get("canvas_index", 0)
        product_id = args.get("product_id")
        quantity = args.get("quantity")

        new_product = None
        if product_id:
            new_product = await get_product_by_id(product_id)
            if not new_product:
                return {"status": "error", "message": f"Product {product_id} not found"}

        canvas_state = canvas.update(
            index=index,
            product_id=product_id,
            quantity=quantity,
            new_product=new_product,
        )
        return {
            "status": "success",
            "action": "updated",
            "canvas_index": index,
            **canvas_state,
        }

    elif name == "remove_from_canvas":
        index = args.get("canvas_index", 0)
        canvas_state = canvas.remove(index)
        return {
            "status": "success",
            "action": "removed",
            "canvas_index": index,
            **canvas_state,
        }

    elif name == "get_canvas":
        return {
            "status": "success",
            **canvas.to_dict(),
        }

    elif name == "notify_user":
        message = args.get("message", "")
        kind = args.get("kind", "info")
        print(f"[Ramble] notify_user [{kind}]: {message}")
        await notify(message, kind)
        return {"status": "success", "notified": True}

    else:
        return {"status": "error", "message": f"Unknown function: {name}"}
