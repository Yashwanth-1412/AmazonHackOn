"""Quick test for the LLM provider — run with: uv run python test_llm.py"""

import asyncio
from app.core.config import settings
from app.core.llm.openai_compatible import OpenAICompatibleProvider


async def main():
    print(f"Provider : {settings.LLM_PROVIDER}")
    print(f"Base URL : {settings.LLM_BASE_URL}")
    print(f"Model    : {settings.LLM_MODEL}")
    print("-" * 40)

    llm = OpenAICompatibleProvider(
        base_url=settings.LLM_BASE_URL,
        api_key=settings.LLM_API_KEY,
        model=settings.LLM_MODEL,
    )

    # ── Test 1: plain chat ────────────────────────────────────────────────────
    print("\n[Test 1] Plain chat...")
    response = await llm.chat([
        {"role": "system", "content": "You are a helpful assistant. Be very brief."},
        {"role": "user",   "content": "Say hello in Hindi in one line."},
    ])
    print(f"Response : {response}")

    # ── Test 2: JSON output ───────────────────────────────────────────────────
    print("\n[Test 2] JSON output...")
    data = await llm.chat_json([
        {
            "role": "system",
            "content": (
                "You are a shopping assistant for Amazon Now India. "
                "Return a JSON object with keys: intent (string), "
                "items (array of strings), urgency (low|medium|high)."
            ),
        },
        {"role": "user", "content": "Milk khatam ho gaya, jaldi chahiye"},
    ])
    print(f"Response : {data}")

    print("\n✓ All tests passed")


if __name__ == "__main__":
    asyncio.run(main())
