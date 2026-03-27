"""LangGraph nodes — each node receives state, does one job, returns partial state update."""
from __future__ import annotations
import json
from graph.state import TradingState
from interfaces.market_data import IMarketDataProvider
from interfaces.llm_provider import ILLMProvider
from rag.rag_retriever import RAGRetriever
from engines.feature_extractor import extract_features
from engines.risk_engine import calculate_lot_size, check_daily_limits, validate_rr
from engines.sentiment_engine import SentimentEngine
from config import settings


# ─── Node factory — inject dependencies ────────────────────────────────────────

def make_market_data_node(market: IMarketDataProvider):
    def market_data_node(state: TradingState) -> dict:
        candles = market.fetch_ohlc(
            settings.market_symbol,
            settings.market_timeframe,
            settings.market_bars,
        )
        session = market.get_current_session()
        return {"ohlc_data": candles, "current_session": session}
    return market_data_node


def make_feature_extraction_node():
    def feature_extraction_node(state: TradingState) -> dict:
        features = extract_features(state["ohlc_data"], state["current_session"])
        return {"features": features}
    return feature_extraction_node


def make_rag_retrieval_node(retriever: RAGRetriever):
    def rag_retrieval_node(state: TradingState) -> dict:
        similar = retriever.find_similar_trades(state["features"], top_k=5)
        return {"similar_trades": similar}
    return rag_retrieval_node


def make_sentiment_node(sentiment_engine: SentimentEngine):
    def sentiment_node(state: TradingState) -> dict:
        sentiment = sentiment_engine.get_sentiment()
        return {"sentiment": sentiment}
    return sentiment_node


def make_bias_fusion_node(llm: ILLMProvider):
    _FUSION_PROMPT = """You are a gold trading analyst.

Current technical features:
{features}

Similar historical trades (RAG memory):
{similar_trades}

Current macro sentiment:
{sentiment}

Based on ALL signals, output trading bias analysis in JSON:
{{
  "bias": "Bullish" | "Bearish" | "Neutral",
  "confidence": 0.0-1.0,
  "conflict": true | false,
  "entry_zone": "approximate price level",
  "stop_loss": "approximate price level",
  "take_profit": "approximate price level",
  "reasoning": "concise explanation"
}}

Rules:
- conflict = true if technical and sentiment disagree
- confidence should reflect strength of alignment
- if conflict is true, bias confidence should be <= 0.55"""

    def bias_fusion_node(state: TradingState) -> dict:
        prompt = _FUSION_PROMPT.format(
            features=json.dumps(state["features"], indent=2),
            similar_trades=json.dumps(
                [t.get("metadata", {}) for t in state["similar_trades"]], indent=2
            ),
            sentiment=json.dumps(state["sentiment"], indent=2),
        )
        try:
            raw = llm.complete(prompt)
            result = json.loads(raw)
        except Exception as e:
            print(f"[ERROR] Bias Fusion Node failed: {e}")
            # SMART FALLBACK: If LLM fails (likely 429), use technical summary
            f = state["features"]
            trend = f.get("bias", "Neutral")
            rsi = f.get("rsi", 50)
            
            # Simple heuristic
            bias = trend
            if rsi > 70: bias = "Neutral (Overbought)"
            elif rsi < 30: bias = "Neutral (Oversold)"
            
            result = {
                "bias": bias,
                "confidence": 0.45,
                "conflict": True,
                "entry_zone": f.get("zones", ["N/A"])[0],
                "stop_loss": "N/A",
                "take_profit": "N/A",
                "reasoning": f"FALLBACK: AI Rate Limited (429). Using Technical Bias: {trend}. RSI: {rsi:.1f}. Check your Gemini API Quota."
            }
        
        return {
            "bias":       result.get("bias", "Neutral"),
            "confidence": result.get("confidence", 0.5),
            "conflict":   result.get("conflict", False),
            "features": {
                **state["features"],
                "entry_zone":  result.get("entry_zone", "N/A"),
                "stop_loss":   result.get("stop_loss", "N/A"),
                "take_profit": result.get("take_profit", "N/A"),
                "reasoning":   result.get("reasoning", ""),
            },
        }
    return bias_fusion_node


def make_risk_manager_node():
    def risk_manager_node(state: TradingState) -> dict:
        limit_check = check_daily_limits(
            state.get("daily_trades", 0),
            state.get("daily_loss_pct", 0.0),
        )
        # Parse SL pip distance from features
        last_close = state["features"].get("last_close", 0)
        atr = state["features"].get("atr", 10)
        sl_pips = round(atr * 1.5, 2)
        lot = calculate_lot_size(
            state.get("balance", 10000),
            state.get("risk_pct", settings.default_risk_pct),
            sl_pips,
        )
        return {
            "risk_check": {
                **limit_check,
                "lot_size": lot,
                "sl_pips":  sl_pips,
            }
        }
    return risk_manager_node


def make_decision_output_node():
    def decision_output_node(state: TradingState) -> dict:
        risk   = state.get("risk_check", {})
        feat   = state.get("features", {})
        sent   = state.get("sentiment", {})
        conf   = state.get("confidence", 0.5)
        bias   = state.get("bias", "Neutral")
        conflict = state.get("conflict", False)

        if not risk.get("allowed", True):
            recommendation = "avoid"
        elif conf < 0.55 or conflict:
            recommendation = "wait"
        else:
            recommendation = "take"

        decision = {
            "bias":           bias,
            "confidence":     round(conf, 2),
            "sentiment_bias": sent.get("macro_bias", "neutral"),
            "conflict":       conflict,
            "recommendation": recommendation,
            "entry_zone":     feat.get("entry_zone", "N/A"),
            "stop_loss":      feat.get("stop_loss", "N/A"),
            "take_profit":    feat.get("take_profit", "N/A"),
            "risk_percent":   state.get("risk_pct", settings.default_risk_pct),
            "lot_size":       risk.get("lot_size", 0.01),
            "reasoning":      feat.get("reasoning", "Analysis complete."),
            "risk_reason":    risk.get("reason", ""),
        }
        return {"decision": decision}
    return decision_output_node
