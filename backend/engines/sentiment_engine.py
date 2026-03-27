"""SentimentEngine — fetches gold news headlines and classifies macro bias using LLM."""
from __future__ import annotations
import json
from datetime import datetime, timedelta, timezone
from interfaces.llm_provider import ILLMProvider
from interfaces.sentiment_provider import ISentimentProvider


_GOLD_KEYWORDS = ["gold", "XAUUSD", "Fed", "Federal Reserve", "inflation", "CPI", "USD", "recession", "interest rate"]

_SENTIMENT_PROMPT = """You are a gold (XAUUSD) market analyst.

Based on these recent news headlines, determine the macro sentiment for gold.

Headlines:
{headlines}

Respond in JSON format only:
{{
  "macro_bias": "bullish_gold" | "bearish_gold" | "neutral",
  "confidence": 0.0-1.0,
  "drivers": ["reason 1", "reason 2", "reason 3"],
  "raw_sentiment": "one sentence summary"
}}"""


class _SentimentCache:
    def __init__(self, ttl_minutes: int = 60):
        self._data: dict | None = None
        self._expires: datetime | None = None
        self._ttl = timedelta(minutes=ttl_minutes)

    def get(self) -> dict | None:
        if self._data and self._expires and datetime.now(timezone.utc) < self._expires:
            return self._data
        return None

    def set(self, data: dict):
        self._data = data
        self._expires = datetime.now(timezone.utc) + self._ttl


class SentimentEngine:
    def __init__(self, llm: ILLMProvider, news: ISentimentProvider):
        self._llm = llm
        self._news = news
        self._cache = _SentimentCache(ttl_minutes=60)

    def get_sentiment(self) -> dict:
        """Returns cached macro sentiment or fetches fresh. TTL = 60 minutes."""
        cached = self._cache.get()
        if cached:
            return cached

        headlines = self._news.fetch_headlines(_GOLD_KEYWORDS, max_results=10)
        if not headlines:
            result = {"macro_bias": "neutral", "confidence": 0.5, "drivers": [], "raw_sentiment": "No news available"}
            self._cache.set(result)
            return result

        prompt = _SENTIMENT_PROMPT.format(headlines="\n".join(f"- {h}" for h in headlines))
        try:
            raw = self._llm.complete(prompt)
            result = json.loads(raw)
        except Exception:
            result = {"macro_bias": "neutral", "confidence": 0.5, "drivers": headlines[:3], "raw_sentiment": "Parse error"}

        self._cache.set(result)
        return result
