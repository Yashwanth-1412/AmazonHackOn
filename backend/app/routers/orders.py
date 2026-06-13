from fastapi import APIRouter, Query
from boto3.dynamodb.conditions import Key
from app.db.helpers import table, _serialize

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("/{user_id}")
async def get_orders(
    user_id: str,
    limit: int = Query(default=20, le=50),
):
    t = table("orders")
    resp = t.query(
        KeyConditionExpression=Key("PK").eq(f"USER#{user_id}"),
        ScanIndexForward=False,   # newest first
        Limit=limit,
    )
    orders = resp.get("Items", [])
    for o in orders:
        o.pop("PK", None)
        o.pop("SK", None)

    return {"orders": _serialize(orders), "total": len(orders)}


@router.get("/{user_id}/routines")
async def get_routines(user_id: str):
    t = table("routines")
    resp = t.query(
        KeyConditionExpression=Key("PK").eq(f"USER#{user_id}"),
    )
    routines = resp.get("Items", [])

    # Enrich with product details
    products_table = table("products")
    enriched = []
    for routine in routines:
        products = []
        for pid in routine.get("product_ids", []):
            prod = products_table.get_item(
                Key={"PK": f"PRODUCT#{pid}", "SK": "METADATA"}
            ).get("Item", {})
            if prod:
                prod.pop("PK", None)
                prod.pop("SK", None)
                products.append(_serialize(prod))
        routine.pop("PK", None)
        routine.pop("SK", None)
        enriched.append({**_serialize(routine), "products": products})

    # Sort by confidence
    enriched.sort(key=lambda r: -r.get("confidence", 0))
    return {"routines": enriched}
