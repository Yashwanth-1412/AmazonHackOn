from fastapi import APIRouter, HTTPException
from boto3.dynamodb.conditions import Key, Attr
from app.db.helpers import table, _serialize
from datetime import datetime, timezone

router = APIRouter(prefix="/api/home", tags=["home"])


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@router.get("/{user_id}")
async def get_home(user_id: str):
    """
    Single endpoint that returns everything the home screen needs:
      - user profile
      - active reminder cards (context aggregator output)
      - running low items (consumption engine output)
      - frequently bought categories
    """
    now = _now()

    # ── User ─────────────────────────────────────────────────────────────────
    users_table = table("users")
    user_resp = users_table.get_item(
        Key={"PK": f"USER#{user_id}", "SK": "PROFILE"}
    )
    user = user_resp.get("Item")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.pop("PK", None)
    user.pop("SK", None)

    # ── Active Reminders ─────────────────────────────────────────────────────
    reminders_table = table("reminders")
    rem_resp = reminders_table.query(
        KeyConditionExpression=Key("PK").eq(f"USER#{user_id}"),
        FilterExpression=Attr("status").eq("active") & Attr("show_from").lte(now),
    )
    reminders = sorted(
        rem_resp.get("Items", []),
        key=lambda r: (r.get("priority", 99), r.get("urgency", "low"))
    )
    for r in reminders:
        r.pop("PK", None)
        r.pop("SK", None)

    # ── Running Low (from consumption_rates) ─────────────────────────────────
    rates_table = table("consumption_rates")
    rates_resp = rates_table.query(
        KeyConditionExpression=Key("PK").eq(f"USER#{user_id}"),
    )
    rates = rates_resp.get("Items", [])

    # Enrich with product info + compute days_left
    products_table = table("products")
    running_low = []

    for rate in rates:
        runout_str = rate.get("predicted_runout_at", "")
        if not runout_str:
            continue

        runout_dt = datetime.strptime(runout_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        days_left = (runout_dt - datetime.now(timezone.utc)).days

        # Show items running out within 5 days
        if days_left > 5:
            continue

        pid = rate.get("product_id", "")
        prod_resp = products_table.get_item(
            Key={"PK": f"PRODUCT#{pid}", "SK": "METADATA"}
        )
        product = prod_resp.get("Item", {})
        product.pop("PK", None)
        product.pop("SK", None)

        running_low.append({
            "product":    _serialize(product),
            "days_left":  max(0, days_left),
            "confidence": rate.get("confidence", "medium"),
            "avg_gap_days": float(rate.get("avg_gap_days", 0)),
        })

    # Sort by urgency (fewest days first)
    running_low.sort(key=lambda x: x["days_left"])

    # ── Frequently Bought Categories ─────────────────────────────────────────
    orders_table = table("orders")
    orders_resp = orders_table.query(
        KeyConditionExpression=Key("PK").eq(f"USER#{user_id}"),
        ScanIndexForward=False,   # newest first
        Limit=30,
    )
    orders = orders_resp.get("Items", [])

    # Count product frequency across recent orders
    freq: dict[str, int] = {}
    for order in orders:
        for item in order.get("items", []):
            pid = item.get("product_id", "")
            freq[pid] = freq.get(pid, 0) + 1

    # Get top 8 products
    top_pids = sorted(freq, key=lambda p: -freq[p])[:8]
    freq_products = []
    for pid in top_pids:
        prod_resp = products_table.get_item(
            Key={"PK": f"PRODUCT#{pid}", "SK": "METADATA"}
        )
        product = prod_resp.get("Item", {})
        if product:
            product.pop("PK", None)
            product.pop("SK", None)
            freq_products.append(_serialize(product))

    return {
        "user":             _serialize(user),
        "reminders":        _serialize(reminders),
        "running_low":      running_low,
        "frequently_bought": freq_products,
    }
