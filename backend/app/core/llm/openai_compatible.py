import json
from typing import Any

from openai import AsyncOpenAI

from app.core.llm.base import BaseLLMProvider


class OpenAICompatibleProvider(BaseLLMProvider):
    """
    Works with any OpenAI-compatible endpoint:
      - OpenRouter  (https://openrouter.ai/api/v1)
      - GitHub Models (https://models.inference.ai.azure.com)
      - OpenAI      (https://api.openai.com/v1)
      - local Ollama (http://localhost:11434/v1)
    """

    def __init__(self, base_url: str, api_key: str, model: str) -> None:
        self.model = model
        self._client = AsyncOpenAI(base_url=base_url, api_key=api_key)

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        response_format: dict | None = None,
    ) -> str:
        kwargs: dict[str, Any] = dict(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        if response_format:
            kwargs["response_format"] = response_format

        resp = await self._client.chat.completions.create(**kwargs)
        return resp.choices[0].message.content or ""

    async def chat_json(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        max_tokens: int = 2048,
    ) -> dict[str, Any]:
        """
        Forces JSON output — injects a system instruction if not already present,
        then parses and returns the dict.
        """
        # Ensure the last system message requests JSON
        patched = list(messages)
        if not any(
            "json" in m.get("content", "").lower()
            for m in patched
            if m["role"] == "system"
        ):
            patched.insert(
                0,
                {
                    "role": "system",
                    "content": "You must respond with valid JSON only. No markdown, no explanation.",
                },
            )

        raw = await self.chat(
            patched,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )

        # Strip markdown fences if model ignores response_format
        raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(raw)
