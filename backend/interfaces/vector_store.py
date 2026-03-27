"""IVectorStore — abstract interface for any vector database."""
from typing import Protocol, runtime_checkable


@runtime_checkable
class IVectorStore(Protocol):
    def upsert(self, id: str, embedding: list[float], metadata: dict, document: str) -> None:
        """Store an embedding with metadata."""
        ...

    def query(self, embedding: list[float], top_k: int = 5) -> list[dict]:
        """Return top-k nearest neighbours as list of {id, metadata, score, document}."""
        ...
