"""
Random mock data generator — simulates realistic Indian household shopping behavior.
Run: uv run python -m app.db.seed

Nothing is hardcoded — users, orders, patterns are all randomly generated
based on probability distributions and household profiles.
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


# ─── Indian name pools ─────────────────────────────────────────────────────────

FIRST_NAMES_M = ["Rahul","Arjun","Vikram","Suresh","Rajesh","Amit","Nikhil","Kiran","Ravi","Deepak","Sanjay","Manish","Aditya","Rohan","Kartik"]
FIRST_NAMES_F = ["Priya","Sunita","Anita","Kavya","Pooja","Divya","Meera","Sneha","Ritu","Lakshmi","Geeta","Anjali","Nisha","Asha","Rekha"]
LAST_NAMES    = ["Sharma","Verma","Patel","Singh","Reddy","Nair","Iyer","Gupta","Agarwal","Mehta","Joshi","Rao","Shah","Kumar","Mishra"]
CITIES        = [
    "Koramangala, Bengaluru", "Baner, Pune", "Dwarka, Delhi",
    "Madhapur, Hyderabad", "Andheri, Mumbai", "Salt Lake, Kolkata",
    "T Nagar, Chennai", "Vastrapur, Ahmedabad", "Civil Lines, Jaipur",
]


# ─── Product catalog (generated, not hardcoded per user) ──────────────────────

CATALOG = [
    # (id, name, brand, variant, price, mrp, category, delivery_mins, tags, typical_cycle_days, typical_qty)
    ("p001","Amul Toned Milk","Amul","1L",32,32,"dairy",10,["daily","breakfast"],5,2),
    ("p002","Amul Full Cream Milk","Amul","1L",34,34,"dairy",10,["daily"],6,2),
    ("p003","Amul Dahi","Amul","400g",52,55,"dairy",10,["daily"],7,1),
    ("p004","Amul Butter","Amul","100g",57,60,"dairy",10,["breakfast"],20,1),
    ("p005","Britannia Cheese Slice","Britannia","10 slices",85,90,"dairy",10,["tiffin"],14,1),
    ("p006","Farm Fresh Eggs","Nandini","6 pack",62,65,"dairy",12,["protein"],8,1),
    ("p007","Britannia Bread","Britannia","400g",35,40,"bakery",10,["daily"],6,1),
    ("p008","Britannia Brown Bread","Britannia","400g",42,45,"bakery",10,["healthy"],7,1),
    ("p009","Tata Salt","Tata","1kg",26,28,"grocery",10,["staple"],45,1),
    ("p010","Fortune Sunflower Oil","Fortune","1L",145,155,"grocery",15,["cooking"],25,1),
    ("p011","Aashirvaad Atta","ITC","5kg",265,280,"grocery",20,["staple"],20,1),
    ("p012","India Gate Basmati Rice","KRBL","1kg",95,100,"grocery",20,["staple"],18,1),
    ("p013","Toor Dal","Patanjali","500g",75,80,"grocery",15,["staple"],20,1),
    ("p014","Maggi 2-Minute Noodles","Nestlé","70g x 4",58,60,"grocery",10,["quick","comfort"],8,2),
    ("p015","Lay's Classic Salted","Lay's","52g",20,20,"snacks",15,["party"],6,1),
    ("p016","Kurkure Masala Munch","Kurkure","90g",30,30,"snacks",15,["party"],8,1),
    ("p017","Haldiram's Aloo Bhujia","Haldiram's","200g",75,80,"snacks",12,["namkeen"],10,1),
    ("p018","Parle-G Biscuits","Parle","800g",55,55,"snacks",10,["chai"],15,1),
    ("p019","Dairy Milk Silk","Cadbury","60g",72,75,"snacks",12,["dessert"],14,1),
    ("p020","Tata Tea Premium","Tata","250g",115,120,"beverages",10,["morning"],18,1),
    ("p021","Nescafé Classic","Nescafé","50g",130,140,"beverages",10,["coffee"],20,1),
    ("p022","Thums Up","Coca-Cola","750ml",38,40,"beverages",12,["party"],7,2),
    ("p023","Real Mango Juice","Dabur","1L",99,105,"beverages",12,["kids"],10,1),
    ("p024","Horlicks Junior","GSK","500g",275,290,"beverages",15,["kids"],30,1),
    ("p025","Banana","Fresh","12 pcs",48,50,"fruits-vegetables",12,["fruit"],5,1),
    ("p026","Tomato","Fresh","500g",28,30,"fruits-vegetables",12,["vegetable"],5,1),
    ("p027","Onion","Fresh","1kg",35,38,"fruits-vegetables",12,["vegetable"],8,1),
    ("p028","Potato","Fresh","1kg",30,32,"fruits-vegetables",12,["vegetable"],8,1),
    ("p029","Spinach","Fresh","250g",22,25,"fruits-vegetables",12,["healthy"],5,1),
    ("p030","Crocin Advance","GSK","500mg x 10",32,35,"pharmacy",10,["fever","emergency"],60,1),
    ("p031","Electral ORS","Abbott","Sachet x 5",55,60,"pharmacy",10,["hydration"],60,1),
    ("p032","Vicks VapoRub","Vicks","25g",89,95,"pharmacy",10,["cold"],90,1),
    ("p033","Dettol Handwash","Dettol","200ml",72,78,"personal-care",15,["hygiene"],25,1),
    ("p034","Surf Excel Matic","HUL","1kg",285,300,"household",20,["laundry"],35,1),
    ("p035","Vim Dishwash Bar","HUL","200g",28,30,"household",15,["kitchen"],20,1),
]

CATALOG_MAP = {p[0]: p for p in CATALOG}

# Household type → which product categories they tend to buy
HOUSEHOLD_PROFILES = {
    "family":   ["dairy","bakery","grocery","fruits-vegetables","beverages","household","personal-care"],
    "student":  ["grocery","snacks","beverages","dairy"],
    "couple":   ["dairy","bakery","grocery","fruits-vegetables","beverages"],
    "senior":   ["dairy","grocery","fruits-vegetables","pharmacy","household"],
}

# Household type → how many distinct products they regularly buy
PRODUCT_COUNT = {"family": (8, 14), "student": (4, 7), "couple": (6, 10), "senior": (5, 9)}


# ─── Step 1: Generate products ────────────────────────────────────────────────

def seed_products():
    table = db.Table("products")
    for row in CATALOG:
        pid, name, brand, variant, price, mrp, category, delivery_mins, tags, _, _ = row
        table.put_item(Item={
            "PK": f"PRODUCT#{pid}",
            "SK": "METADATA",
            "id": pid, "name": name, "brand": brand, "variant": variant,
            "price": d(price), "mrp": d(mrp), "category": category,
            "delivery_mins": delivery_mins, "tags": tags, "in_stock": True,
        })
    print(f"  ✓ {len(CATALOG)} products")


# ─── Step 2: Generate users ───────────────────────────────────────────────────

def _random_user(user_id: str) -> dict:
    gender = random.choice(["M", "F"])
    name = f"{random.choice(FIRST_NAMES_M if gender == 'M' else FIRST_NAMES_F)} {random.choice(LAST_NAMES)}"
    household_type = random.choice(list(HOUSEHOLD_PROFILES.keys()))
    household_size = {"family": random.randint(3,5), "student": 1,
                      "couple": 2, "senior": random.randint(2,3)}[household_type]
    return {
        "PK": f"USER#{user_id}", "SK": "PROFILE",
        "id": user_id, "name": name,
        "phone": f"9{random.randint(100000000,999999999)}",
        "location": random.choice(CITIES),
        "household_type": household_type,
        "household_size": household_size,
        "member_since": ts(days_ago(random.randint(60, 400))),
    }


def seed_users(n: int = 5) -> list[dict]:
    table = db.Table("users")
    users = []
    for i in range(n):
        user_id = f"u{str(i+1).zfill(3)}"
        user = _random_user(user_id)
        table.put_item(Item=user)
        users.append(user)
    print(f"  ✓ {len(users)} users")
    return users


# ─── Step 3: Build each user's shopping basket ────────────────────────────────

def _build_basket(household_type: str) -> list[tuple]:
    """
    Returns list of (product_id, avg_cycle_days, avg_qty) tuples
    representing what this household regularly buys.
    Randomized based on household profile.
    """
    categories = HOUSEHOLD_PROFILES[household_type]
    min_p, max_p = PRODUCT_COUNT[household_type]
    target_count = random.randint(min_p, max_p)

    # Filter catalog to relevant categories
    eligible = [p for p in CATALOG if p[6] in categories]
    random.shuffle(eligible)

    basket = []
    for product in eligible[:target_count]:
        pid, *_, base_cycle, base_qty = product
        # Add ±20% randomness to cycle and quantity
        cycle = max(2, round(base_cycle * random.uniform(0.8, 1.2)))
        qty = max(1, round(base_qty * random.uniform(0.8, 1.3)))
        basket.append((pid, cycle, qty))

    return basket


# ─── Step 4: Generate orders from basket ─────────────────────────────────────

def seed_orders(users: list[dict], history_days: int = 90) -> dict:
    """
    Generates realistic order history per user.
    Returns baskets dict: {user_id: [(product_id, cycle, qty), ...]}
    """
    table = db.Table("orders")
    baskets = {}
    total = 0

    # Typical order hours by household type
    order_hours = {
        "family":  [7, 8, 9, 17, 18, 19],
        "student": [10, 11, 21, 22, 23],
        "couple":  [8, 9, 18, 19, 20],
        "senior":  [8, 9, 10, 11],
    }

    for user in users:
        user_id = user["id"]
        h_type = user["household_type"]
        basket = _build_basket(h_type)
        baskets[user_id] = basket
        hours = order_hours.get(h_type, [8, 9, 18, 19])

        for product_id, cycle_days, qty in basket:
            product = CATALOG_MAP.get(product_id)
            if not product:
                continue
            price = product[4]

            # Generate order dates going back history_days
            # Use gaussian jitter around cycle so it feels human
            current_day = float(history_days)
            while current_day >= 0:
                # Gaussian jitter: std_dev = 15% of cycle
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
                # Occasionally order extra quantity (bulk buy)
                actual_qty = qty if random.random() > 0.15 else qty + 1

                table.put_item(Item={
                    "PK": f"USER#{user_id}",
                    "SK": f"ORDER#{ts(placed_at)}#{order_id}",
                    "order_id": order_id,
                    "user_id": user_id,
                    "status": "delivered",
                    "placed_at": ts(placed_at),
                    "delivered_at": ts(placed_at + timedelta(minutes=random.randint(8, 20))),
                    "total": d(price * actual_qty),
                    "items": [{
                        "product_id": product_id,
                        "name": product[1],
                        "quantity": actual_qty,
                        "price": d(price),
                    }],
                })
                total += 1

    print(f"  ✓ {total} orders across {len(users)} users")
    return baskets


# ─── Step 5: Calculate consumption rates FROM orders ─────────────────────────

def seed_consumption_rates(users: list[dict], baskets: dict):
    """
    Calculates real consumption rates by scanning generated order history.
    This is not hardcoded — it reads back the orders and computes gaps.
    """
    orders_table = db.Table("orders")
    rates_table  = db.Table("consumption_rates")
    total = 0

    for user in users:
        user_id = user["id"]

        # Scan orders for this user
        resp = orders_table.query(
            KeyConditionExpression="PK = :pk AND begins_with(SK, :prefix)",
            ExpressionAttributeValues={":pk": f"USER#{user_id}", ":prefix": "ORDER#"},
        )
        items = resp.get("Items", [])

        # Group by product_id → collect order timestamps
        product_dates: dict[str, list[datetime]] = {}
        for item in items:
            for line in item.get("items", []):
                pid = line["product_id"]
                dt = datetime.strptime(item["placed_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
                product_dates.setdefault(pid, []).append(dt)

        for product_id, dates in product_dates.items():
            if len(dates) < 2:
                confidence = "low"
            elif len(dates) < 5:
                confidence = "medium"
            else:
                confidence = "high"

            dates.sort()
            # Calculate gaps between consecutive orders
            gaps = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
            avg_gap = sum(gaps) / len(gaps) if gaps else 7

            # Std dev to measure regularity
            if len(gaps) > 1:
                variance = sum((g - avg_gap)**2 for g in gaps) / len(gaps)
                std_dev = math.sqrt(variance)
                regularity = max(0.0, 1.0 - (std_dev / avg_gap)) if avg_gap > 0 else 0.5
            else:
                regularity = 0.5

            last_ordered = dates[-1]
            predicted_runout = last_ordered + timedelta(days=avg_gap)

            product = CATALOG_MAP.get(product_id)
            rates_table.put_item(Item={
                "PK": f"USER#{user_id}",
                "SK": f"ITEM#{product_id}",
                "user_id": user_id,
                "product_id": product_id,
                "product_name": product[1] if product else product_id,
                "avg_gap_days": d(avg_gap),
                "units_per_order": d(sum(
                    line["quantity"] for item in items
                    for line in item.get("items", [])
                    if line["product_id"] == product_id
                ) / len(dates)),
                "last_ordered_at": ts(last_ordered),
                "predicted_runout_at": ts(predicted_runout),
                "confidence": confidence,
                "sample_size": len(dates),
                "regularity_score": d(regularity),
            })
            total += 1

    print(f"  ✓ {total} consumption rates (calculated from orders)")


# ─── Step 6: Generate reminders FROM consumption rates ───────────────────────

def seed_reminders(users: list[dict]):
    """
    Generates reminders by reading consumption rates.
    Shows items that are predicted to run out within 3 days.
    """
    rates_table    = db.Table("consumption_rates")
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

            # Only create reminder if running out within 4 days
            if days_left > 4:
                continue

            if days_left <= 0:
                title    = f"{rate['product_name']} has run out"
                urgency  = "high"
                priority = 1
            elif days_left == 1:
                title    = f"{rate['product_name']} runs out tomorrow"
                urgency  = "high"
                priority = 1
            elif days_left == 2:
                title    = f"{rate['product_name']} runs out in 2 days"
                urgency  = "medium"
                priority = 2
            else:
                title    = f"{rate['product_name']} running low"
                urgency  = "low"
                priority = 3

            rid = uid()
            reminders_table.put_item(Item={
                "PK": f"USER#{user_id}",
                "SK": f"REMINDER#low_stock#{rid}",
                "id": rid,
                "user_id": user_id,
                "type": "low_stock",
                "title": title,
                "subtitle": "Based on your usage pattern",
                "product_id": rate["product_id"],
                "product_name": rate["product_name"],
                "days_left": max(0, days_left),
                "cta_label": "Order now",
                "priority": priority,
                "show_from": ts(now),
                "expires_at": ts(runout_dt + timedelta(days=2)),
                "status": "active",
                "urgency": urgency,
                "confidence": rate.get("confidence", "medium"),
                "verified_at": ts(now),
            })
            total += 1

    print(f"  ✓ {total} reminders (derived from consumption rates)")


# ─── Step 7: Generate routines FROM order patterns ───────────────────────────

def seed_routines(users: list[dict]):
    """
    Detects routines by finding (day_of_week, hour_bucket) combos
    that repeat consistently in the user's order history.
    """
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

        # Count (day_of_week, time_bucket) frequency
        slot_counts: dict[tuple, int] = {}
        slot_products: dict[tuple, list] = {}

        for item in items:
            dt = datetime.strptime(item["placed_at"], "%Y-%m-%dT%H:%M:%SZ")
            day = dt.strftime("%A")                   # Monday, Tuesday...
            hour_bucket = "morning" if dt.hour < 12 else "evening" if dt.hour < 18 else "night"
            slot = (day, hour_bucket)
            slot_counts[slot] = slot_counts.get(slot, 0) + 1
            for line in item.get("items", []):
                slot_products.setdefault(slot, []).append(line["product_id"])

        # Only keep slots that appear 3+ times (genuine routine)
        routines_found = {s: c for s, c in slot_counts.items() if c >= 3}

        # Take top 3 routines by frequency
        for slot, count in sorted(routines_found.items(), key=lambda x: -x[1])[:3]:
            day, time_bucket = slot
            confidence = min(0.95, 0.5 + count * 0.04)

            # Most common products in this slot
            products = slot_products.get(slot, [])
            freq: dict[str, int] = {}
            for pid in products:
                freq[pid] = freq.get(pid, 0) + 1
            top_products = [p for p, _ in sorted(freq.items(), key=lambda x: -x[1])[:4]]

            total_price = sum(
                CATALOG_MAP[p][4] for p in top_products if p in CATALOG_MAP
            )

            time_label = {"morning": "7–10 AM", "evening": "5–8 PM", "night": "9 PM–12"}[time_bucket]
            label = f"{day} {time_bucket}"

            rid = uid()
            routines_table.put_item(Item={
                "PK": f"USER#{user_id}",
                "SK": f"ROUTINE#{rid}",
                "id": rid,
                "user_id": user_id,
                "label": label,
                "day_of_week": day,
                "time_of_day": time_label,
                "product_ids": top_products,
                "total_price": d(total_price),
                "confidence": d(confidence),
                "order_count": count,
                "last_triggered_at": ts(days_ago(random.randint(2, 10))),
            })
            total += 1

    print(f"  ✓ {total} routines (detected from order patterns)")


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--users", type=int, default=5, help="Number of users to generate")
    parser.add_argument("--days",  type=int, default=90, help="Days of order history")
    args = parser.parse_args()

    print(f"\nGenerating data ({args.users} users, {args.days} days history)...\n")

    seed_products()
    users   = seed_users(n=args.users)
    baskets = seed_orders(users, history_days=args.days)
    seed_consumption_rates(users, baskets)
    seed_reminders(users)
    seed_routines(users)

    print("\n✓ Done.")
