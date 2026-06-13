from fastapi import APIRouter, Query
from boto3.dynamodb.conditions import Key, Attr
from app.db.helpers import table, _serialize

router = APIRouter(prefix="/api/products", tags=["products"])

VALID_CATEGORIES = {
    "dairy", "bakery", "grocery", "snacks", "beverages",
    "fruits-vegetables", "household", "personal-care", "pharmacy",
}


@router.get("")
async def get_products(
    category: str | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(default=40, le=100),
):
    t = table("products")

    if category and category in VALID_CATEGORIES:
        # Use GSI category-index
        resp = t.query(
            IndexName="category-index",
            KeyConditionExpression=Key("category").eq(category) & Key("SK").eq("METADATA"),
            Limit=limit,
        )
    else:
        resp = t.scan(
            FilterExpression=Attr("SK").eq("METADATA"),
            Limit=limit,
        )

    products = _serialize(resp.get("Items", []))

    # Client-side search filter
    if search:
        q = search.lower()
        products = [
            p for p in products
            if q in p.get("name", "").lower()
            or q in p.get("brand", "").lower()
            or any(q in tag for tag in p.get("tags", []))
        ]

    # Clean up DynamoDB keys before returning
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
