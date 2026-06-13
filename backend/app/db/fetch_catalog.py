"""
Catalog fetcher — pulls real Indian grocery data from BigBasket open dataset on GitHub
and seeds it into DynamoDB products table.

Source: github.com/prernagoswami11/bigbasket-product-analysis

Run: uv run python -m app.db.fetch_catalog
     uv run python -m app.db.fetch_catalog --limit 500
"""

import csv
import io
import re
import uuid
import random
import asyncio
import json
import httpx
from decimal import Decimal
from pathlib import Path
from app.db.client import db

# ── Config ────────────────────────────────────────────────────────────────────

RAW_CSV_URL = (
    "https://raw.githubusercontent.com/prernagoswami11/bigbasket-product-analysis"
    "/main/BigBasket%20Products.csv"
)

OUT_FILE = Path(__file__).parent / "catalog.json"

# Strict whitelist: (bb_category, bb_sub_category) → our internal category
# Only explicitly listed combos are imported — everything else is skipped
WHITELIST: dict[tuple[str, str], str] = {
    # ── Dairy ────────────────────────────────────────────────────────────────
    ("Bakery, Cakes & Dairy", "Dairy"):                     "dairy",
    ("Bakery, Cakes & Dairy", "Non Dairy"):                 "dairy",
    ("Gourmet & World Food",  "Dairy & Cheese"):            "dairy",
    ("Eggs, Meat & Fish",     "Eggs"):                      "dairy",

    # ── Bakery ───────────────────────────────────────────────────────────────
    ("Bakery, Cakes & Dairy", "Breads & Buns"):             "bakery",
    ("Bakery, Cakes & Dairy", "Cakes & Pastries"):          "bakery",
    ("Bakery, Cakes & Dairy", "Bakery Snacks"):             "bakery",
    ("Bakery, Cakes & Dairy", "Cookies, Rusk & Khari"):     "bakery",
    ("Bakery, Cakes & Dairy", "Gourmet Breads"):            "bakery",

    # ── Grocery / Staples ────────────────────────────────────────────────────
    ("Foodgrains, Oil & Masala", "Atta, Flours & Sooji"):   "grocery",
    ("Foodgrains, Oil & Masala", "Rice & Rice Products"):   "grocery",
    ("Foodgrains, Oil & Masala", "Dals & Pulses"):          "grocery",
    ("Foodgrains, Oil & Masala", "Edible Oils & Ghee"):     "grocery",
    ("Foodgrains, Oil & Masala", "Salt, Sugar & Jaggery"):  "grocery",
    ("Foodgrains, Oil & Masala", "Masalas & Spices"):       "grocery",
    ("Foodgrains, Oil & Masala", "Dry Fruits"):             "grocery",
    ("Foodgrains, Oil & Masala", "Organic Staples"):        "grocery",
    ("Gourmet & World Food",  "Pasta, Soup & Noodles"):     "grocery",
    ("Gourmet & World Food",  "Sauces, Spreads & Dips"):    "grocery",
    ("Gourmet & World Food",  "Cooking & Baking Needs"):    "grocery",
    ("Gourmet & World Food",  "Tinned & Processed Food"):   "grocery",
    ("Gourmet & World Food",  "Rice & Rice Products"):      "grocery",

    # ── Snacks ───────────────────────────────────────────────────────────────
    ("Snacks & Branded Foods", "Snacks & Namkeen"):         "snacks",
    ("Snacks & Branded Foods", "Biscuits & Cookies"):       "snacks",
    ("Snacks & Branded Foods", "Chocolates & Candies"):     "snacks",
    ("Snacks & Branded Foods", "Noodle, Pasta, Vermicelli"):"snacks",
    ("Snacks & Branded Foods", "Ready To Cook & Eat"):      "snacks",
    ("Snacks & Branded Foods", "Breakfast Cereals"):        "snacks",
    ("Snacks & Branded Foods", "Indian Mithai"):            "snacks",
    ("Snacks & Branded Foods", "Pickles & Chutney"):        "snacks",
    ("Gourmet & World Food",  "Chocolates & Biscuits"):     "snacks",
    ("Gourmet & World Food",  "Snacks, Dry Fruits, Nuts"):  "snacks",

    # ── Beverages ────────────────────────────────────────────────────────────
    ("Beverages", "Tea"):                                   "beverages",
    ("Beverages", "Coffee"):                                "beverages",
    ("Beverages", "Fruit Juices & Drinks"):                 "beverages",
    ("Beverages", "Energy & Soft Drinks"):                  "beverages",
    ("Beverages", "Health Drink, Supplement"):              "beverages",
    ("Beverages", "Water"):                                 "beverages",
    ("Gourmet & World Food",  "Drinks & Beverages"):        "beverages",

    # ── Fruits & Vegetables ───────────────────────────────────────────────────
    ("Fruits & Vegetables", "Fresh Fruits"):                "fruits-vegetables",
    ("Fruits & Vegetables", "Fresh Vegetables"):            "fruits-vegetables",
    ("Fruits & Vegetables", "Organic Fruits & Vegetables"): "fruits-vegetables",
    ("Fruits & Vegetables", "Exotic Fruits & Veggies"):     "fruits-vegetables",
    ("Fruits & Vegetables", "Cuts & Sprouts"):              "fruits-vegetables",
    ("Fruits & Vegetables", "Herbs & Seasonings"):          "fruits-vegetables",

    # ── Household ────────────────────────────────────────────────────────────
    ("Cleaning & Household", "Detergents & Dishwash"):      "household",
    ("Cleaning & Household", "All Purpose Cleaners"):       "household",
    ("Cleaning & Household", "Mops, Brushes & Scrubs"):     "household",
    ("Cleaning & Household", "Fresheners & Repellents"):    "household",
    ("Cleaning & Household", "Disposables, Garbage Bag"):   "household",

    # ── Personal Care ─────────────────────────────────────────────────────────
    ("Beauty & Hygiene", "Bath & Hand Wash"):               "personal-care",
    ("Beauty & Hygiene", "Hair Care"):                      "personal-care",
    ("Beauty & Hygiene", "Men's Grooming"):                 "personal-care",
    ("Beauty & Hygiene", "Skin Care"):                      "personal-care",

    # ── Pharmacy ─────────────────────────────────────────────────────────────
    ("Beauty & Hygiene", "Health & Medicine"):              "pharmacy",
    ("Baby Care",        "Baby Food & Formula"):            "pharmacy",
}

# Delivery time by category
DELIVERY_MAP = {
    "grocery": 15, "snacks": 12, "beverages": 12, "dairy": 10,
    "bakery": 10, "fruits-vegetables": 15, "household": 20,
    "personal-care": 15, "pharmacy": 10,
}

# Typical reorder cycle
CYCLE_MAP = {
    "grocery": 20, "snacks": 7, "beverages": 10, "dairy": 5,
    "bakery": 6, "fruits-vegetables": 5, "household": 30,
    "personal-care": 25, "pharmacy": 60,
}

# Brand → logo URL via Clearbit (free, no key needed)
BRAND_DOMAINS = {
    "amul": "amul.com", "britannia": "britannia.co.in",
    "parle": "parle.com", "nestle": "nestle.in",
    "tata": "tata.com", "itc": "itcportal.com",
    "haldiram": "haldirams.com", "dabur": "dabur.com",
    "marico": "marico.com", "patanjali": "patanjali.com",
    "fortune": "adanigroups.com", "pepsi": "pepsicoindia.com",
    "cadbury": "mondelezinternational.com", "nescafe": "nestle.com",
    "dettol": "reckitt.com", "colgate": "colgate.co.in",
    "surf excel": "unilever.com", "vim": "unilever.com",
    "kissan": "hul.co.in", "maggi": "nestle.in",
    "lays": "pepsicoindia.com", "kurkure": "pepsicoindia.com",
    "lipton": "unilever.com", "horlicks": "gsk.com",
    "sunfeast": "itcportal.com", "good day": "britannia.co.in",
    "real": "dabur.com", "tropicana": "pepsicoindia.com",
    "mother dairy": "motherdairy.com", "mtr": "mtr.co.in",
}


def _slug(name: str) -> str:
    return name.lower().strip()


def _get_category(bb_category: str, bb_sub: str) -> str | None:
    """Returns our category or None if this combo should be skipped."""
    return WHITELIST.get((bb_category.strip(), bb_sub.strip()))


def _get_logo(brand: str) -> str:
    slug = _slug(brand)
    for key, domain in BRAND_DOMAINS.items():
        if key in slug:
            return f"https://logo.clearbit.com/{domain}"
    return ""


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip())[:80]


# ── Download CSV ──────────────────────────────────────────────────────────────

async def download_csv() -> str:
    print("  Downloading BigBasket dataset from GitHub...")
    async with httpx.AsyncClient(timeout=90.0) as client:
        r = await client.get(RAW_CSV_URL)
        r.raise_for_status()
        print(f"  ✓ {len(r.content) // 1024} KB downloaded")
        return r.text


# ── Parse & filter ────────────────────────────────────────────────────────────

def parse_catalog(csv_text: str, limit: int = 300) -> list[dict]:
    reader = csv.DictReader(io.StringIO(csv_text))
    products = []
    seen = set()

    # Count per category to keep it balanced
    cat_count: dict[str, int] = {}
    per_cat_limit = max(10, limit // len(set(WHITELIST.values())))

    for row in reader:
        name      = _clean(row.get("product", ""))
        brand     = _clean(row.get("brand", "Generic"))
        bb_cat    = row.get("category", "")
        bb_sub    = row.get("sub_category", "")
        sale_str  = row.get("sale_price", "0")
        mrp_str   = row.get("market_price", "0")
        rating    = row.get("rating", "")

        # Skip bad rows
        if not name or not brand or brand == "nan":
            continue
        if len(name) < 3:
            continue

        # Strict whitelist — skip anything not explicitly mapped
        category = _get_category(bb_cat, bb_sub)
        if category is None:
            continue
            continue

        # Dedup by name+brand
        key = f"{name[:20]}_{brand[:10]}".lower()
        if key in seen:
            continue
        seen.add(key)

        # Parse prices
        try:
            sale_price = float(re.sub(r"[^\d.]", "", sale_str) or 0)
            mrp_price  = float(re.sub(r"[^\d.]", "", mrp_str) or 0)
        except ValueError:
            continue

        if sale_price <= 0:
            continue

        # Parse rating
        try:
            rating_val = float(rating) if rating and rating != "nan" else 3.5
        except ValueError:
            rating_val = 3.5

        pid = f"p{str(uuid.uuid4())[:8]}"

        products.append({
            "id":            pid,
            "name":          name,
            "brand":         brand,
            "variant":       _clean(bb_sub),
            "category":      category,
            "price":         round(sale_price, 2),
            "mrp":           round(max(mrp_price, sale_price), 2),
            "rating":        round(rating_val, 1),
            "logo_url":      _get_logo(brand),
            "delivery_mins": DELIVERY_MAP.get(category, 15),
            "cycle_days":    CYCLE_MAP.get(category, 14),
            "in_stock":      True,
            "tags":          [category, bb_sub.lower()[:20]],
            "source":        "bigbasket",
        })

        cat_count[category] = cat_count.get(category, 0) + 1

    # ── Balance categories ───────────────────────────────────────────────────
    # Group by category, sample evenly, then flatten
    import random as _rnd
    by_cat: dict[str, list] = {}
    for p in products:
        by_cat.setdefault(p["category"], []).append(p)

    n_cats   = len(by_cat)
    per_cat  = max(10, limit // n_cats) if n_cats else limit
    balanced = []
    for cat_products in by_cat.values():
        _rnd.shuffle(cat_products)
        balanced.extend(cat_products[:per_cat])

    # Trim to limit
    _rnd.shuffle(balanced)
    return balanced[:limit]


# ── Seed into DynamoDB ────────────────────────────────────────────────────────

def seed_to_db(products: list[dict]):
    table  = db.Table("products")
    # Clear existing products first
    existing = table.scan(ProjectionExpression="PK, SK")["Items"]
    with table.batch_writer() as batch:
        for item in existing:
            batch.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})

    with table.batch_writer() as batch:
        for p in products:
            batch.put_item(Item={
                "PK":            f"PRODUCT#{p['id']}",
                "SK":            "METADATA",
                "id":            p["id"],
                "name":          p["name"],
                "brand":         p["brand"],
                "variant":       p["variant"],
                "category":      p["category"],
                "price":         Decimal(str(p["price"])),
                "mrp":           Decimal(str(p["mrp"])),
                "rating":        Decimal(str(p["rating"])),
                "logo_url":      p["logo_url"],
                "delivery_mins": p["delivery_mins"],
                "cycle_days":    p["cycle_days"],
                "tags":          p["tags"],
                "in_stock":      p["in_stock"],
                "source":        p["source"],
            })

    print(f"  ✓ {len(products)} products seeded to DynamoDB")


# ── Main ──────────────────────────────────────────────────────────────────────

async def main(limit: int = 300, save_json: bool = False):
    csv_text = await download_csv()
    print(f"  Parsing (limit={limit})...")
    products = parse_catalog(csv_text, limit=limit)

    # Show category breakdown
    cat_count: dict[str, int] = {}
    for p in products:
        cat_count[p["category"]] = cat_count.get(p["category"], 0) + 1
    print("  Category breakdown:")
    for cat, count in sorted(cat_count.items(), key=lambda x: -x[1]):
        print(f"    {cat:<20} {count}")

    if save_json:
        OUT_FILE.write_text(json.dumps(products, indent=2, ensure_ascii=False))
        print(f"  Saved → {OUT_FILE}")

    print("\n  Seeding to DynamoDB...")
    seed_to_db(products)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit",     type=int,  default=300)
    parser.add_argument("--save-json", action="store_true")
    args = parser.parse_args()

    asyncio.run(main(limit=args.limit, save_json=args.save_json))
