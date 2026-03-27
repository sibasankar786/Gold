from typing import List, Dict, Optional

class StrategyEngine:
    """
    Implements Scalping Strategies: Breakout and Liquidity Grab.
    Matches NestJS logic for parity.
    """
    
    def __init__(self, min_volatility: float = 3.5):
        self.min_volatility = min_volatility

    def check_breakout(self, m1_candles: List[Dict], m5_trend: str) -> Optional[str]:
        """
        Returns 'BUY', 'SELL', or None
        """
        if len(m1_candles) < 15:
            return None

        # 1. Volatility Filter (Last 5 M1)
        last5 = m1_candles[-5:]
        vol_high = max(c['high'] for c in last5)
        vol_low  = min(c['low'] for c in last5)
        v_range = vol_high - vol_low
        if v_range < self.min_volatility:
            return None

        # 2. Levels (Lookback 10 M1)
        lookback = m1_candles[-10:]
        resistance = max(c['high'] for c in lookback[:-1]) # Don't include active candle in resistance
        support    = min(c['low'] for c in lookback[:-1])

        # 3. Candle Strength
        last = m1_candles[-1]
        body = abs(last['close'] - last['open'])
        wick = (last['high'] - last['low']) or 0.1
        is_strong = (body / wick) > 0.6

        price = last['close']
        
        # 4. Signal
        if price > resistance and is_strong and m5_trend == "TREND_BULLISH":
            return "BUY"
        if price < support and is_strong and m5_trend == "TREND_BEARISH":
            return "SELL"
            
        return None

    def check_liquidity_grab(self, m1_candles: List[Dict]) -> Optional[str]:
        """
        Returns 'BUY', 'SELL', or None
        """
        if len(m1_candles) < 15:
            return None

        last = m1_candles[-1]
        prev_candles = m1_candles[-15:-1]
        prev_high = max(c['high'] for c in prev_candles)
        prev_low  = min(c['low'] for c in prev_candles)

        body = abs(last['close'] - last['open']) or 0.1
        upper_wick = last['high'] - max(last['open'], last['close'])
        lower_wick = min(last['open'], last['close']) - last['low']

        # Sweep High Rejection (SELL)
        if last['high'] > prev_high and last['close'] < prev_high and upper_wick > body * 1.5:
            return "SELL"
            
        # Sweep Low Rejection (BUY)
        if last['low'] < prev_low and last['close'] > prev_low and lower_wick > body * 1.5:
            return "BUY"

        return None

    def is_strong_candle(self, candle: Dict, side: str) -> bool:
        """Checks if a candle is a strong 'Red Bar' (SELL) or 'Green Bar' (BUY)."""
        body = abs(candle['close'] - candle['open'])
        wick = (candle['high'] - candle['low']) or 0.1
        ratio = body / wick
        
        if side == "SELL":
            return candle['close'] < candle['open'] and ratio > 0.6
        else:
            return candle['close'] > candle['open'] and ratio > 0.6

    def check_shadow_candle_entry(self, m1_window: List[Dict], shadow_level: float, side: str) -> Optional[Dict]:
        """
        Advanced M1 sequence for Shadow Strategy:
        1. Price hit 50%
        2. Liquidity grab (sweep)
        3. BOS (Break of Structure) + Red/Green Bar
        """
        if len(m1_window) < 10: return None
        
        last = m1_window[-1]
        prev = m1_window[-2]
        
        # 1. Check for 'Red Bar' (confirmation)
        if not self.is_strong_candle(last, side):
            return None
            
        # 2. Check for BOS + Level Hit logic
        # For SELL: 
        # - High of window must be above shadow_level (Sweep)
        # - Last candle must break below prev candle low (BOS)
        if side == "SELL":
            was_above = any(c['high'] >= shadow_level for c in m1_window)
            bos = last['close'] < prev['low'] 
            if was_above and bos:
                return {"signal": "SELL", "red_bar_size": last['high'] - last['low']}
        
        # For BUY:
        if side == "BUY":
            was_below = any(c['low'] <= shadow_level for c in m1_window)
            bos = last['close'] > prev['high']
            if was_below and bos:
                return {"signal": "BUY", "red_bar_size": last['high'] - last['low']}
                
        return None
