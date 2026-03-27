import json
import os
from datetime import datetime
from typing import List, Dict, Optional
from .market_state import MarketStateAnalyzer
from .strategy import StrategyEngine
from .simulator import TradeSimulator
from .metrics import MetricsEngine
from .config import DEFAULT_CONFIG


class BacktestEngine:
    def __init__(self, config: Dict = None):
        self.config = {**DEFAULT_CONFIG, **(config or {})}
        self.market_analyzer = MarketStateAnalyzer(
            trend_dist_threshold=self.config["market_trend_threshold"],
            range_threshold=self.config["market_range_threshold"]
        )
        self.strategy_engine = StrategyEngine(
            min_volatility=self.config["min_volatility"]
        )
        self.simulator = TradeSimulator(
            spread=self.config["spread"],
            slippage_max=self.config["slippage_max"],
            trailing_activation=self.config["trailing_activation"],
            trailing_distance=self.config["trailing_distance"]
        )

    def run(self, m1_data: List[Dict], strategy_filter: str = "all"):
        """
        Main backtesting loop with strategy filtering.
        strategy_filter: 'all', 'breakout', 'liquidity', 'scalp_5pt', 'scalp_10pt'
        """
        if len(m1_data) < 40:
            return {"error": "Insufficient data"}

        # Apply parameter overrides for scalp presets
        sl_tp = self.config["base_sl_tp"]
        if strategy_filter == "scalp_5pt":
            sl_tp = 5
        elif strategy_filter == "scalp_10pt":
            sl_tp = 10

        print(f"Starting {strategy_filter} backtest for {len(m1_data)} M1 candles...")
        
        # Day State for Shadow Candle
        shadow_state = {
            "level": 0.0,
            "valid": False,
            "last_date": "",
            "shadow_date": "", # To ensure we only set level once per day
        }

        for i in range(30, len(m1_data)):
            current_m1 = m1_data[i]
            ts = current_m1['timestamp']
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            curr_date = dt.strftime('%Y-%m-%d')
            hour_min = dt.strftime('%H:%M')
            
            # Reset daily state
            if curr_date != shadow_state["last_date"]:
                shadow_state["level"] = 0.0
                shadow_state["valid"] = False
                shadow_state["last_date"] = curr_date

            m5_candles = self._derive_m5_candles(m1_data, i)
            m30_candles = self._derive_m30_candles(m1_data, i)
            h1_candles = self._derive_h1_candles(m1_data, i)
            
            # 1. SETUP: Detect 2:00-2:05 M5 Candle
            if hour_min == "02:05" and shadow_state["shadow_date"] != curr_date:
                m5_200 = m5_candles[-1] # This is the 2:00 candle that just closed at 2:05
                size = m5_200['high'] - m5_200['low']
                atr = self.market_analyzer.calculate_atr(m30_candles, 14)
                
                # Filters: Size >= 150 pts (1.5 gold pts) and Volatility >= 1.2 * ATR
                if size >= 1.5 and (atr == 0 or size >= 1.2 * atr):
                    shadow_state["level"] = (m5_200['high'] + m5_200['low']) / 2
                    shadow_state["valid"] = True
                    shadow_state["shadow_date"] = curr_date
                    print(f"[{curr_date}] Shadow Level set at {shadow_state['level']:.2f} (Size: {size:.2f})")

            # --- Shadow Candle Strategy Execution ---
            if strategy_filter in ["all", "shadow_candle"] and shadow_state["valid"]:
                # Filter 1: Session (5:30 PM - 8:30 PM IST overlap)
                # In standard broker time (GMT+2/3), IST is +2.5/3.5 hours away. 
                # 5:30 PM IST is ~2:00 PM or 3:00 PM Moscow/London.
                # Let's use the provided window: 5:30-8:30 PM IST. 
                # If the user is trading MT5, 5:30 PM IST is roughly 14:00 or 15:00 Broker time.
                # We'll stick to a standard volatility window check or look for specific hours.
                is_session = 14 <= dt.hour <= 18 # Broad London-NY Overlap
                
                if is_session and not self._is_strategy_active("ShadowCandle"):
                    # Filter 2: H1 Trend (EMA 50 and 200)
                    h1_closes = [c['close'] for c in h1_candles]
                    if len(h1_closes) >= 200:
                        ema50 = self.market_analyzer.calculate_ema(h1_closes, 50)
                        ema200 = self.market_analyzer.calculate_ema(h1_closes, 200)
                        
                        # Determine Bias
                        bias = ""
                        if current_m1['close'] < ema50 < ema200: bias = "SELL"
                        elif current_m1['close'] > ema50 > ema200: bias = "BUY"
                        
                        if bias:
                            # Filter 3: Entry Sequence (M1 BOS)
                            m1_window = m1_data[i-15:i+1]
                            signal_data = self.strategy_engine.check_shadow_candle_entry(
                                m1_window, shadow_state["level"], bias
                            )
                            
                            if signal_data:
                                # TP = 2x Red Bar Size
                                tp_dist = signal_data["red_bar_size"] * 2.0
                                trade_tp = current_m1['close'] - tp_dist if bias == "SELL" else current_m1['close'] + tp_dist
                                
                                # Open trade (SL is dynamic level-cross, so we pass a wide safety SL or None)
                                self.simulator.open_trade(
                                    current_m1['close'], bias, "ShadowCandle", 
                                    ts, sl=None, tp=trade_tp,
                                    shadow_level=shadow_state["level"],
                                    bos_price=current_m1['close'],
                                    red_bar_size=signal_data["red_bar_size"]
                                )

            # Exit logic for Shadow Strategy: CLOSE on M5 Candle crossing level
            shadow_trades = [t for t in self.simulator.active_trades if t.strategy == "ShadowCandle"]
            if shadow_trades and hour_min.endswith("0") or hour_min.endswith("5"): # Check every 5 mins
                last_m5 = m5_candles[-1]
                for st in shadow_trades:
                    # SELL SL: Price closes ABOVE shadow_level
                    if st.side == "SELL" and last_m5['close'] > st.shadow_level:
                        self.simulator.close_trade(st, last_m5['close'], ts, "SL (Level Cross)")
                    # BUY SL: Price closes BELOW shadow_level
                    elif st.side == "BUY" and last_m5['close'] < st.shadow_level:
                        self.simulator.close_trade(st, last_m5['close'], ts, "SL (Level Cross)")

            # --- Other Strategies ---
            state = self.market_analyzer.get_market_state(m5_candles)
            m1_window = m1_data[i-15:i+1]
            
            # 1. Breakout / Scalp Presets
            if strategy_filter in ["all", "breakout", "scalp_5pt", "scalp_10pt"]:
                if state.startswith("TREND"):
                    signal = self.strategy_engine.check_breakout(m1_window, state)
                    if signal and not self._is_strategy_active("Breakout"):
                        # Calculate targets
                        trade_sl = current_m1['close'] - sl_tp if signal == 'BUY' else current_m1['close'] + sl_tp
                        trade_tp = current_m1['close'] + (sl_tp * 1.5) if signal == 'BUY' else current_m1['close'] - (sl_tp * 1.5)
                        
                        # Apply optionality
                        if not self.config.get("use_sl", True): trade_sl = None
                        if not self.config.get("use_tp", True): trade_tp = None

                        self.simulator.open_trade(
                            current_m1['close'], signal, "Breakout", 
                            ts, sl=trade_sl, tp=trade_tp
                        )
            
            # 2. Liquidity Grab
            if strategy_filter in ["all", "liquidity"]:
                if state == "RANGE":
                    signal = self.strategy_engine.check_liquidity_grab(m1_window)
                    if signal and not self._is_strategy_active("LiquidityGrab"):
                        trade_sl = current_m1['close'] - sl_tp if signal == 'BUY' else current_m1['close'] + sl_tp
                        trade_tp = current_m1['close'] + (sl_tp * 1.5) if signal == 'BUY' else current_m1['close'] - (sl_tp * 1.5)
                        
                        if not self.config.get("use_sl", True): trade_sl = None
                        if not self.config.get("use_tp", True): trade_tp = None

                        self.simulator.open_trade(
                            current_m1['close'], signal, "LiquidityGrab", 
                            ts, sl=trade_sl, tp=trade_tp
                        )

            # 3. Dip Buy
            if strategy_filter in ["all", "dip_buy"]:
                if not hasattr(self, '_session_high'): self._session_high = -1
                if current_m1['high'] > self._session_high:
                    self._session_high = current_m1['high']
                
                threshold = self.config.get("dip_threshold", 15.0)
                if self._session_high - current_m1['close'] >= threshold:
                    all_history = self.simulator.closed_trades + self.simulator.active_trades
                    last_dip_trade = next((t for t in reversed(all_history) if t.strategy == "DipBuy"), None)
                    can_trade = True
                    if last_dip_trade:
                        try:
                            last_ts = datetime.fromisoformat(last_dip_trade.entry_time.replace('Z', '+00:00'))
                            if (dt - last_ts).total_seconds() < 300:
                                can_trade = False
                        except: pass

                    if can_trade:
                        trade_sl = current_m1['close'] - sl_tp
                        trade_tp = current_m1['close'] + (sl_tp * 1.5)
                        
                        if not self.config.get("use_sl", True): trade_sl = None
                        if not self.config.get("use_tp", True): trade_tp = None

                        self.simulator.open_trade(
                            current_m1['close'], "BUY", "DipBuy", 
                            ts, sl=trade_sl, tp=trade_tp
                        )

            # 4. Step Simulator (Update existing trades)
            self.simulator.update(current_m1)

        # 5. Final Report (Finalize any PENDING trades)
        last_candle = m1_data[-1]
        all_trades = self.simulator.finalize(last_candle)
        metrics = MetricsEngine.calculate(all_trades)
        
        report = {
            "config": self.config,
            "metrics": metrics,
            "trades": [t.__dict__ for t in all_trades],
            "candles": m1_data,
            "timestamp": datetime.now().isoformat()
        }
        
        self._save_results(report)
        return report


    def _derive_m5_candles(self, m1_data: List[Dict], index: int) -> List[Dict]:
        return self._derive_timeframe_candles(m1_data, index, 5)

    def _derive_m30_candles(self, m1_data: List[Dict], index: int) -> List[Dict]:
        return self._derive_timeframe_candles(m1_data, index, 30)

    def _derive_h1_candles(self, m1_data: List[Dict], index: int) -> List[Dict]:
        return self._derive_timeframe_candles(m1_data, index, 60)

    def _derive_timeframe_candles(self, m1_data: List[Dict], index: int, minutes: int) -> List[Dict]:
        """Generic aggregator to create higher timeframe candles from M1 history."""
        # We need at least 25 candles of the target timeframe for robust indicators
        lookback_m1 = minutes * 30 
        if index < lookback_m1:
            window = m1_data[:index]
        else:
            window = m1_data[index-lookback_m1:index]
            
        tf_list = []
        for j in range(0, len(window), minutes):
            chunk = window[j:j+minutes]
            if len(chunk) < minutes: continue
            tf_list.append({
                "open": chunk[0]["open"],
                "high": max(c["high"] for c in chunk),
                "low": min(c["low"] for c in chunk),
                "close": chunk[-1]["close"],
                "timestamp": chunk[-1]["timestamp"]
            })
        return tf_list


    def _is_strategy_active(self, strategy: str) -> bool:
        return any(t.strategy == strategy for t in self.simulator.active_trades)

    def _save_results(self, report: Dict):
        # Result path relative to this file
        path = os.path.join(os.path.dirname(__file__), "results")
        if not os.path.exists(path):
            os.makedirs(path)
        filename = f"backtest_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(os.path.join(path, filename), "w") as f:
            json.dump(report, f, indent=2)
