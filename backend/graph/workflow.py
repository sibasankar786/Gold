"""workflow.py — assembles and compiles the LangGraph decision pipeline.

Dependency injection happens here — only this file ever touches concrete adapters.
"""
from __future__ import annotations
from langgraph.graph import StateGraph, END
from graph.state import TradingState
from graph.nodes import (
    make_market_data_node,
    make_feature_extraction_node,
    make_rag_retrieval_node,
    make_sentiment_node,
    make_bias_fusion_node,
    make_risk_manager_node,
    make_decision_output_node,
)
from adapters.yfinance_adapter import YFinanceAdapter
from adapters.gemini_adapter import GeminiAdapter
from adapters.chroma_adapter import ChromaAdapter
from adapters.newsapi_adapter import NewsAPIAdapter
from rag.rag_store import RAGStore
from rag.rag_retriever import RAGRetriever
from engines.sentiment_engine import SentimentEngine
from config import settings


# ── Instantiate adapters (one instance shared across requests) ─────────────────
# --- Dependency Injection Root ---
print(f"[DEBUG] Resolved GEMINI_MODEL: {settings.gemini_model}")
print(f"[DEBUG] Resolved GEMINI_EMBED_MODEL: {settings.gemini_embed_model}")

# Primary LLM Provider (Gemini for Free Tier support)
if settings.gemini_api_key:
    _llm = GeminiAdapter(
        api_key=settings.gemini_api_key,
        model_name=settings.gemini_model,
        embed_model=settings.gemini_embed_model
    )
else:
    # Fallback to OpenAI if no Gemini key but OpenAI key exists
    from adapters.openai_adapter import OpenAIAdapter
    _llm = OpenAIAdapter(api_key=settings.openai_api_key)

# Market Data Provider selection
if settings.market_data_provider.lower() == "mt5":
    try:
        from adapters.mt5_adapter import MT5Adapter
        market_adapter = MT5Adapter()
        print("[INFO] Using MetaTrader 5 (MT5) Market Data Provider")
    except Exception as e:
        print(f"[WARNING] MT5 initialization failed, falling back to YFinance: {e}")
        market_adapter = YFinanceAdapter()
else:
    market_adapter = YFinanceAdapter()
    print("[INFO] Using YFinance Market Data Provider")

_vector = ChromaAdapter()
_news = NewsAPIAdapter()

# ── Build higher-level engines from adapters ───────────────────────────────────
_retriever = RAGRetriever(llm=_llm, vector_store=_vector)
sentiment_engine = SentimentEngine(llm=_llm, news=_news)

# ── Export store for use by routes ─────────────────────────────────────────────
rag_store   = RAGStore(llm=_llm, vector_store=_vector)


# ── Build graph ────────────────────────────────────────────────────────────────
def _build_graph():
    builder = StateGraph(TradingState)

    builder.add_node("market_data",       make_market_data_node(market_adapter))
    builder.add_node("feature_extraction", make_feature_extraction_node())
    builder.add_node("rag_retrieval",     make_rag_retrieval_node(_retriever))
    builder.add_node("sentiment",         make_sentiment_node(sentiment_engine))
    builder.add_node("bias_fusion",       make_bias_fusion_node(_llm))
    builder.add_node("risk_manager",      make_risk_manager_node())
    builder.add_node("decision_output",   make_decision_output_node())

    builder.set_entry_point("market_data")
    builder.add_edge("market_data",        "feature_extraction")
    builder.add_edge("feature_extraction", "rag_retrieval")
    builder.add_edge("rag_retrieval",      "sentiment")
    builder.add_edge("sentiment",          "bias_fusion")
    builder.add_edge("bias_fusion",        "risk_manager")
    builder.add_edge("risk_manager",       "decision_output")
    builder.add_edge("decision_output",    END)

    return builder.compile()


_graph = _build_graph()


async def run_analysis(params: dict) -> dict:
    """
    Entry point for the FastAPI /analyze route.
    params: {balance, risk_pct, daily_trades, daily_loss_pct}
    """
    initial_state: TradingState = {
        "balance":        params.get("balance", 10000),
        "risk_pct":       params.get("risk_pct", 0.5),
        "daily_trades":   params.get("daily_trades", 0),
        "daily_loss_pct": params.get("daily_loss_pct", 0.0),
        "ohlc_data":      [],
        "current_session": "",
        "features":       {},
        "similar_trades": [],
        "sentiment":      {},
        "bias":           "Neutral",
        "confidence":     0.5,
        "conflict":       False,
        "risk_check":     {},
        "decision":       {},
    }
    final_state = await _graph.ainvoke(initial_state)
    return final_state["decision"]
