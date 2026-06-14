"""
Modular embedding client — works with any OpenAI-compatible endpoint.

Swap providers by changing env vars:
  EMBEDDING_PROVIDER=openai      → https://api.openai.com/v1
  EMBEDDING_PROVIDER=ollama      → http://localhost:11434/v1
  EMBEDDING_PROVIDER=lmstudio    → http://localhost:1234/v1
  EMBEDDING_PROVIDER=custom      → your custom endpoint
"""

import time
from typing import Optional
from openai import AsyncOpenAI

from app.core.config import settings


class EmbeddingClient:
    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.base_url = base_url or settings.EMBEDDING_BASE_URL
        self.api_key = api_key or settings.EMBEDDING_API_KEY or "no-key"
        self.model = model or settings.EMBEDDING_MODEL
        self.dimensions = settings.EMBEDDING_DIMENSIONS

        self._client = AsyncOpenAI(
            base_url=self.base_url,
            api_key=self.api_key,
        )

    async def embed(self, text: str) -> list[float]:
        """Embed a single text string."""
        resp = await self._client.embeddings.create(
            model=self.model,
            input=text,
        )
        return resp.data[0].embedding

    async def embed_batch(self, texts: list[str], batch_size: int = 200) -> list[list[float]]:
        """Embed multiple texts in batches."""
        all_embeddings = []
        total = len(texts)

        for i in range(0, total, batch_size):
            batch = texts[i : i + batch_size]
            resp = await self._client.embeddings.create(
                model=self.model,
                input=batch,
            )
            all_embeddings.extend([d.embedding for d in resp.data])
            done = min(i + batch_size, total)
            if done % 1000 == 0 or done == total:
                print(f"    Embedded {done}/{total}...")

        return all_embeddings

    async def health_check(self) -> dict:
        """Check if the embedding service is reachable."""
        start = time.time()
        try:
            await self.embed("test")
            latency_ms = round((time.time() - start) * 1000, 1)
            return {
                "status": "ok",
                "provider": settings.EMBEDDING_PROVIDER,
                "model": self.model,
                "base_url": self.base_url,
                "dimensions": self.dimensions,
                "latency_ms": latency_ms,
            }
        except Exception as e:
            return {
                "status": "error",
                "provider": settings.EMBEDDING_PROVIDER,
                "model": self.model,
                "error": str(e),
            }


# Singleton
embedding_client = EmbeddingClient()
