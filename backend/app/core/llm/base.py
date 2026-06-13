from abc import ABC, abstractmethod
from typing import Any


class BaseLLMProvider(ABC):
    """All LLM providers must implement this interface."""

    @abstractmethod
    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        response_format: dict | None = None,
    ) -> str:
        """Send messages, return assistant text."""
        ...

    @abstractmethod
    async def chat_json(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        max_tokens: int = 2048,
    ) -> dict[str, Any]:
        """Send messages, return parsed JSON dict."""
        ...
