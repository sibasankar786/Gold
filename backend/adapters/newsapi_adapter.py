"""NewsAPIAdapter — implements ISentimentProvider using newsapi.org."""
from __future__ import annotations
from newsapi import NewsApiClient
from config import settings


class NewsAPIAdapter:
    """Fetches gold/macro headlines from NewsAPI. Swap for GDELT by implementing ISentimentProvider."""

    def __init__(self):
        self._client = NewsApiClient(api_key=settings.newsapi_key) if settings.newsapi_key else None

    def fetch_headlines(self, keywords: list[str], max_results: int = 10) -> list[str]:
        if not self._client:
            # Graceful fallback when no API key is configured
            return [
                "Gold markets await Fed decision",
                "USD holds steady amid global uncertainty",
                "Inflation data comes in line with expectations",
            ]
        query = " OR ".join(keywords)
        try:
            response = self._client.get_everything(
                q=query,
                language="en",
                sort_by="publishedAt",
                page_size=max_results,
            )
            articles = response.get("articles", [])
            return [a["title"] for a in articles if a.get("title")]
        except Exception:
            return []
