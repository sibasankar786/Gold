"""RAGStore — embeds trade documents and upserts them into the vector store."""
from __future__ import annotations
from interfaces.llm_provider import ILLMProvider
from interfaces.vector_store import IVectorStore
from db.schemas import Trade


def _trade_to_document(trade: Trade) -> str:
    """Serialize a trade into a descriptive text for embedding."""
    return (
        f"Pair: {trade.pair} | Session: {trade.session} | Setup: {trade.setup_type} | "
        f"Bias: {trade.bias} | Entry: {trade.entry} | SL: {trade.sl} | TP: {trade.tp} | "
        f"Outcome: {trade.outcome} | RR: {trade.rr} | Notes: {trade.notes or 'N/A'}"
    )


def _trade_to_metadata(trade: Trade) -> dict:
    return {
        "pair":       trade.pair,
        "session":    trade.session,
        "setup_type": trade.setup_type,
        "bias":       trade.bias,
        "outcome":    trade.outcome,
        "rr":         str(trade.rr or ""),
        "timestamp":  str(trade.timestamp),
    }


class RAGStore:
    def __init__(self, llm: ILLMProvider, vector_store: IVectorStore):
        self._llm = llm
        self._vs = vector_store

    def store_trade(self, trade: Trade) -> None:
        """Embed and store a trade in the vector database."""
        document = _trade_to_document(trade)
        embedding = self._llm.embed(document)
        metadata = _trade_to_metadata(trade)
        self._vs.upsert(
            id=trade.id,
            embedding=embedding,
            metadata=metadata,
            document=document,
        )
