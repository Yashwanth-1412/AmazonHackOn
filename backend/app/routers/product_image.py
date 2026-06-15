"""
Product image endpoint.

GET /api/products/{product_id}/image
  1. Serves locally saved image if exists (from scraping)
  2. Falls back to a beautiful category + brand SVG card

GET /api/products/{product_id}/image?svg=1
  Always returns SVG immediately (use as placeholder)
"""

import json
import hashlib
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Response, Query

router = APIRouter(prefix="/api/products", tags=["products"])

# ── Paths ─────────────────────────────────────────────────────────────────────
CATALOG_PATH = Path(__file__).parent.parent / "db" / "catalog.json"
IMAGE_DIR    = Path(__file__).parent.parent / "db" / "product_images"

# ── Catalog cache ─────────────────────────────────────────────────────────────
_catalog: dict[str, dict] = {}

def _get_product(pid: str) -> Optional[dict]:
    if not _catalog:
        try:
            data = json.loads(CATALOG_PATH.read_text())
            _catalog.update({p["id"]: p for p in data})
        except Exception:
            pass
    return _catalog.get(pid)

# ── Category config ───────────────────────────────────────────────────────────
_CAT_CONFIG = {
    "snacks":            {"emoji": "🍟", "bg": "#FF6B35", "accent": "#FF8C5A"},
    "beverages":         {"emoji": "🥤", "bg": "#1E90FF", "accent": "#4CA9FF"},
    "dairy":             {"emoji": "🥛", "bg": "#4ECDC4", "accent": "#6ED8D0"},
    "bakery":            {"emoji": "🍞", "bg": "#F4A261", "accent": "#F6B87B"},
    "fruits-vegetables": {"emoji": "🥦", "bg": "#2A9D8F", "accent": "#3DB89A"},
    "grocery":           {"emoji": "🛒", "bg": "#E76F51", "accent": "#ED8B71"},
    "household":         {"emoji": "🧹", "bg": "#457B9D", "accent": "#5A8FAB"},
    "personal-care":     {"emoji": "🧴", "bg": "#6A4C93", "accent": "#8060AA"},
    "pharmacy":          {"emoji": "💊", "bg": "#E63946", "accent": "#EC5963"},
}
_DEFAULT_CAT = {"emoji": "📦", "bg": "#264653", "accent": "#3A6374"}

def _brand_color(brand: str) -> str:
    """Deterministic accent color from brand name."""
    colors = [
        "#FF6B35","#1E90FF","#4ECDC4","#F4A261","#2A9D8F",
        "#E76F51","#457B9D","#6A4C93","#E63946","#2ECC71",
        "#E67E22","#9B59B6","#1ABC9C","#E74C3C","#3498DB",
    ]
    idx = int(hashlib.md5(brand.lower().encode()).hexdigest(), 16) % len(colors)
    return colors[idx]

# ── SVG generator ─────────────────────────────────────────────────────────────
def _make_svg(brand: str, name: str, category: str = "") -> str:
    cfg = _CAT_CONFIG.get(category, _DEFAULT_CAT)
    emoji  = cfg["emoji"]
    bg     = _brand_color(brand) if brand else cfg["bg"]
    accent = cfg["accent"]

    # Truncate
    brand_short = (brand[:14] + "…") if len(brand) > 14 else brand
    name_short  = (name[:20]  + "…") if len(name)  > 20 else name

    # Lighter version of bg for gradient
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{bg}"/>
      <stop offset="100%" stop-color="{bg}cc"/>
    </linearGradient>
    <filter id="s">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="200" height="200" rx="20" fill="url(#g)"/>

  <!-- Subtle pattern dots -->
  <circle cx="170" cy="30" r="40" fill="white" opacity="0.05"/>
  <circle cx="30" cy="170" r="30" fill="white" opacity="0.05"/>

  <!-- Icon circle -->
  <circle cx="100" cy="78" r="38" fill="white" opacity="0.18" filter="url(#s)"/>

  <!-- Emoji -->
  <text x="100" y="92" font-size="38" text-anchor="middle" dominant-baseline="middle">{emoji}</text>

  <!-- Divider -->
  <rect x="30" y="124" width="140" height="1.5" rx="1" fill="white" opacity="0.25"/>

  <!-- Brand name -->
  <text x="100" y="145"
        font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
        font-size="13" font-weight="700"
        fill="white" text-anchor="middle" opacity="0.95">{brand_short}</text>

  <!-- Product name -->
  <text x="100" y="166"
        font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
        font-size="11" font-weight="400"
        fill="white" text-anchor="middle" opacity="0.75">{name_short}</text>
</svg>"""

# ── Endpoint ──────────────────────────────────────────────────────────────────
@router.get("/{product_id}/image")
async def product_image(
    product_id: str,
    svg: bool = Query(False, description="Always return SVG"),
):
    product  = _get_product(product_id)
    brand    = (product.get("brand")    or "") if product else ""
    name     = (product.get("name")     or "") if product else "Product"
    category = (product.get("category") or "") if product else ""

    # Always SVG mode
    if svg or not product:
        return Response(
            content=_make_svg(brand, name, category),
            media_type="image/svg+xml",
            headers={"Cache-Control": "public, max-age=86400"},
        )

    # Serve locally saved image (from scraping)
    for ext in ["jpg", "webp", "png"]:
        img_path = IMAGE_DIR / f"{product_id}.{ext}"
        if img_path.exists():
            mime = "image/webp" if ext == "webp" else f"image/{ext}"
            return Response(
                content=img_path.read_bytes(),
                media_type=mime,
                headers={"Cache-Control": "public, max-age=604800"},
            )

    # Category-based SVG fallback
    return Response(
        content=_make_svg(brand, name, category),
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=86400"},
    )
