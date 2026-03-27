import sys
import os
import json

# Add current directory to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backtesting.engine import BacktestEngine
from routes.backtest import generate_mock_m1_data

def test_engine():
    print("--- AstraTrade Backtest Engine Verification ---")
    
    # 1. Setup Engine
    config = {
        "spread": 0.2,
        "slippage_max": 0.1,
    }
    engine = BacktestEngine(config=config)
    
    # 2. Generate 500 minutes of mock data
    print("Generating 500 candles of mock data...")
    m1_data = generate_mock_m1_data(500)
    
    # 3. Run Backtest
    print("Running simulation...")
    results = engine.run(m1_data)
    
    # 4. Validate Results
    metrics = results.get("metrics", {})
    print("\n[RESULTS]")
    print(f"Total Trades: {metrics.get('total_trades')}")
    print(f"Win Rate:     {metrics.get('win_rate')}%")
    print(f"Net Profit:   {metrics.get('net_profit')} pts")
    print(f"Max Drawdown: {metrics.get('max_drawdown')} pts")
    print(f"Profit Factor: {metrics.get('profit_factor')}")
    
    if metrics.get("total_trades", 0) > 0:
        print("\nSUCCESS: Backtest completed with trade execution.")
    else:
        print("\nWARNING: No trades executed. Check strategy thresholds or increase data count.")

if __name__ == "__main__":
    test_engine()
