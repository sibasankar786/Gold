"""ISentimentProvider — abstract interface for any news/sentiment data source."""
from typing import Protocol, runtime_checkable


@runtime_checkable
class ISentimentProvider(Protocol):
    def fetch_headlines(self, keywords: list[str], max_results: int = 10) -> list[str]:
        """Return a list of recent news headline strings matching the keywords."""
        ...
