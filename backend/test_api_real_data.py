import requests
import json

url = "http://localhost:8000/backtest/run"
payload = {
    "symbol": "XAUUSD.sc",
    "mock_data": False, # Test REAL data
    "config": {

        "spread": 0.3,
        "slippage_max": 0.2,
        "base_sl_tp": 10.0,
        "min_volatility": 3.5
    }
}

try:
    print(f"Sending request to {url} with REAL MT5 data flag...")
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Success! Fetched {len(data.get('candles', []))} real candles.")
        print(f"Metrics: {data.get('metrics')}")
        print(f"Trades executed: {len(data.get('trades', []))}")
    else:
        print(f"Error Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
