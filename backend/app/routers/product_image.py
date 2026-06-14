"""
On-demand product image endpoint.

GET /api/products/{product_id}/image
  - Tries Clearbit logo for brand  (free, no API key)
  - Falls back to colored SVG with brand initials

GET /api/products/{product_id}/image?svg=1
  - Always returns SVG immediately (use as placeholder)
"""

import json
import hashlib
import asyncio
from pathlib import Path
from typing import Optional

import aiohttp
from fastapi import APIRouter, Response, Query
from fastapi.responses import RedirectResponse

router = APIRouter(prefix="/api/products", tags=["products"])

# ── Cache ─────────────────────────────────────────────────────────────────────
CACHE_PATH = Path(__file__).parent.parent / "db" / "image_cache.json"
_mem_cache: dict[str, str] = {}
_cache_loaded = False


def _load_cache():
    global _cache_loaded
    if _cache_loaded:
        return
    if CACHE_PATH.exists():
        try:
            _mem_cache.update(json.loads(CACHE_PATH.read_text()))
        except Exception:
            pass
    _cache_loaded = True


def _save_cache():
    tmp = CACHE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(_mem_cache))
    tmp.replace(CACHE_PATH)


# ── Catalog lookup ────────────────────────────────────────────────────────────
CATALOG_PATH = Path(__file__).parent.parent / "db" / "catalog.json"
_catalog: dict[str, dict] = {}


def _get_product(pid: str) -> Optional[dict]:
    if not _catalog:
        try:
            data = json.loads(CATALOG_PATH.read_text())
            _catalog.update({p["id"]: p for p in data})
        except Exception:
            pass
    return _catalog.get(pid)


# ── Brand → domain mapping (common Indian brands) ─────────────────────────────
_BRAND_DOMAINS = {
    "amul": "amul.com",
    "nestle": "nestle.in",
    "britannia": "britannia.co.in",
    "parle": "parleproducts.com",
    "dabur": "dabur.com",
    "haldiram": "haldirams.com",
    "itc": "itcportal.com",
    "colgate": "colgate.co.in",
    "unilever": "unilever.com",
    "hindustan unilever": "hul.co.in",
    "hul": "hul.co.in",
    "godrej": "godrej.com",
    "marico": "marico.com",
    "himalaya": "himalayawellness.com",
    "dettol": "dettol.co.in",
    "surf excel": "surfexcel.in",
    "lays": "lays.com",
    "kurkure": "kurkure.in",
    "pepsi": "pepsi.com",
    "coca cola": "coca-cola.com",
    "sprite": "sprite.com",
    "maggi": "maggi.in",
    "nescafe": "nescafe.co.in",
    "fortune": "fortunefoods.com",
    "aashirvaad": "aashirvaad.com",
    "tata": "tata.com",
    "patanjali": "patanjaliayurved.net",
    "mother dairy": "motherdairy.com",
    "kissan": "kissan.in",
    "bisleri": "bisleri.com",
    "paperboat": "hector-beverages.com",
    "paper boat": "hector-beverages.com",
    "cadbury": "cadbury.co.in",
    "mondelez": "mondelezinternational.com",
    "pepsodent": "pepsodent.in",
    "lifebuoy": "lifebuoy.com",
    "dove": "dove.com",
    "nivea": "nivea.in",
    "vaseline": "vaseline.com",
    "johnson": "johnsonsbaby.com",
    "vim": "vim.in",
    "harpic": "harpic.co.in",
    "ariel": "ariel.com",
    "tide": "tide.com",
    "frooti": "frooti.com",
    "maaza": "maaza.in",
    "tropicana": "tropicana.com",
    "real": "dabur.com",
    "oreo": "oreo.com",
    "sunsilk": "sunsilk.com",
    "head & shoulders": "headandshoulders.com",
    "head and shoulders": "headandshoulders.com",
    "pantene": "pantene.com",
}


def _brand_to_domain(brand: str) -> Optional[str]:
    """Map brand name to its domain for Clearbit logo."""
    b = brand.lower().strip()
    # Direct match
    if b in _BRAND_DOMAINS:
        return _BRAND_DOMAINS[b]
    # Partial match
    for key, domain in _BRAND_DOMAINS.items():
        if key in b or b in key:
            return domain
    # Generic: try brand.com
    slug = b.replace(" ", "").replace("&", "").replace("'", "")
    return f"{slug}.com"


async def _clearbit_logo(brand: str) -> Optional[str]:
    """Return Clearbit logo URL if it exists (HTTP 200)."""
    domain = _brand_to_domain(brand)
    if not domain:
        return None
    url = f"https://logo.clearbit.com/{domain}"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.head(url, timeout=aiohttp.ClientTimeout(total=4), allow_redirects=True) as r:
                if r.status == 200:
                    return url
    except Exception:
        pass
    return None


# ── SVG fallback ──────────────────────────────────────────────────────────────
_COLORS = [
    "#E63946", "#457B9D", "#2A9D8F", "#E9C46A", "#F4A261",
    "#264653", "#6A4C93", "#1982C4", "#8AC926", "#FF595E",
    "#FFCA3A", "#6BCB77", "#4D96FF", "#C77DFF", "#FF9F1C",
]


def _make_svg(brand: str, name: str, color: Optional[str] = None) -> str:
    """Generate a colored SVG with brand initials."""
    idx = int(hashlib.md5(brand.encode()).hexdigest(), 16) % len(_COLORS)
    bg = color or _COLORS[idx]

    b_init = (brand[0] if brand else "?").upper()
    n_init = (name[0] if name else "P").upper()
    initials = f"{b_init}{n_init}"

    brand_short = (brand[:13] + "…") if len(brand) > 13 else brand
    label = (name[:18] + "…") if len(name) > 18 else name

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="20" fill="{bg}"/>
  <rect x="10" y="10" width="180" height="180" rx="14" fill="white" opacity="0.12"/>
  <text x="100" y="98" font-family="system-ui,-apple-system,sans-serif" font-size="60"
        font-weight="800" fill="white" text-anchor="middle" dominant-baseline="middle">{initials}</text>
  <text x="100" y="145" font-family="system-ui,-apple-system,sans-serif" font-size="14"
        font-weight="600" fill="white" text-anchor="middle" opacity="0.9">{brand_short}</text>
  <text x="100" y="166" font-family="system-ui,-apple-system,sans-serif" font-size="11"
        fill="white" text-anchor="middle" opacity="0.7">{label}</text>
</svg>"""


# ── Endpoint ──────────────────────────────────────────────────────────────────
@router.get("/{product_id}/image")
async def product_image(
    product_id: str,
    svg: bool = Query(False, description="Return SVG immediately without searching"),
):
    _load_cache()

    product = _get_product(product_id)
    brand = (product.get("brand") or "?") if product else "?"
    name  = (product.get("name")  or "Product") if product else "Product"

    # Instant SVG mode — use as placeholder while real image loads
    if svg or not product:
        return Response(
            content=_make_svg(brand, name),
            media_type="image/svg+xml",
            headers={"Cache-Control": "public, max-age=86400"},
        )

    # Cache hit
    cached = _mem_cache.get(product_id)
    if cached == "svg" or cached == "none":
        return Response(
            content=_make_svg(brand, name),
            media_type="image/svg+xml",
            headers={"Cache-Control": "public, max-age=86400"},
        )
    if cached:
        return RedirectResponse(
            url=cached, status_code=302,
            headers={"Cache-Control": "public, max-age=86400"},
        )

    # Try Clearbit logo
    img_url = await _clearbit_logo(brand)

    _mem_cache[product_id] = img_url or "svg"
    if len(_mem_cache) % 100 == 0:
        _save_cache()

    if img_url:
        return RedirectResponse(
            url=img_url, status_code=302,
            headers={"Cache-Control": "public, max-age=86400"},
        )

    return Response(
        content=_make_svg(brand, name),
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=86400"},
    )
