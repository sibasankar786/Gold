from typing import List, Dict, Optional
import random

class Trade:
    def __init__(self, entry_price: float, side: str, strategy: str, entry_time: str, 
                 sl: Optional[float] = None, tp: Optional[float] = None,
                 shadow_level: float = 0.0, bos_price: float = 0.0, red_bar_size: float = 0.0):
        self.entry_price = entry_price
        self.side = side # 'BUY' or 'SELL'
        self.strategy = strategy
        self.entry_time = entry_time
        self.sl = sl # Optional
        self.tp = tp # Optional
        
        # Audit Fields
        self.shadow_level = shadow_level
        self.bos_price = bos_price
        self.red_bar_size = red_bar_size
        self.exit_price: Optional[float] = None
        self.exit_time: Optional[str] = None
        self.pnl: float = 0.0
        self.status = "OPEN" # "OPEN", "CLOSED"
        self.peak_price = entry_price if side == 'BUY' else 0.0
        self.lowest_price = entry_price if side == 'SELL' else 999999.0
        self.trailing_active = False

        self.exit_reason: Optional[str] = None


class TradeSimulator:
    """
    Manages active trades, applying spread, slippage, and trailing stop logic.
    """
    
    def __init__(self, spread: float = 0.3, slippage_max: float = 0.2, 
                 trailing_activation: float = 2.0, trailing_distance: float = 1.0):
        self.spread = spread
        self.slippage_max = slippage_max
        self.trailing_activation = trailing_activation
        self.trailing_distance = trailing_distance
        self.active_trades: List[Trade] = []
        self.closed_trades: List[Trade] = []

    def open_trade(self, price: float, side: str, strategy: str, timestamp: str, 
                   sl: Optional[float] = None, tp: Optional[float] = None,
                   shadow_level: float = 0.0, bos_price: float = 0.0, red_bar_size: float = 0.0) -> Trade:
        # Apply Spread and Slippage at entry
        slippage = random.uniform(0, self.slippage_max)
        if side == 'BUY':
            entry_price = price + self.spread + slippage
        else:
            entry_price = price - self.spread - slippage
            
        new_trade = Trade(entry_price, side, strategy, timestamp, sl, tp,
                          shadow_level=shadow_level, bos_price=bos_price, red_bar_size=red_bar_size)
        self.active_trades.append(new_trade)
        return new_trade

    def update(self, candle: Dict):
        """
        Updates active trades against the current M1 candle.
        """
        for trade in list(self.active_trades):
            if trade.status == "CLOSED":
                continue
            
            # 1. Update Peak/Lowest for trailing stop
            if trade.side == 'BUY':
                if candle['high'] > trade.peak_price:
                    trade.peak_price = candle['high']
                if not trade.trailing_active and trade.peak_price >= trade.entry_price + self.trailing_activation:
                    trade.trailing_active = True
            else:
                if candle['low'] < trade.lowest_price:
                    trade.lowest_price = candle['low']
                if not trade.trailing_active and trade.lowest_price <= trade.entry_price - self.trailing_activation:
                    trade.trailing_active = True

            # 2. Check Exit Conditions
            exit_price = None
            reason = ""
            
            if trade.side == 'BUY':
                # TP Hit (if exists)
                if trade.tp and candle['high'] >= trade.tp:
                    exit_price = trade.tp
                    reason = "TP"
                # SL Hit (if exists)
                elif trade.sl and candle['low'] <= trade.sl:
                    exit_price = trade.sl
                    reason = "SL"
                # Trailing Hit
                elif trade.trailing_active and candle['low'] <= trade.peak_price - self.trailing_distance:
                    exit_price = trade.peak_price - self.trailing_distance
                    reason = "Trailing"
            else:
                # TP Hit (if exists)
                if trade.tp and candle['low'] <= trade.tp:
                    exit_price = trade.tp
                    reason = "TP"
                # SL Hit (if exists)
                elif trade.sl and candle['high'] >= trade.sl:
                    exit_price = trade.sl
                    reason = "SL"
                # Trailing Hit
                elif trade.trailing_active and candle['high'] >= trade.lowest_price + self.trailing_distance:
                    exit_price = trade.lowest_price + self.trailing_distance
                    reason = "Trailing"

            if exit_price is not None:
                self.close_trade(trade, exit_price, candle['timestamp'], reason)

    def close_trade(self, trade: Trade, price: float, timestamp: str, reason: str):
        slippage = random.uniform(0, self.slippage_max)
        if trade.side == 'BUY':
            final_exit_price = price - self.spread - slippage
            trade.pnl = final_exit_price - trade.entry_price
        else:
            final_exit_price = price + self.spread + slippage
            trade.pnl = trade.entry_price - final_exit_price
            
        trade.exit_price = final_exit_price
        trade.exit_time = timestamp
        trade.status = "CLOSED"
        trade.exit_reason = reason
        self.closed_trades.append(trade)
        if trade in self.active_trades:
            self.active_trades.remove(trade)

    def finalize(self, last_candle: Dict):
        """
        Marks remaining active trades as PENDING and calculates floating PnL.
        """
        last_price = last_candle['close']
        for trade in self.active_trades:
            trade.status = "PENDING"
            trade.exit_time = last_candle['timestamp']
            trade.exit_price = last_price
            
            # Floating PnL calculation (without exit slippage for pending)
            if trade.side == 'BUY':
                # If we were to exit now, we'd sell at Bid (price - spread)
                trade.pnl = (last_price - self.spread) - trade.entry_price
            else:
                # If we were to exit now, we'd buy at Ask (price + spread)
                trade.pnl = trade.entry_price - (last_price + self.spread)
            
            trade.exit_reason = "End of Backtest"
            self.closed_trades.append(trade)
        
        self.active_trades = []
        return self.closed_trades
