"""autotrader.py — Autonomous Trading Engine.

Handles the periodic analysis loop and trade execution logic.
"""
from __future__ import annotations
import asyncio
from typing import TYPE_CHECKING
from graph.workflow import run_analysis
from config import settings

if TYPE_CHECKING:
    from interfaces.trader import ITrader

class AutoTrader:
    def __init__(self, trader: ITrader, interval_sec: int = 120):
        self._trader = trader
        self._interval = interval_sec
        self._enabled = False
        self._task = None
        self._last_decision = {}

    def start(self):
        if self._enabled: return
        self._enabled = True
        self._task = asyncio.create_task(self._loop())
        print("[AUTOTRADER] Started.")

    def stop(self):
        self._enabled = False
        if self._task:
            self._task.cancel()
        print("[AUTOTRADER] Stopped.")

    def is_running(self) -> bool:
        return self._enabled

    async def _loop(self):
        while self._enabled:
            try:
                await self._run_iteration()
            except Exception as e:
                print(f"[AUTOTRADER] Error in iteration: {e}")
            
            await asyncio.sleep(self._interval)

    async def _run_iteration(self):
        # 1. Check Capacity (Max 20 concurrent trades)
        positions = self._trader.get_open_positions(symbol=settings.market_symbol)
        print(f"[AUTOTRADER] Current positions: {len(positions)}/20")
        if len(positions) >= 20:
            print(f"[AUTOTRADER] Capacity reached ({len(positions)}/20). Skipping.")
            return

        # 2. Run LangGraph Analysis
        params = {
            "balance": 10000, 
            "risk_pct": 1.0,
        }
        
        print(f"[AUTOTRADER] Running periodic analysis... (Existing: {len(positions)})")
        decision = await run_analysis(params)
        self._last_decision = decision
        
        # 3. Execution Logic
        bias = decision.get("bias", "Neutral")
        confidence = decision.get("confidence", 0)
        rec = decision.get("recommendation", "wait")
        
        print(f"[AUTOTRADER] Signal: {bias} (Conf: {confidence:.2f}) -> {rec}")

        # Safety Gate: High confidence requirement for auto-trading
        if rec == "take" and confidence >= 0.70:
            # --- Spread Filter ---
            spread = self._trader.get_spread(settings.market_symbol)
            if spread > settings.max_spread:
                print(f"[AUTOTRADER] Spread too high ({spread} > {settings.max_spread}). Skipping trade.")
                return
            
            # Check if we already have too many trades from the same side or too many in total
            # For now, just follow the 20 limit already checked.
            
            lot = decision.get("lot_size", 0.01)
            sl = float(decision.get("stop_loss", 0))
            tp = float(decision.get("take_profit", 0))
            
            print(f"[AUTOTRADER] EXECUTION TRIGGERED: {bias} {lot} lots SL={sl} TP={tp}")
            
            if settings.auto_trade_trial_mode:
                print(f"[AUTOTRADER] TRIAL MODE ACTIVE: Skipping real MT5 execution.")
                # Simulate a success result for the journal
                result = {
                    "status": "success", 
                    "price": self._trader.get_current_price(settings.market_symbol),
                    "trial": True
                }
            else:
                result = self._trader.execute_order(
                    symbol=settings.market_symbol,
                    lot=lot,
                    side="BUY" if bias == "Bullish" else "SELL",
                    sl=sl,
                    tp=tp
                )
            
            if result.get("status") == "success":
                # Auto-journal the trade with reasoning
                from rag.rag_store import RAGStore
                from adapters.chroma_adapter import ChromaAdapter
                from adapters.gemini_adapter import GeminiAdapter
                
                # We need a store instance (ideally injected)
                # For now, we'll use the one from main or re-init if needed
                # Note: In production, we'd inject this via constructor
                try:
                    from graph.workflow import rag_store
                    is_trial = result.get("trial", False)
                    trade_data = {
                        "pair":           settings.market_symbol,
                        "entry":          result.get("price"),
                        "sl":             sl,
                        "tp":             tp,
                        "session":        "Auto",
                        "setup_type":     "Trial AI" if is_trial else "AI Signal",
                        "bias":           bias,
                        "spread":         spread,
                        "notes":          f"{'[TRIAL] ' if is_trial else ''}AUTO-TRADE: {decision.get('reasoning')}",
                        "outcome":        "Pending"
                    }
                    rag_store.add_trade(trade_data)
                    print(f"[AUTOTRADER] Trade journaled successfully.")
                except Exception as je:
                    print(f"[ERROR] Auto-journaling failed: {je}")

    def get_last_decision(self) -> dict:
        return self._last_decision
