"""Bedrock client for voice intent parsing and brand recommendation."""

import json
import boto3
from typing import Any
from botocore.config import Config

from app.core.aws.config import aws_voice_settings


class BedrockClient:
    def __init__(self):
        self.client = boto3.client(
            "bedrock-runtime",
            region_name=aws_voice_settings.AWS_REGION,
            endpoint_url=aws_voice_settings.AWS_ENDPOINT_URL if aws_voice_settings.AWS_ENDPOINT_URL != "http://localhost:4566" else None,
            aws_access_key_id=aws_voice_settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=aws_voice_settings.AWS_SECRET_ACCESS_KEY,
            config=Config(retries={"max_attempts": 3}),
        )
        self.model_id = aws_voice_settings.BEDROCK_MODEL_ID
        self.max_tokens = aws_voice_settings.BEDROCK_MAX_TOKENS
        self.temperature = aws_voice_settings.BEDROCK_TEMPERATURE

    async def parse_voice_intent(
        self,
        transcript: str,
        user_id: str,
        available_products: list[dict],
        user_brand_preferences: dict[str, str],
        recent_orders: list[dict],
    ) -> dict[str, Any]:
        """
        Parse voice transcript into structured shopping intent.
        Returns items with brand recommendations.
        """
        if aws_voice_settings.USE_MOCK_BEDROCK:
            return await self._mock_parse_intent(transcript, available_products, user_brand_preferences, recent_orders)

        system_prompt = self._build_system_prompt(available_products, user_brand_preferences, recent_orders)
        user_prompt = f"Transcript: \"{transcript}\"\n\nExtract shopping intent as JSON."

        response = self.client.invoke_model(
            modelId=self.model_id,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}],
            }),
        )

        result = json.loads(response["body"].read())
        return json.loads(result["content"][0]["text"])

    def _build_system_prompt(
        self,
        available_products: list[dict],
        user_brand_preferences: dict[str, str],
        recent_orders: list[dict],
    ) -> str:
        product_list = "\n".join([
            f"- {p['name']} (brand: {p['brand']}, variant: {p['variant']}, category: {p['category']}, id: {p['id']})"
            for p in available_products[:50]
        ])

        brand_prefs = "\n".join([f"- {cat}: {brand}" for cat, brand in user_brand_preferences.items()]) or "None"

        recent_brands = {}
        for order in recent_orders[:10]:
            for item in order.get("items", []):
                cat = item.get("category", "unknown")
                brand = item.get("brand", "unknown")
                recent_brands[cat] = brand

        recent_brands_str = "\n".join([f"- {cat}: {brand}" for cat, brand in recent_brands.items()]) or "None"

        return f"""You are a shopping assistant for Amazon Now. Parse voice transcripts into structured shopping intent.

AVAILABLE PRODUCTS (sample):
{product_list}

USER'S PREFERRED BRANDS (from consumption history):
{brand_prefs}

USER'S RECENT BRANDS (from last orders):
{recent_brands_str}

RULES:
1. Extract items with: product_name, quantity, unit, category
2. For ambiguous products (e.g., "milk"), recommend the user's most used brand first, then last used, then popular
3. Return confidence score (0-1) for each item
4. If brand is ambiguous, include "brand_options" array with top 3 brands and confidence
5. Action is always "add_to_cart" for now

RETURN JSON ONLY:
{{
  "items": [
    {{
      "product_name": "milk",
      "quantity": 1,
      "unit": "liter",
      "category": "dairy",
      "matched_product_id": "prod_123",
      "confidence": 0.95,
      "brand_recommendation": "Amul",
      "brand_options": [
        {{"brand": "Amul", "confidence": 0.7, "reason": "most_used"}},
        {{"brand": "Mother Dairy", "confidence": 0.2, "reason": "last_used"}},
        {{"brand": "Nandini", "confidence": 0.1, "reason": "popular"}}
      ]
    }}
  ],
  "action": "add_to_cart"
}}"""

    async def _mock_parse_intent(
        self,
        transcript: str,
        available_products: list[dict],
        user_brand_preferences: dict[str, str],
        recent_orders: list[dict],
    ) -> dict[str, Any]:
        """Mock intent parsing for local development."""
        transcript_lower = transcript.lower()
        items = []

        # Simple keyword matching for demo
        product_keywords = {
            "milk": {"category": "dairy", "unit": "liter", "brands": ["Amul", "Mother Dairy", "Nandini"]},
            "banana": {"category": "fruits-vegetables", "unit": "pieces", "brands": ["FreshFarm", "Local"]},
            "bread": {"category": "bakery", "unit": "loaf", "brands": ["Britannia", "Modern", "Harvest Gold"]},
            "egg": {"category": "dairy", "unit": "pieces", "brands": ["Eggoz", "FreshFarm", "Local"]},
            "water": {"category": "beverages", "unit": "liter", "brands": ["Bisleri", "Kinley", "Aquafina"]},
        }

        for keyword, info in product_keywords.items():
            if keyword in transcript_lower:
                # Extract quantity (simple regex)
                import re
                qty_match = re.search(rf"(\d+)\s*{keyword}", transcript_lower)
                quantity = int(qty_match.group(1)) if qty_match else 1

                # Find matching product
                matched = None
                for p in available_products:
                    if keyword in p["name"].lower() and p["category"] == info["category"]:
                        matched = p
                        break

                if not matched:
                    continue

                # Determine brand recommendation
                cat = info["category"]
                preferred_brand = user_brand_preferences.get(cat)
                recent_brand = None
                for order in recent_orders[:5]:
                    for item in order.get("items", []):
                        if item.get("category") == cat:
                            recent_brand = item.get("brand")
                            break
                    if recent_brand:
                        break

                brand_options = []
                for i, brand in enumerate(info["brands"]):
                    reason = "popular"
                    conf = 0.3 - i * 0.1
                    if brand == preferred_brand:
                        reason = "most_used"
                        conf = 0.7
                    elif brand == recent_brand:
                        reason = "last_used"
                        conf = 0.5
                    brand_options.append({"brand": brand, "confidence": conf, "reason": reason})

                brand_options.sort(key=lambda x: -x["confidence"])
                recommended_brand = brand_options[0]["brand"] if brand_options else info["brands"][0]

                items.append({
                    "product_name": matched["name"],
                    "quantity": quantity,
                    "unit": info["unit"],
                    "category": info["category"],
                    "matched_product_id": matched["id"],
                    "confidence": 0.9,
                    "brand_recommendation": recommended_brand,
                    "brand_options": brand_options,
                })

        return {
            "items": items,
            "action": "add_to_cart" if items else "unknown",
        }


bedrock_client = BedrockClient()