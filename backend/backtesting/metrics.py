from typing import List, Dict
from datetime import datetime
import numpy as np

class MetricsEngine:
    """
    Calculates performance statistics from a list of closed trades.
    """
    
    @staticmethod
    def calculate(trades: List) -> Dict:
        if not trades:
            return {
                "total_trades": 0,
                "win_rate": 0,
                "net_profit": 0,
                "max_drawdown": 0,
                "profit_factor": 0,
                "expectancy": 0,
                "avg_rr": 0
            }

        pnls = [t.pnl for t in trades]
        wins = [p for p in pnls if p > 0]
        losses = [p for p in pnls if p <= 0]

        total_trades = len(pnls)
        win_count = len(wins)
        win_rate = (win_count / total_trades) * 100 if total_trades > 0 else 0
        net_profit = sum(pnls)

        gross_profit = sum(wins)
        gross_loss = abs(sum(losses))
        # Profit Factor: Handle gross_loss=0 correctly for JSON
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else (999.99 if gross_profit > 0 else 0)

        # Drawdown calculation
        cumulative_pnl = np.cumsum(pnls)
        peak = np.maximum.accumulate(cumulative_pnl)
        drawdown = peak - cumulative_pnl
        max_drawdown = np.max(drawdown) if len(drawdown) > 0 else 0
        
        max_drawdown_entry = ""
        if len(drawdown) > 0:
            idx = np.argmax(drawdown)
            max_drawdown_entry = trades[idx].entry_time

        # Expectancy: (Win% * Avg Win) - (Loss% * Avg Loss)
        avg_win = np.mean(wins) if wins else 0
        avg_loss = abs(np.mean(losses)) if losses else 0
        expectancy = ((win_rate/100) * avg_win) - ((1 - win_rate/100) * avg_loss)

        # Average R:R
        avg_rr = float(avg_win / avg_loss) if avg_loss > 0 else 0
        
        # Hold Time Calculations
        durations = []
        for t in trades:
            if t.entry_time and t.exit_time:
                try:
                    # Handle possible Z or offsets in isoformat
                    s_str = t.entry_time.replace('Z', '+00:00')
                    e_str = t.exit_time.replace('Z', '+00:00')
                    start = datetime.fromisoformat(s_str)
                    end = datetime.fromisoformat(e_str)
                    diff = (end - start).total_seconds() / 60.0
                    durations.append(diff)
                except Exception as e:
                    print(f"[METRICS] Error parsing hold time: {e}")
                    pass

        avg_hold = np.mean(durations) if durations else 0
        min_hold = np.min(durations) if durations else 0
        max_hold = np.max(durations) if durations else 0
        
        # Find entry time for longest hold
        max_hold_entry = ""
        for t in trades:
            if t.entry_time and t.exit_time:
                try:
                    s_str = t.entry_time.replace('Z', '+00:00')
                    e_str = t.exit_time.replace('Z', '+00:00')
                    diff = (datetime.fromisoformat(e_str) - datetime.fromisoformat(s_str)).total_seconds() / 60.0
                    if abs(diff - max_hold) < 0.01:
                        max_hold_entry = t.entry_time
                        break
                except: pass
        
        # New Metrics
        max_single_profit = float(np.max(pnls)) if pnls else 0.0
        max_profit_entry = ""
        if pnls:
            for t in trades:
                if abs(float(t.pnl) - max_single_profit) < 0.001:
                    max_profit_entry = t.entry_time
                    break
                    
        avg_profit_per_trade = net_profit / total_trades if total_trades > 0 else 0

        return {
            "total_trades": int(total_trades),
            "win_rate": float(round(win_rate, 2)),
            "net_profit": float(round(net_profit, 2)),
            "max_drawdown": float(round(max_drawdown, 2)),
            "max_drawdown_entry": max_drawdown_entry,
            "max_profit": float(round(max_single_profit, 2)),
            "max_profit_entry": max_profit_entry,
            "avg_profit": float(round(avg_profit_per_trade, 2)),
            "profit_factor": float(round(profit_factor, 2)),
            "expectancy": float(round(expectancy, 2)),
            "avg_rr": float(round(avg_rr, 2)),
            "hold_time": {
                "avg": float(round(avg_hold, 1)),
                "min": float(round(min_hold, 1)),
                "max": float(round(max_hold, 1)),
                "max_entry": max_hold_entry
            }
        }
