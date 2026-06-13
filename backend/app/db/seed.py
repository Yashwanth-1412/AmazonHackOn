"""
Mock data generator — seeds all tables with realistic Indian household data.
Run: uv run python -m app.db.seed
"""

import uuid
import random
from datetime import datetime, timedelta
from decimal import Decimal
from app.db.client import db

# ── Helpers ───────────────────────────────────────────────────────────────────

def _d(val):
    """Convert float to Decimal for DynamoDB."""
    return Decimal(str(val))


def _ts(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _days_ago(n: int) -> datetime:
    return datetime.utcnow() - timedelta(days=n)


# ── Products ──────────────────────────────────────────────────────────────────

PRODUCTS_DATA = [
    # Dairy
    ("p001", "Amul Toned Milk", "Amul", "1L", 32, 32, "dairy", 10, ["daily","breakfast","kids"]),
    ("p002", "Amul Full Cream Milk", "Amul", "1L", 34, 34, "dairy", 10, ["daily","breakfast"]),
    ("p003", "Amul Dahi", "Amul", "400g", 52, 55, "dairy", 10, ["daily","probiotic"]),
    ("p004", "Amul Butter", "Amul", "100g", 57, 60, "dairy", 10, ["breakfast","cooking"]),
    ("p005", "Britannia Cheese Slice", "Britannia", "10 slices", 85, 90, "dairy", 10, ["tiffin","kids"]),
    ("p006", "Farm Fresh Eggs", "Nandini", "6 pack", 62, 65, "dairy", 12, ["protein","breakfast"]),
    # Bakery
    ("p007", "Britannia Bread", "Britannia", "400g", 35, 40, "bakery", 10, ["daily","tiffin"]),
    ("p008", "Britannia Brown Bread", "Britannia", "400g", 42, 45, "bakery", 10, ["healthy","tiffin"]),
    # Grocery & Staples
    ("p009", "Tata Salt", "Tata", "1kg", 26, 28, "grocery", 10, ["staple","cooking"]),
    ("p010", "Fortune Sunflower Oil", "Fortune", "1L", 145, 155, "grocery", 15, ["cooking","staple"]),
    ("p011", "Aashirvaad Atta", "ITC", "5kg", 265, 280, "grocery", 20, ["staple","cooking"]),
    ("p012", "India Gate Basmati Rice", "KRBL", "1kg", 95, 100, "grocery", 20, ["staple","cooking"]),
    ("p013", "Toor Dal", "Patanjali", "500g", 75, 80, "grocery", 15, ["staple","cooking"]),
    ("p014", "Maggi 2-Minute Noodles", "Nestlé", "70g x 4", 58, 60, "grocery", 10, ["quick","comfort","late-night"]),
    # Snacks
    ("p015", "Lay's Classic Salted", "Lay's", "52g", 20, 20, "snacks", 15, ["party","snacks","evening"]),
    ("p016", "Kurkure Masala Munch", "Kurkure", "90g", 30, 30, "snacks", 15, ["party","snacks"]),
    ("p017", "Haldiram's Aloo Bhujia", "Haldiram's", "200g", 75, 80, "snacks", 12, ["namkeen","party"]),
    ("p018", "Parle-G Biscuits", "Parle", "800g", 55, 55, "snacks", 10, ["chai","snacks","kids"]),
    ("p019", "Dairy Milk Silk", "Cadbury", "60g", 72, 75, "snacks", 12, ["dessert","gift"]),
    # Beverages
    ("p020", "Tata Tea Premium", "Tata", "250g", 115, 120, "beverages", 10, ["morning","chai"]),
    ("p021", "Nescafé Classic", "Nescafé", "50g", 130, 140, "beverages", 10, ["coffee","morning"]),
    ("p022", "Thums Up", "Coca-Cola", "750ml", 38, 40, "beverages", 12, ["party","drinks"]),
    ("p023", "Real Mango Juice", "Dabur", "1L", 99, 105, "beverages", 12, ["kids","drinks"]),
    ("p024", "Horlicks Junior", "GSK", "500g", 275, 290, "beverages", 15, ["kids","health"]),
    # Fruits & Vegetables
    ("p025", "Banana", "Fresh", "12 pcs", 48, 50, "fruits-vegetables", 12, ["fruit","healthy"]),
    ("p026", "Tomato", "Fresh", "500g", 28, 30, "fruits-vegetables", 12, ["vegetable","cooking"]),
    ("p027", "Onion", "Fresh", "1kg", 35, 38, "fruits-vegetables", 12, ["vegetable","cooking"]),
    ("p028", "Potato", "Fresh", "1kg", 30, 32, "fruits-vegetables", 12, ["vegetable","cooking"]),
    ("p029", "Spinach", "Fresh", "250g", 22, 25, "fruits-vegetables", 12, ["healthy","vegetable"]),
    # Pharmacy
    ("p030", "Crocin Advance", "GSK", "500mg x 10", 32, 35, "pharmacy", 10, ["fever","medicine","emergency"]),
    ("p031", "Electral ORS", "Abbott", "Sachet x 5", 55, 60, "pharmacy", 10, ["medicine","hydration"]),
    ("p032", "Vicks VapoRub", "Vicks", "25g", 89, 95, "pharmacy", 10, ["cold","medicine"]),
    ("p033", "Dettol Handwash", "Dettol", "200ml", 72, 78, "personal-care", 15, ["hygiene"]),
    # Household
    ("p034", "Surf Excel Matic", "HUL", "1kg", 285, 300, "household", 20, ["cleaning","laundry"]),
    ("p035", "Vim Dishwash Bar", "HUL", "200g", 28, 30, "household", 15, ["cleaning","kitchen"]),
]


def seed_products():
    table = db.Table("products")
    for row in PRODUCTS_DATA:
        pid, name, brand, variant, price, mrp, category, delivery_mins, tags = row
        table.put_item(Item={
            "PK": f"PRODUCT#{pid}",
            "SK": "METADATA",
            "id": pid,
            "name": name,
            "brand": brand,
            "variant": variant,
            "price": _d(price),
            "mrp": _d(mrp),
            "category": category,
            "delivery_mins": delivery_mins,
            "tags": tags,
            "in_stock": True,
        })
    print(f"  ✓ {len(PRODUCTS_DATA)} products seeded")


# ── Users ─────────────────────────────────────────────────────────────────────

USERS_DATA = [
    ("u001", "Priya Sharma",    "98765 43210", "Koramangala, Bengaluru", 4),
    ("u002", "Rahul Verma",     "91234 56789", "Baner, Pune",            1),
    ("u003", "Sunita Agarwal",  "99887 76655", "Dwarka, Delhi",          3),
    ("u004", "Arjun Mehta",     "87654 32109", "Madhapur, Hyderabad",    3),
]


def seed_users():
    table = db.Table("users")
    for uid, name, phone, location, household_size in USERS_DATA:
        table.put_item(Item={
            "PK": f"USER#{uid}",
            "SK": "PROFILE",
            "id": uid,
            "name": name,
            "phone": phone,
            "location": location,
            "household_size": household_size,
            "member_since": "2025-01-01",
        })
    print(f"  ✓ {len(USERS_DATA)} users seeded")


# ── Orders ────────────────────────────────────────────────────────────────────

# Each user has a "basket" of products they regularly buy + their cycle in days
USER_BASKETS = {
    "u001": [  # Priya — family of 4, Bengaluru
        ("p001", 2, 6),   # Amul Milk 1L x2 every 6 days
        ("p007", 1, 7),   # Britannia Bread every 7 days
        ("p006", 1, 10),  # Eggs every 10 days
        ("p003", 1, 8),   # Dahi every 8 days
        ("p020", 1, 20),  # Tata Tea every 20 days
        ("p025", 1, 5),   # Bananas every 5 days
        ("p009", 1, 30),  # Salt every 30 days
        ("p018", 1, 15),  # Parle-G every 15 days
    ],
    "u002": [  # Rahul — solo PG, Pune
        ("p014", 2, 7),   # Maggi every 7 days
        ("p015", 1, 5),   # Lay's every 5 days
        ("p001", 1, 4),   # Milk every 4 days
        ("p022", 2, 7),   # Thums Up every 7 days
        ("p018", 1, 10),  # Parle-G every 10 days
    ],
    "u003": [  # Sunita — family of 3, Delhi
        ("p001", 2, 5),   # Milk every 5 days
        ("p011", 1, 25),  # Atta every 25 days
        ("p013", 1, 20),  # Dal every 20 days
        ("p010", 1, 30),  # Oil every 30 days
        ("p026", 1, 4),   # Tomato every 4 days
        ("p027", 1, 7),   # Onion every 7 days
    ],
    "u004": [  # Arjun — 3 flatmates, Hyderabad
        ("p006", 1, 7),   # Eggs every 7 days
        ("p007", 1, 5),   # Bread every 5 days
        ("p014", 2, 6),   # Maggi every 6 days
        ("p001", 1, 5),   # Milk every 5 days
        ("p022", 3, 5),   # Thums Up every 5 days
    ],
}


def seed_orders():
    table = db.Table("orders")
    total = 0

    for user_id, basket in USER_BASKETS.items():
        for product_id, qty, cycle_days in basket:
            # Generate orders going back 60 days
            day = 60
            while day >= 0:
                # Add slight randomness to cycle (±1 day)
                jitter = random.randint(-1, 1)
                order_day = day
                day -= max(1, cycle_days + jitter)

                order_id = str(uuid.uuid4())[:8]
                placed_at = _days_ago(order_day).replace(
                    hour=random.choice([7, 8, 9, 18, 19, 20, 22]),
                    minute=random.randint(0, 59),
                    second=0,
                )

                # Find product price
                product = next((p for p in PRODUCTS_DATA if p[0] == product_id), None)
                if not product:
                    continue
                price = product[4]

                table.put_item(Item={
                    "PK": f"USER#{user_id}",
                    "SK": f"ORDER#{_ts(placed_at)}#{order_id}",
                    "order_id": order_id,
                    "user_id": user_id,
                    "status": "delivered",
                    "placed_at": _ts(placed_at),
                    "delivered_at": _ts(placed_at + timedelta(minutes=random.randint(8, 18))),
                    "total": _d(price * qty),
                    "items": [
                        {
                            "product_id": product_id,
                            "name": product[1],
                            "quantity": qty,
                            "price": _d(price),
                        }
                    ],
                })
                total += 1

    print(f"  ✓ {total} orders seeded")


# ── Consumption Rates (calculated from basket data) ───────────────────────────

def seed_consumption_rates():
    table = db.Table("consumption_rates")
    total = 0

    for user_id, basket in USER_BASKETS.items():
        for product_id, qty, cycle_days in basket:
            product = next((p for p in PRODUCTS_DATA if p[0] == product_id), None)
            if not product:
                continue

            last_ordered = _days_ago(random.randint(1, cycle_days - 1))
            predicted_runout = last_ordered + timedelta(days=cycle_days)

            table.put_item(Item={
                "PK": f"USER#{user_id}",
                "SK": f"ITEM#{product_id}",
                "user_id": user_id,
                "product_id": product_id,
                "product_name": product[1],
                "avg_gap_days": _d(cycle_days),
                "units_per_order": qty,
                "last_ordered_at": _ts(last_ordered),
                "predicted_runout_at": _ts(predicted_runout),
                "confidence": "high",
                "sample_size": random.randint(6, 12),
            })
            total += 1

    print(f"  ✓ {total} consumption rates seeded")


# ── Reminders (pre-generated from consumption data) ───────────────────────────

def seed_reminders():
    table = db.Table("reminders")
    now = datetime.utcnow()
    total = 0

    # Low stock reminders for u001 (Priya) — demo user
    low_stock = [
        ("p001", "Milk runs out tomorrow", "Based on your usage", 1, "high"),
        ("p007", "Bread runs out in 2 days", "Based on your usage", 2, "medium"),
        ("p006", "Eggs running low", "Based on your usage", 4, "low"),
    ]

    for product_id, title, subtitle, days_left, urgency in low_stock:
        rid = str(uuid.uuid4())[:8]
        table.put_item(Item={
            "PK": "USER#u001",
            "SK": f"REMINDER#low_stock#{rid}",
            "id": rid,
            "user_id": "u001",
            "type": "low_stock",
            "title": title,
            "subtitle": subtitle,
            "product_id": product_id,
            "cta_label": f"Order now",
            "priority": days_left,
            "show_from": _ts(now),
            "expires_at": _ts(now + timedelta(days=days_left + 1)),
            "status": "active",
            "urgency": urgency,
            "confidence": "high",
            "verified_at": _ts(now),
        })
        total += 1

    # Context card reminders
    context_reminders = [
        ("rc_season", "seasonal",    "Monsoon snack kit",              "Raining in your area",         "medium", "🌧️"),
        ("rc_area",   "area_signal", "47 people ordered ORS near you", "Possible health alert nearby", "medium", "📍"),
    ]

    for rid, rtype, title, subtitle, urgency, icon in context_reminders:
        table.put_item(Item={
            "PK": "USER#u001",
            "SK": f"REMINDER#{rtype}#{rid}",
            "id": rid,
            "user_id": "u001",
            "type": rtype,
            "title": title,
            "subtitle": subtitle,
            "cta_label": "See bundle",
            "priority": 3,
            "show_from": _ts(now),
            "expires_at": _ts(now + timedelta(hours=12)),
            "status": "active",
            "urgency": urgency,
            "icon": icon,
            "confidence": "medium",
            "verified_at": _ts(now),
        })
        total += 1

    print(f"  ✓ {total} reminders seeded")


# ── Routines ──────────────────────────────────────────────────────────────────

def seed_routines():
    table = db.Table("routines")

    routines = [
        ("rt001", "u001", "Monday morning",  "Monday",   "7–9 AM",   ["p001","p007","p005"], 120, 0.91),
        ("rt002", "u001", "Friday evening",  "Friday",   "6–8 PM",   ["p015","p017","p022"], 128, 0.87),
        ("rt003", "u001", "Sunday restock",  "Sunday",   "10 AM–12", ["p001","p007","p009","p010"], 238, 0.79),
        ("rt004", "u002", "Late night snack","Saturday", "10 PM–12", ["p014","p015","p022"], 116, 0.83),
        ("rt005", "u004", "Post-gym refuel", "Monday",   "7–9 PM",   ["p006","p007","p022"], 140, 0.76),
    ]

    for rid, uid, label, day, time_of_day, product_ids, total_price, confidence in routines:
        table.put_item(Item={
            "PK": f"USER#{uid}",
            "SK": f"ROUTINE#{rid}",
            "id": rid,
            "user_id": uid,
            "label": label,
            "day_of_week": day,
            "time_of_day": time_of_day,
            "product_ids": product_ids,
            "total_price": _d(total_price),
            "confidence": _d(confidence),
            "last_triggered_at": _ts(_days_ago(7)),
        })

    print(f"  ✓ {len(routines)} routines seeded")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Seeding data...")
    seed_products()
    seed_users()
    seed_orders()
    seed_consumption_rates()
    seed_reminders()
    seed_routines()
    print("\n✓ All done.")
