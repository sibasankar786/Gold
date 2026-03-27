"""OpenAIAdapter — implements ILLMProvider using OpenAI API."""
from __future__ import annotations
from openai import OpenAI
from config import settings


class OpenAIAdapter:
    """Concrete LLM provider using OpenAI. Swap for Claude/Ollama by implementing ILLMProvider."""

    def __init__(self, api_key: str = None):
        self._api_key = api_key or settings.openai_api_key
        self._client = OpenAI(api_key=self._api_key)
        self._model = settings.llm_model
        self._embed_model = settings.embed_model

    def complete(self, prompt: str, system: str = "You are an expert XAUUSD trading analyst.") -> str:
        response = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.2,
            max_tokens=800,
        )
        return response.choices[0].message.content or ""

    def embed(self, text: str) -> list[float]:
        response = self._client.embeddings.create(
            model=self._embed_model,
            input=text,
        )
        return response.data[0].embedding
