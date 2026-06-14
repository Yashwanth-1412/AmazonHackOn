"""
Embed product catalog into ChromaDB for vector search.

Run once after seeding DynamoDB:
  uv run python -m app.db.embed_catalog

Or with custom limit:
  uv run python -m app.db.embed_catalog --limit 500
"""

import json
import asyncio
from pathlib import Path

from app.core.embeddings.product_index import ProductIndex
from app.core.embeddings.client import EmbeddingClient
from app.db.helpers import table, _serialize


CATALOG_JSON = Path(__file__).parent / "catalog.json"


async def load_products_from_dynamodb() -> list[dict]:
    """Load all products from DynamoDB."""
    products_table = table("products")
    resp = products_table.scan(Limit=500)
    items = _serialize(resp.get("Items", []))

    products = []
    for item in items:
        if item.get("SK") != "METADATA":
            continue
        products.append({
            "id": item["id"],
            "name": item["name"],
            "brand": item.get("brand", ""),
            "variant": item.get("variant", ""),
            "category": item.get("category", ""),
            "price": float(item.get("price", 0)),
            "logo_url": item.get("logo_url", ""),
        })

    return products


def load_products_from_json() -> list[dict]:
    """Load products from catalog.json fallback."""
    if not CATALOG_JSON.exists():
        print(f"  Warning: {CATALOG_JSON} not found")
        return []

    with open(CATALOG_JSON) as f:
        data = json.load(f)

    return [
        {
            "id": p["id"],
            "name": p["name"],
            "brand": p.get("brand", ""),
            "variant": p.get("variant", ""),
            "category": p.get("category", ""),
            "price": float(p.get("price", 0)),
            "logo_url": p.get("logo_url", ""),
        }
        for p in data
    ]


async def main():
    import argparse

    parser = argparse.ArgumentParser(description="Embed product catalog into ChromaDB")
    parser.add_argument("--source", choices=["dynamodb", "json"], default="dynamodb",
                        help="Source of product data (default: dynamodb)")
    parser.add_argument("--reset", action="store_true",
                        help="Clear existing embeddings before re-seeding")
    parser.add_argument("--limit", type=int, default=50000,
                        help="Max products to embed")
    args = parser.parse_args()

    print("=== Embedding Product Catalog ===\n")

    # Load products
    print(f"  Loading products from {args.source}...")
    if args.source == "dynamodb":
        try:
            products = await load_products_from_dynamodb()
        except Exception as e:
            print(f"  DynamoDB failed ({e}), falling back to JSON...")
            products = load_products_from_json()
    else:
        products = load_products_from_json()

    if not products:
        print("  No products found. Run fetch_catalog.py first.")
        return

    print(f"  Found {len(products)} products")

    # Initialize embedding client
    print("\n  Initializing embedding client...")
    from app.core.config import settings
    print(f"  Provider: {settings.EMBEDDING_PROVIDER}")
    print(f"  Model: {settings.EMBEDDING_MODEL}")
    print(f"  Base URL: {settings.EMBEDDING_BASE_URL}")

    # Initialize product index
    index = ProductIndex()

    if args.reset:
        print("\n  Clearing existing embeddings...")
        index.reset()

    # Embed
    print(f"\n  Embedding {len(products)} products...")
    count = await index.embed_catalog(products[:args.limit])
    print(f"  Embedded {count} products")

    # Verify
    total = index.count()
    print(f"\n  Total embeddings in ChromaDB: {total}")

    # Quick test search
    print("\n  Test search: 'blue lays'")
    results = await index.search("blue lays", top_k=3)
    for r in results:
        print(f"    {r['score']:.3f} | {r['brand']} {r['name']} (₹{r['price']})")

    print("\n  Test search: 'amul milk'")
    results = await index.search("amul milk", top_k=3)
    for r in results:
        print(f"    {r['score']:.3f} | {r['brand']} {r['name']} (₹{r['price']})")

    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
