"""Voice shopping router - WebSocket for real-time voice streaming."""

import json
import asyncio
import base64
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException, Depends
from boto3.dynamodb.conditions import Key, Attr

from app.db.helpers import table, _serialize
from app.core.aws import transcribe_client, bedrock_client
from app.schemas.voice import (
    VoiceIntentResponse,
    BrandChoiceRequest,
    BrandChoiceResponse,
    RecognizedProduct,
    VoiceTranscriptUpdate,
)

router = APIRouter(prefix="/api/voice", tags=["voice"])


async def get_user_data(user_id: str) -> dict:
    """Fetch user data including brand preferences and recent orders."""
    users_table = table("users")
    user_resp = users_table.get_item(Key={"PK": f"USER#{user_id}", "SK": "PROFILE"})
    user = user_resp.get("Item", {})
    user.pop("PK", None)
    user.pop("SK", None)

    # Get brand preferences from user profile or consumption_rates
    rates_table = table("consumption_rates")
    rates_resp = rates_table.query(KeyConditionExpression=Key("PK").eq(f"USER#{user_id}"))
    rates = rates_resp.get("Items", [])

    brand_preferences = {}
    for rate in rates:
        pid = rate.get("product_id", "")
        if pid:
            products_table = table("products")
            prod_resp = products_table.get_item(Key={"PK": f"PRODUCT#{pid}", "SK": "METADATA"})
            product = prod_resp.get("Item", {})
            if product:
                cat = product.get("category", "")
                brand = product.get("brand", "")
                if cat and brand:
                    # Count frequency per category
                    if cat not in brand_preferences:
                        brand_preferences[cat] = {"brand": brand, "count": 0}
                    brand_preferences[cat]["count"] += 1

    # Get most frequent brand per category
    final_prefs = {}
    for cat, data in brand_preferences.items():
        final_prefs[cat] = data["brand"]

    # Get recent orders
    orders_table = table("orders")
    orders_resp = orders_table.query(
        KeyConditionExpression=Key("PK").eq(f"USER#{user_id}"),
        ScanIndexForward=False,
        Limit=10,
    )
    orders = orders_resp.get("Items", [])
    for o in orders:
        o.pop("PK", None)
        o.pop("SK", None)

    return {
        "user": _serialize(user),
        "brand_preferences": final_prefs,
        "recent_orders": _serialize(orders),
    }


async def get_available_products() -> list[dict]:
    """Fetch available products for matching."""
    products_table = table("products")
    resp = products_table.scan(
        FilterExpression=Attr("SK").eq("METADATA") & Attr("in_stock").eq(True),
        Limit=200,
    )
    products = _serialize(resp.get("Items", []))
    for p in products:
        p.pop("PK", None)
        p.pop("SK", None)
    return products


def match_product_to_catalog(
    item: dict,
    products: list[dict],
) -> Optional[dict]:
    """Match parsed item to actual product in catalog."""
    item_name = item.get("product_name", "").lower()
    item_category = item.get("category", "")
    matched_id = item.get("matched_product_id")

    if matched_id:
        for p in products:
            if p["id"] == matched_id:
                return p

    # Fallback: fuzzy match by name and category
    for p in products:
        if item_category and p["category"] != item_category:
            continue
        if item_name in p["name"].lower() or p["name"].lower() in item_name:
            return p

    return None


@router.websocket("/stream")
async def voice_stream(
    websocket: WebSocket,
    user_id: str = Query(default="u001"),
):
    """WebSocket endpoint for real-time voice streaming."""
    await websocket.accept()

    try:
        # Fetch user data and product catalog
        user_data = await get_user_data(user_id)
        products = await get_available_products()

        brand_prefs = user_data["brand_preferences"]
        recent_orders = user_data["recent_orders"]

        # Start Transcribe stream
        transcribe_stream = await transcribe_client.start_stream()

        # Send ready status
        await websocket.send_json({
            "type": "status",
            "status": "ready",
            "message": "Voice session started. Speak now.",
        })

        # Track recognized products for this session
        session_products: list[RecognizedProduct] = []
        pending_brand_choices: dict[str, dict] = {}  # product_id -> {item, brand_options}

        async def process_transcribe_results():
            nonlocal session_products, pending_brand_choices
            async for result in transcribe_stream:
                # Send transcript update
                update = VoiceTranscriptUpdate(
                    type="final" if result.is_final else "interim",
                    transcript=result.transcript,
                    confidence=result.confidence,
                    recognized_products=session_products.copy(),
                )
                await websocket.send_json(update.model_dump())

                if result.is_final and result.transcript.strip():
                    # Parse intent with Bedrock
                    intent = await bedrock_client.parse_voice_intent(
                        transcript=result.transcript,
                        user_id=user_id,
                        available_products=products,
                        user_brand_preferences=brand_prefs,
                        recent_orders=recent_orders,
                    )

                    if intent.get("action") == "add_to_cart":
                        for item in intent.get("items", []):
                            matched_product = match_product_to_catalog(item, products)
                            if not matched_product:
                                continue

                            brand_options = item.get("brand_options", [])
                            recommended_brand = item.get("brand_recommendation")

                            # Check if brand confirmation needed
                            needs_confirmation = len(brand_options) > 1 and recommended_brand != brand_options[0].get("brand")

                            recognized = RecognizedProduct(
                                product_id=matched_product["id"],
                                name=matched_product["name"],
                                brand=recommended_brand or matched_product["brand"],
                                variant=matched_product["variant"],
                                category=matched_product.get("category", "grocery"),
                                price=matched_product["price"],
                                quantity=item.get("quantity", 1),
                                image=matched_product.get("logo_url", ""),
                                confidence=item.get("confidence", 0.9),
                                brand_options=brand_options,
                                needs_brand_confirmation=needs_confirmation,
                            )

                            if needs_confirmation:
                                pending_brand_choices[matched_product["id"]] = {
                                    "item": recognized,
                                    "brand_options": brand_options,
                                    "original_transcript": result.transcript,
                                }
                                # Send brand confirmation request
                                await websocket.send_json({
                                    "type": "brand_confirmation",
                                    "product_id": matched_product["id"],
                                    "product_name": matched_product["name"],
                                    "recommended_brand": recommended_brand,
                                    "brand_options": [b["brand"] for b in brand_options],
                                    "transcript": result.transcript,
                                })
                            else:
                                session_products.append(recognized)
                                # Auto-add to cart via REST call (frontend will handle)
                                await websocket.send_json({
                                    "type": "product_recognized",
                                    "product": recognized.model_dump(),
                                    "auto_added": True,
                                })

        # Run transcribe processing in background
        transcribe_task = asyncio.create_task(process_transcribe_results())

        # Handle incoming messages from frontend
        while True:
            try:
                data = await websocket.receive_json()

                if data.get("type") == "audio":
                    # Forward audio to Transcribe
                    audio_b64 = data.get("audio", "")
                    if audio_b64:
                        audio_bytes = base64.b64decode(audio_b64)
                        await transcribe_stream.send_audio(audio_bytes)

                elif data.get("type") == "brand_choice":
                    # User selected a brand
                    product_id = data.get("product_id")
                    selected_brand = data.get("brand")
                    if product_id in pending_brand_choices:
                        pending = pending_brand_choices.pop(product_id)
                        recognized = pending["item"]
                        recognized.brand = selected_brand
                        recognized.needs_brand_confirmation = False
                        session_products.append(recognized)
                        await websocket.send_json({
                            "type": "product_recognized",
                            "product": recognized.model_dump(),
                            "auto_added": True,
                        })

                elif data.get("type") == "stop":
                    break

            except WebSocketDisconnect:
                break
            except Exception as e:
                await websocket.send_json({"type": "error", "message": str(e)})

        transcribe_task.cancel()
        await transcribe_stream.close()

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
    finally:
        await websocket.close()


@router.post("/brand-choice", response_model=BrandChoiceResponse)
async def brand_choice(request: BrandChoiceRequest):
    """Handle brand selection for ambiguous products."""
    # This REST endpoint is alternative to WebSocket brand_choice
    # For now, just return success - actual cart update happens on frontend
    return BrandChoiceResponse(
        success=True,
        product_id=request.product_id,
        brand=request.selected_brand,
        message=f"Brand updated to {request.selected_brand}",
    )


@router.get("/products/search")
async def search_products_for_voice(
    q: str = Query(..., min_length=1),
    user_id: str = Query(default="u001"),
):
    """Search products optimized for voice queries."""
    products = await get_available_products()
    q_lower = q.lower()

    results = []
    for p in products:
        score = 0
        if q_lower in p["name"].lower():
            score += 10
        if q_lower in p["brand"].lower():
            score += 5
        if any(q_lower in tag.lower() for tag in p.get("tags", [])):
            score += 3
        if score > 0:
            results.append({**p, "_voice_score": score})

    results.sort(key=lambda x: -x["_voice_score"])
    for r in results:
        r.pop("_voice_score", None)

    return {"products": results[:10], "total": len(results)}

