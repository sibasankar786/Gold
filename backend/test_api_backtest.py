import requests
import json

url = "http://localhost:8000/backtest/run"
payload = {
    "symbol": "XAUUSD",
    "mock_data": True,
    "config": {
        "spread": 0.3,
        "slippage_max": 0.2,
        "base_sl_tp": 10.0,
        "min_volatility": 3.5
    }
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
