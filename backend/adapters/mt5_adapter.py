"""MT5Adapter — implements IMarketDataProvider using MetaTrader 5 terminal."""
from __future__ import annotations
import MetaTrader5 as mt5
import pandas as pd
from datetime import datetime, timezone
from interfaces.market_data import IMarketDataProvider


# Timeframe mapping for MT5
_TIMEFRAME_MAP = {
    "1m":  mt5.TIMEFRAME_M1,
    "5m":  mt5.TIMEFRAME_M5,
    "15m": mt5.TIMEFRAME_M15,
    "1h":  mt5.TIMEFRAME_H1,
    "4h":  mt5.TIMEFRAME_H4,
    "1d":  mt5.TIMEFRAME_D1,
}

_SESSION_WINDOWS = {
    "Asia":    (0,   8),   # UTC hours
    "London":  (7,  16),
    "NewYork": (12, 21),
}

class MT5Adapter:
    """Concrete market data provider using MetaTrader 5 terminal."""

    def __init__(self):
        self._initialized = False
        self._ensure_initialized()

    def _ensure_initialized(self):
        if not self._initialized:
            if not mt5.initialize():
                print(f"[ERROR] MT5 failing to initialize: {mt5.last_error()}")
                return False
            self._initialized = True
        return True

    def fetch_ohlc(self, symbol: str, timeframe: str, bars: int) -> list[dict]:
        if not self._ensure_initialized(): return []
        mt5.symbol_select(symbol, True)
        tf = _TIMEFRAME_MAP.get(timeframe, mt5.TIMEFRAME_M1)
        rates = mt5.copy_rates_from_pos(symbol, tf, 0, bars)
        return self._process_rates(rates, symbol)

    def fetch_ohlc_range(self, symbol: str, timeframe: str, start_dt: datetime, end_dt: datetime) -> list[dict]:
        if not self._ensure_initialized(): return []
        
        selected = mt5.symbol_select(symbol, True)
        if not selected:
            print(f"[ERROR] MT5 failed to select symbol '{symbol}': {mt5.last_error()}")
            # We don't return early here as some versions of MT5 might still work if it was already selected
            
        tf = _TIMEFRAME_MAP.get(timeframe, mt5.TIMEFRAME_M1)
        
        # Ensure dates are aware if needed, or naive in local time as MT5 usually handles locally
        rates = mt5.copy_rates_range(symbol, tf, start_dt, end_dt)
        return self._process_rates(rates, symbol)

    def _process_rates(self, rates, symbol: str) -> list[dict]:
        if rates is None:
            print(f"[ERROR] MT5 failed to fetch rates for {symbol}: {mt5.last_error()}")
            return []

        df = pd.DataFrame(rates)
        df['time'] = pd.to_datetime(df['time'], unit='s')
        
        candles = []
        for _, row in df.iterrows():
            candles.append({
                "timestamp": str(row["time"]),
                "open":  round(float(row["open"]), 2),
                "high":  round(float(row["high"]), 2),
                "low":   round(float(row["low"]), 2),
                "close": round(float(row["close"]), 2),
                "volume": float(row["tick_volume"]),
            })
        return candles


    def get_current_session(self) -> str:
        hour = datetime.now(timezone.utc).hour
        for session, (start, end) in _SESSION_WINDOWS.items():
            if start <= hour < end:
                return session
        return "Off"

    def get_current_price(self, symbol: str) -> float:
        if not self._ensure_initialized(): return 0.0
        
        tick = mt5.symbol_info_tick(symbol)
        if tick is None:
            print(f"[ERROR] MT5 failed to fetch tick for {symbol}: {mt5.last_error()}")
            return 0.0
            
        return round(float(tick.bid), 2)

    def get_spread(self, symbol: str) -> float:
        """Returns current spread (Ask - Bid) for the symbol."""
        if not self._ensure_initialized(): return 999.0  # High spread on failure
        
        tick = mt5.symbol_info_tick(symbol)
        if tick is None: return 999.0
        
        spread = tick.ask - tick.bid
        return round(float(spread), 2)

    def execute_order(self, symbol: str, lot: float, side: str, sl: float = 0, tp: float = 0) -> dict:
        """Executes a Market Order on MT5."""
        if not self._ensure_initialized(): return {"status": "error", "message": "MT5 Not Initialized"}
        
        # 1. Prepare request
        order_type = mt5.ORDER_TYPE_BUY if side.lower() == "buy" else mt5.ORDER_TYPE_SELL
        price = mt5.symbol_info_tick(symbol).ask if side.lower() == "buy" else mt5.symbol_info_tick(symbol).bid
        
        request = {
            "action":       mt5.TRADE_ACTION_DEAL,
            "symbol":       symbol,
            "volume":       float(lot),
            "type":         order_type,
            "price":        float(price),
            "sl":           float(sl),
            "tp":           float(tp),
            "deviation":    10,
            "magic":        123456,
            "comment":      "AstraTrade AI Auto-Trade",
            "type_time":    mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        # 2. Send order
        result = mt5.order_send(request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            print(f"[ERROR] Order failed: {result.comment} (Code: {result.retcode})")
            return {"status": "error", "message": result.comment, "code": result.retcode}
            
        print(f"[SUCCESS] Order Executed: {side} {lot} {symbol} (Ticket: {result.order})")
        return {"status": "success", "ticket": result.order, "price": result.price}

    def get_open_positions(self, symbol: str = None) -> list[dict]:
        """Returns active positions on MT5."""
        if not self._ensure_initialized(): return []
        
        positions = mt5.positions_get(symbol=symbol) if symbol else mt5.positions_get()
        if positions is None: return []
        
        results = []
        for p in positions:
            results.append({
                "ticket": p.ticket,
                "symbol": p.symbol,
                "type": "BUY" if p.type == mt5.POSITION_TYPE_BUY else "SELL",
                "volume": p.volume,
                "price_open": p.price_open,
                "sl": p.sl,
                "tp": p.tp,
                "profit": p.profit
            })
        return results

    def close_position(self, ticket: int) -> bool:
        """Closes a position by ticket."""
        if not self._ensure_initialized(): return False
        
        positions = mt5.positions_get(ticket=ticket)
        if not positions: return False
        
        p = positions[0]
        symbol = p.symbol
        lot = p.volume
        side = mt5.ORDER_TYPE_SELL if p.type == mt5.POSITION_TYPE_BUY else mt5.ORDER_TYPE_BUY
        price = mt5.symbol_info_tick(symbol).bid if p.type == mt5.POSITION_TYPE_BUY else mt5.symbol_info_tick(symbol).ask
        
        request = {
            "action":       mt5.TRADE_ACTION_DEAL,
            "symbol":       symbol,
            "volume":       float(lot),
            "type":         side,
            "position":     ticket,
            "price":        float(price),
            "deviation":    10,
            "magic":        123456,
            "comment":      "AstraTrade AI Auto-Close",
            "type_time":    mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        result = mt5.order_send(request)
        return result.retcode == mt5.TRADE_RETCODE_DONE
