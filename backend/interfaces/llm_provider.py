"""ILLMProvider — abstract interface for any LLM backend."""
from typing import Protocol, runtime_checkable


@runtime_checkable
class ILLMProvider(Protocol):
    def complete(self, prompt: str, system: str = "") -> str:
        """Send a prompt and return the text completion."""
        ...

    def embed(self, text: str) -> list[float]:
        """Return an embedding vector for the given text."""
        ...
