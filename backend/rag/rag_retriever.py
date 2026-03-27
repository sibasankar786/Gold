"""RAGRetriever — fetches semantically similar historical trades."""
from __future__ import annotations
from interfaces.llm_provider import ILLMProvider
from interfaces.vector_store import IVectorStore


class RAGRetriever:
    def __init__(self, llm: ILLMProvider, vector_store: IVectorStore):
        self._llm = llm
        self._vs = vector_store

    def find_similar_trades(self, query_snapshot: dict, top_k: int = 5) -> list[dict]:
        """
        Given the current market context dict, embed it as a query
        and return the most similar historical trades.
        """
        query_text = (
            f"Session: {query_snapshot.get('session', '')} | "
            f"Setup: {query_snapshot.get('setup_type', '')} | "
            f"Bias: {query_snapshot.get('bias', '')} | "
            f"Structure: {query_snapshot.get('structure', '')}"
        )
        embedding = self._llm.embed(query_text)
        return self._vs.query(embedding, top_k=top_k)
