"""ChromaAdapter — implements IVectorStore using local ChromaDB."""
from __future__ import annotations
import chromadb
from chromadb.config import Settings as ChromaSettings
from config import settings


class ChromaAdapter:
    """Local persistent ChromaDB. Swap for Pinecone by implementing IVectorStore."""

    def __init__(self, collection_name: str = "xauusd_trades"):
        self._client = chromadb.PersistentClient(
            path=settings.chroma_path,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._col = self._client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def upsert(self, id: str, embedding: list[float], metadata: dict, document: str) -> None:
        self._col.upsert(
            ids=[id],
            embeddings=[embedding],
            metadatas=[metadata],
            documents=[document],
        )

    def query(self, embedding: list[float], top_k: int = 5) -> list[dict]:
        results = self._col.query(
            query_embeddings=[embedding],
            n_results=min(top_k, self._col.count() or 1),
            include=["metadatas", "documents", "distances"],
        )
        hits = []
        for i, meta in enumerate(results["metadatas"][0]):
            hits.append({
                "id": results["ids"][0][i],
                "metadata": meta,
                "document": results["documents"][0][i],
                "score": 1 - results["distances"][0][i],   # cosine sim
            })
        return hits
