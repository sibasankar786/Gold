from typing import Dict

DEFAULT_CONFIG: Dict = {
    "symbol": "XAUUSD",
    "spread": 0.3,
    "slippage_max": 0.2,
    "risk_per_trade": 1.0,
    "min_volatility": 3.5,
    "trailing_activation": 2.0,
    "trailing_distance": 1.0,
    "market_range_threshold": 8.0,
    "market_trend_threshold": 1.0,
    "base_sl_tp": 10.0,
    "time_exit_bars": 15, # Max bars to hold a scalp
    "dip_threshold": 15.0,
}
