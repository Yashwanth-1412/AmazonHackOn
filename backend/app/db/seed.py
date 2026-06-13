"""
Random mock data generator — simulates realistic Indian household shopping behavior.
Run: uv run python -m app.db.seed

Reads real product IDs from the products table — never uses hardcoded IDs.
Orders, consumption rates, reminders and routines are all derived from data.
"""

import uuid
import random
import math
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from app.db.client import db

# ─── Helpers ──────────────────────────────────────────────────────────────────

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def days_ago(n: float) -> datetime:
    return now_utc() - timedelta(days=n)

def ts(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def d(val) -> Decimal:
    return Decimal(str(round(val, 2)))

def uid() -> str:
    return str(uuid.uuid4())[:8]


# ─── Load real products from DB ───────────────────────────────────────────────

def load_products() -> dict[str, list[dict]]:
    """Returns products grouped by category, with real IDs from DB."""
    table = db.Table("products")
    resp = table.scan()
    by_cat: dict[str, list[dict]] = {}
    for item in resp.get("Items", []):
        cat = item.get("category", "grocery")
        by_cat.setdefault(cat, []).append({
            "id":         item["id"],
            "name":       item["name"],
            "price":      float(item.get("price", 50)),
            "category":   cat,
            "cycle_days": int(item.get("cycle_days", 14)),
        })
    return by_cat


# ─── Indian name pools ─────────────────────────────────────────────────────────

FIRST_NAMES_M = ["Rahul","Arjun","Vikram","Suresh","Rajesh","Amit","Nikhil","Kiran","Ravi","Deepak","Sanjay","Manish","Aditya","Rohan","Kartik"]
FIRST_NAMES_F = ["Priya","Sunita","Anita","Kavya","Pooja","Divya","Meera","Sneha","Ritu","Lakshmi","Geeta","Anjali","Nisha","Asha","Rekha"]
LAST_NAMES    = ["Sharma","Verma","Patel","Singh","Reddy","Nair","Iyer","Gupta","Agarwal","Mehta","Joshi","Rao","Shah","Kumar","Mishra"]
CITIES        = [
    "Koramangala, Bengaluru", "Baner, Pune", "Dwarka, Delhi",
    "Madhapur, Hyderabad", "Andheri, Mumbai", "Salt Lake, Kolkata",
    "T Nagar, Chennai", "Vastrapur, Ahmedabad", "Civil Lines, Jaipur",
]

HOUSEHOLD_PROFILES = {
    "family":  ["dairy","bakery","grocery","fruits-vegetables","beverages","household","personal-care"],
    "student": ["grocery","snacks","beverages","dairy"],
    "couple":  ["dairy","bakery","grocery","fruits-vegetables","beverages"],
    "senior":  ["dairy","grocery","fruits-vegetables","pharmacy","household"],
}

PRODUCT_COUNT = {
    "family": (8, 14), "student": (4, 7), "couple": (6, 10), "senior": (5, 9)
}


# ─── Step 1: Users ────────────────────────────────────────────────────────────

def seed_users(n: int = 5) -> list[dict]:
    table = db.Table("users")
    users = []
    for i in range(n):
        uid_str   = f"u{str(i+1).zfill(3)}"
        gender    = random.choice(["M", "F"])
        name      = f"{random.choice(FIRST_NAMES_M if gender == 'M' else FIRST_NAMES_F)} {random.choice(LAST_NAMES)}"
        h_type    = random.choice(list(HOUSEHOLD_PROFILES.keys()))
        h_size    = {"family": random.randint(3,5), "student": 1, "couple": 2, "senior": random.randint(2,3)}[h_type]

        user = {
            "PK": f"USER#{uid_str}", "SK": "PROFILE",
            "id": uid_str, "name": name,
            "phone": f"9{random.randint(100000000,999999999)}",
            "location": random.choice(CITIES),
            "household_type": h_type,
            "household_size": h_size,
            "member_since": ts(days_ago(random.randint(60, 400))),
        }
        table.put_item(Item=user)
        users.append(user)
    print(f"  ✓ {len(users)} users")
    return users


# ─── Step 2: Build basket from real catalog ───────────────────────────────────

def _build_basket(household_type: str, catalog: dict[str, list[dict]]) -> list[tuple]:
    """Returns list of (product_dict, avg_cycle_days, avg_qty)."""
    categories = HOUSEHOLD_PROFILES[household_type]
    min_p, max_p = PRODUCT_COUNT[household_type]
    target = random.randint(min_p, max_p)

    pool = []
    for cat in categories:
        pool.extend(catalog.get(cat, []))

    random.shuffle(pool)
    basket = []
    for product in pool[:target]:
        cycle = max(2, round(product["cycle_days"] * random.uniform(0.8, 1.2)))
        qty   = random.randint(1, 2)
        basket.append((product, cycle, qty))

    return basket


# ─── Step 3: Orders ───────────────────────────────────────────────────────────

def seed_orders(users: list[dict], catalog: dict[str, list[dict]], history_days: int = 90) -> dict:
    order_table = db.Table("orders")
    baskets = {}
    total = 0

    order_hours = {
        "family":  [7, 8, 9, 17, 18, 19],
        "student": [10, 11, 21, 22, 23],
        "couple":  [8, 9, 18, 19, 20],
        "senior":  [8, 9, 10, 11],
    }

    for user in users:
        user_id = user["id"]
        h_type  = user["household_type"]
        basket  = _build_basket(h_type, catalog)
        baskets[user_id] = basket
        hours   = order_hours.get(h_type, [8, 9, 18, 19])

        for product, cycle_days, qty in basket:
            current_day = float(history_days)
            while current_day >= 0:
                jitter = random.gauss(0, cycle_days * 0.15)
                current_day -= max(1, cycle_days + jitter)
                if current_day < 0:
                    break

                order_id = uid()
                placed_at = days_ago(current_day).replace(
                    hour=random.choice(hours),
                    minute=random.randint(0, 59),
                    second=random.randint(0, 59),
                    microsecond=0,
                )
                actual_qty = qty if random.random() > 0.15 else qty + 1

                order_table.put_item(Item={
                    "PK": f"USER#{user_id}",
                    "SK": f"ORDER#{ts(placed_at)}#{order_id}",
                    "order_id": order_id,
                    "user_id": user_id,
                    "status": "delivered",
                    "placed_at": ts(placed_at),
                    "delivered_at": ts(placed_at + timedelta(minutes=random.randint(8, 20))),
                    "total": d(product["price"] * actual_qty),
                    "items": [{
                        "product_id": product["id"],
                        "name": product["name"],
                        "quantity": actual_qty,
                        "price": d(product["price"]),
                    }],
                })
                total += 1

    print(f"  ✓ {total} orders across {len(users)} users")
    return baskets


# ─── Step 4: Consumption Rates ────────────────────────────────────────────────

def seed_consumption_rates(users: list[dict], baskets: dict):
    orders_table = db.Table("orders")
    rates_table  = db.Table("consumption_rates")
    total = 0

    for user in users:
        user_id = user["id"]
        resp = orders_table.query(
            KeyConditionExpression="PK = :pk AND begins_with(SK, :prefix)",
            ExpressionAttributeValues={":pk": f"USER#{user_id}", ":prefix": "ORDER#"},
        )
        items = resp.get("Items", [])

        product_dates: dict[str, list[datetime]] = {}
        product_info:  dict[str, dict] = {}

        for item in items:
            for line in item.get("items", []):
                pid = line["product_id"]
                dt  = datetime.strptime(item["placed_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
                product_dates.setdefault(pid, []).append(dt)
                product_info[pid] = {"name": line["name"], "price": float(line["price"])}

        for pid, dates in product_dates.items():
            if len(dates) < 2:
                confidence = "low"
            elif len(dates) < 5:
                confidence = "medium"
            else:
                confidence = "high"

            dates.sort()
            gaps     = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
            avg_gap  = sum(gaps) / len(gaps) if gaps else 7

            if len(gaps) > 1:
                variance = sum((g - avg_gap)**2 for g in gaps) / len(gaps)
                std_dev  = math.sqrt(variance)
                regularity = max(0.0, 1.0 - (std_dev / avg_gap)) if avg_gap > 0 else 0.5
            else:
                regularity = 0.5

            last_ordered    = dates[-1]
            predicted_runout = last_ordered + timedelta(days=avg_gap)

            rates_table.put_item(Item={
                "PK": f"USER#{user_id}",
                "SK": f"ITEM#{pid}",
                "user_id":            user_id,
                "product_id":         pid,
                "product_name":       product_info[pid]["name"],
                "avg_gap_days":       d(avg_gap),
                "units_per_order":    d(1),
                "last_ordered_at":    ts(last_ordered),
                "predicted_runout_at": ts(predicted_runout),
                "confidence":         confidence,
                "sample_size":        len(dates),
                "regularity_score":   d(regularity),
            })
            total += 1

    print(f"  ✓ {total} consumption rates (calculated from orders)")


# ─── Step 5: Reminders ────────────────────────────────────────────────────────

def seed_reminders(users: list[dict]):
    rates_table     = db.Table("consumption_rates")
    reminders_table = db.Table("reminders")
    now = now_utc()
    total = 0

    for user in users:
        user_id = user["id"]
        resp = rates_table.query(
            KeyConditionExpression="PK = :pk AND begins_with(SK, :prefix)",
            ExpressionAttributeValues={":pk": f"USER#{user_id}", ":prefix": "ITEM#"},
        )

        for rate in resp.get("Items", []):
            runout_str = rate.get("predicted_runout_at", "")
            if not runout_str:
                continue

            runout_dt = datetime.strptime(runout_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
            days_left = (runout_dt - now).days

            if days_left > 4:
                continue

            if days_left <= 0:
                title, urgency, priority = f"{rate['product_name']} has run out",   "high",   1
            elif days_left == 1:
                title, urgency, priority = f"{rate['product_name']} runs out tomorrow", "high", 1
            elif days_left == 2:
                title, urgency, priority = f"{rate['product_name']} runs out in 2 days", "medium", 2
            else:
                title, urgency, priority = f"{rate['product_name']} running low",    "low",    3

            rid = uid()
            reminders_table.put_item(Item={
                "PK": f"USER#{user_id}",
                "SK": f"REMINDER#low_stock#{rid}",
                "id":          rid,
                "user_id":     user_id,
                "type":        "low_stock",
                "title":       title,
                "subtitle":    "Based on your usage pattern",
                "product_id":  rate["product_id"],
                "product_name": rate["product_name"],
                "days_left":   max(0, days_left),
                "cta_label":   "Order now",
                "priority":    priority,
                "show_from":   ts(now),
                "expires_at":  ts(runout_dt + timedelta(days=2)),
                "status":      "active",
                "urgency":     urgency,
                "confidence":  rate.get("confidence", "medium"),
                "verified_at": ts(now),
            })
            total += 1

    print(f"  ✓ {total} reminders (derived from consumption rates)")


# ─── Step 6: Routines ─────────────────────────────────────────────────────────

def seed_routines(users: list[dict]):
    orders_table   = db.Table("orders")
    routines_table = db.Table("routines")
    total = 0

    for user in users:
        user_id = user["id"]
        resp = orders_table.query(
            KeyConditionExpression="PK = :pk AND begins_with(SK, :prefix)",
            ExpressionAttributeValues={":pk": f"USER#{user_id}", ":prefix": "ORDER#"},
        )
        items = resp.get("Items", [])
        if not items:
            continue

        slot_counts:   dict[tuple, int]        = {}
        slot_products: dict[tuple, list[str]]  = {}

        for item in items:
            dt = datetime.strptime(item["placed_at"], "%Y-%m-%dT%H:%M:%SZ")
            day = dt.strftime("%A")
            hour_bucket = "morning" if dt.hour < 12 else "evening" if dt.hour < 18 else "night"
            slot = (day, hour_bucket)
            slot_counts[slot] = slot_counts.get(slot, 0) + 1
            for line in item.get("items", []):
                slot_products.setdefault(slot, []).append(line["product_id"])

        for slot, count in sorted(slot_counts.items(), key=lambda x: -x[1])[:3]:
            if count < 3:
                continue
            day, time_bucket = slot
            confidence = min(0.95, 0.5 + count * 0.04)

            freq: dict[str, int] = {}
            for pid in slot_products.get(slot, []):
                freq[pid] = freq.get(pid, 0) + 1
            top_products = [p for p, _ in sorted(freq.items(), key=lambda x: -x[1])[:4]]

            time_label = {"morning": "7–10 AM", "evening": "5–8 PM", "night": "9 PM–12"}[time_bucket]
            rid = uid()
            routines_table.put_item(Item={
                "PK": f"USER#{user_id}",
                "SK": f"ROUTINE#{rid}",
                "id":               rid,
                "user_id":          user_id,
                "label":            f"{day} {time_bucket}",
                "day_of_week":      day,
                "time_of_day":      time_label,
                "product_ids":      top_products,
                "total_price":      d(0),
                "confidence":       d(confidence),
                "order_count":      count,
                "last_triggered_at": ts(days_ago(random.randint(2, 10))),
            })
            total += 1

    print(f"  ✓ {total} routines (detected from order patterns)")


# ─── Clear user data ──────────────────────────────────────────────────────────

def clear_user_data():
    """Wipe users, orders, rates, reminders, routines. Keep products."""
    for tname in ["users", "orders", "consumption_rates", "reminders", "routines"]:
        t = db.Table(tname)
        items = t.scan(ProjectionExpression="PK, SK")["Items"]
        with t.batch_writer() as batch:
            for item in items:
                batch.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})
        print(f"  cleared {tname} ({len(items)} items)")


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--users", type=int, default=5)
    parser.add_argument("--days",  type=int, default=90)
    args = parser.parse_args()

    print("\nClearing old user data...")
    clear_user_data()

    print(f"\nLoading product catalog from DB...")
    catalog = load_products()
    total_products = sum(len(v) for v in catalog.values())
    print(f"  ✓ {total_products} products across {len(catalog)} categories")

    print(f"\nGenerating data ({args.users} users, {args.days} days history)...\n")
    users   = seed_users(n=args.users)
    baskets = seed_orders(users, catalog, history_days=args.days)
    seed_consumption_rates(users, baskets)
    seed_reminders(users)
    seed_routines(users)
    print("\n✓ Done.")
