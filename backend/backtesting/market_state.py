import numpy as np
from typing import List, Dict, Optional

class MarketStateAnalyzer:
    """
    Detects TREND_BULLISH, TREND_BEARISH, RANGE, or NEUTRAL 
    based on M5 candle data.
    """
    
    def __init__(self, ema_9_period: int = 9, ema_21_period: int = 21, 
                 trend_dist_threshold: float = 1.0, range_threshold: float = 8.0):
        self.ema_9_period = ema_9_period
        self.ema_21_period = ema_21_period
        self.trend_dist_threshold = trend_dist_threshold
        self.range_threshold = range_threshold

    def calculate_ema(self, data: List[float], period: int) -> float:
        if not data:
            return 0.0
        k = 2 / (period + 1)
        ema = data[0]
        for val in data[1:]:
            ema = (val * k) + (ema * (1 - k))
        return ema

    def calculate_ema_series(self, data: List[float], period: int) -> List[float]:
        """Calculates a series of EMA values."""
        if not data: return []
        k = 2 / (period + 1)
        ema_values = []
        ema = data[0]
        ema_values.append(ema)
        for val in data[1:]:
            ema = (val * k) + (ema * (1 - k))
            ema_values.append(ema)
        return ema_values

    def calculate_atr(self, candles: List[Dict], period: int = 14) -> float:
        """Calculates Average True Range."""
        if len(candles) < period + 1: return 0.0
        
        tr_list = []
        for i in range(1, len(candles)):
            curr = candles[i]
            prev = candles[i-1]
            tr = max(
                curr['high'] - curr['low'],
                abs(curr['high'] - prev['close']),
                abs(curr['low'] - prev['close'])
            )
            tr_list.append(tr)
            
        # Simple moving average of TR for the ATR
        return float(np.mean(tr_list[-period:]))

    def get_market_state(self, m5_candles: List[Dict]) -> str:
        """
        Input: List of dicts with 'high', 'low', 'close'
        """
        if len(m5_candles) < 21:
            return "NEUTRAL"

        closes = [c['close'] for c in m5_candles]
        ema9 = self.calculate_ema(closes, self.ema_9_period)
        ema21 = self.calculate_ema(closes, self.ema_21_period)
        distance = abs(ema9 - ema21)

        # Range compression (last 10 candles)
        last_10 = m5_candles[-10:]
        highs = [c['high'] for c in last_10]
        lows = [c['low'] for c in last_10]
        m5_range = max(highs) - min(lows)

        if ema9 > ema21 and distance > self.trend_dist_threshold:
            return "TREND_BULLISH"
        
        if ema9 < ema21 and distance > self.trend_dist_threshold:
            return "TREND_BEARISH"

        if m5_range < self.range_threshold:
            return "RANGE"

        return "NEUTRAL"
