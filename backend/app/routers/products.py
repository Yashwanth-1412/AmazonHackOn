from fastapi import APIRouter, Query
from boto3.dynamodb.conditions import Key, Attr
from app.db.helpers import table, _serialize
from app.core.embeddings.product_index import product_index

import json as _json
from pathlib import Path as _Path

router = APIRouter(prefix="/api/products", tags=["products"])

VALID_CATEGORIES = {
    "dairy",
    "bakery",
    "grocery",
    "snacks",
    "beverages",
    "fruits-vegetables",
    "household",
    "personal-care",
    "pharmacy",
}

# ── In-memory catalog for fast search ─────────────────────────────────────────
_CATALOG_PATH = _Path(__file__).parent.parent / "db" / "catalog.json"
_catalog_cache: list[dict] = []


def _get_catalog() -> list[dict]:
    """Load full catalog into memory (cached after first load)."""
    if not _catalog_cache:
        try:
            data = _json.loads(_CATALOG_PATH.read_text(encoding="utf-8"))
            _catalog_cache.extend(data)
        except Exception as e:
            print(f"[Products] Failed to load catalog: {e}")
    return _catalog_cache


@router.get("")
async def get_products(
    category: str | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(default=40, le=100),
):
    """
    Product listing endpoint.
    - If `search` is provided, uses ChromaDB embedding search across all 24k products.
    - If only `category` is provided, filters from in-memory catalog.
    - Otherwise returns a page of products from catalog.
    """

    # ── Search mode: use embedding index for best results ─────────────────
    if search and search.strip():
        results = await product_index.search(search.strip(), top_k=limit)

        if results:
            # Enrich results with full product data from catalog
            catalog = _get_catalog()
            catalog_map = {p["id"]: p for p in catalog}
            products = []

            for r in results:
                full = catalog_map.get(r["id"])
                if full:
                    product = {**full}
                    product["score"] = r.get("score", 0)
                    products.append(product)
                else:
                    # Fallback to the metadata we got from ChromaDB
                    products.append(r)

            # Filter by category if both search + category provided
            if category and category in VALID_CATEGORIES:
                products = [p for p in products if p.get("category") == category]

            # Clean DynamoDB keys if present
            for p in products:
                p.pop("PK", None)
                p.pop("SK", None)

            return {"products": products, "total": len(products)}

        # If embedding search returned nothing, fall through to keyword search on catalog
        catalog = _get_catalog()
        q = search.strip().lower()
        q_words = set(q.split())

        scored = []
        for p in catalog:
            name = p.get("name", "").lower()
            brand = p.get("brand", "").lower()
            variant = p.get("variant", "").lower()
            tags = [t.lower() for t in p.get("tags", [])]
            common_names = p.get("common_names", [])
            if isinstance(common_names, str):
                common_names = [common_names]
            common_lower = [cn.lower() for cn in common_names]
            search_terms = p.get("search_terms", [])
            if isinstance(search_terms, str):
                search_terms = [search_terms]
            search_lower = [st.lower() for st in search_terms]

            score = 0
            # Exact substring in name
            if q in name:
                score += 10
            # Exact substring in brand
            if q in brand:
                score += 7
            # Word overlap with name
            name_words = set(name.split())
            overlap = q_words & name_words
            score += len(overlap) * 3
            # Brand word match
            brand_words = set(brand.split())
            score += len(q_words & brand_words) * 2
            # Tags match
            for tag in tags:
                if q in tag:
                    score += 3
                    break
            # Common names match
            for cn in common_lower:
                if q in cn:
                    score += 8
                    break
            # Search terms match
            for st in search_lower:
                if q in st:
                    score += 6
                    break
            # Variant match
            if q in variant:
                score += 2

            if score > 0:
                scored.append((score, p))

        scored.sort(key=lambda x: -x[0])
        products = [p for _, p in scored[:limit]]

        if category and category in VALID_CATEGORIES:
            products = [p for p in products if p.get("category") == category]

        for p in products:
            p.pop("PK", None)
            p.pop("SK", None)

        return {"products": products, "total": len(products)}

    # ── Category / browse mode: use in-memory catalog ─────────────────────
    catalog = _get_catalog()

    if category and category in VALID_CATEGORIES:
        products = [p for p in catalog if p.get("category") == category][:limit]
    else:
        products = catalog[:limit]

    for p in products:
        p.pop("PK", None)
        p.pop("SK", None)

    return {"products": products, "total": len(products)}


@router.get("/{product_id}")
async def get_product(product_id: str):
    t = table("products")
    resp = t.get_item(Key={"PK": f"PRODUCT#{product_id}", "SK": "METADATA"})
    item = resp.get("Item")
    if not item:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Product not found")
    item.pop("PK", None)
    item.pop("SK", None)
    return _serialize(item)
