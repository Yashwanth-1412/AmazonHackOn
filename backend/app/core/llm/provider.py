"""
Factory — reads env config and returns the correct provider.

Usage anywhere in the app:
    from app.core.llm.provider import llm
    response = await llm.chat([{"role": "user", "content": "Hello"}])
"""

from functools import lru_cache

from app.core.config import settings
from app.core.llm.base import BaseLLMProvider
from app.core.llm.openai_compatible import OpenAICompatibleProvider

# ── Provider registry ─────────────────────────────────────────────────────────
# Add new providers here as needed (e.g. BedrockProvider, VertexProvider)
_OPENAI_COMPATIBLE = {"openrouter", "github", "openai", "ollama", "groq", "together"}


@lru_cache(maxsize=1)
def get_llm_provider() -> BaseLLMProvider:
    provider = settings.LLM_PROVIDER.lower()

    if provider in _OPENAI_COMPATIBLE:
        return OpenAICompatibleProvider(
            base_url=settings.LLM_BASE_URL,
            api_key=settings.LLM_API_KEY,
            model=settings.LLM_MODEL,
        )

    raise ValueError(
        f"Unknown LLM_PROVIDER '{provider}'. "
        f"Supported: {sorted(_OPENAI_COMPATIBLE)}"
    )


# Singleton — import this directly
llm: BaseLLMProvider = get_llm_provider()
