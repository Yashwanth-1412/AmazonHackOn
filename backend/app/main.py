from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import products, home, orders, ramble, product_image

app = FastAPI(
    title="Amazon Now API",
    version="0.1.0",
    docs_url="/docs" if settings.APP_ENV == "development" else None,
)

# CORS — allow all in dev, restrict in prod via CORS_ORIGINS env var
_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins if _origins != ["*"] else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(products.router)
app.include_router(home.router)
app.include_router(orders.router)
app.include_router(ramble.router)
app.include_router(product_image.router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "env": settings.APP_ENV,
        "voice_provider": settings.VOICE_PROVIDER,
        "embedding_model": settings.EMBEDDING_MODEL,
        "dynamodb_region": settings.DYNAMODB_REGION,
        "dynamodb_local": bool(settings.DYNAMODB_ENDPOINT),
    }
