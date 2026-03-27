import MetaTrader5 as mt5

if not mt5.initialize():
    print(f"Failed to initialize MT5: {mt5.last_error()}")
    quit()

symbols = mt5.symbols_get()
print(f"Total symbols found: {len(symbols)}")

# Look for gold related symbols
gold_symbols = [s.name for s in symbols if "XAU" in s.name or "GOLD" in s.name]
print(f"Gold-related symbols: {gold_symbols}")

# Check current symbol from settings
import os
import sys
# Add backend to path to import config
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), "..")))
try:
    from config import settings
    print(f"Configured symbol: {settings.market_symbol}")
    
    # Try fetching 10 bars for configured symbol
    rates = mt5.copy_rates_from_pos(settings.market_symbol, mt5.TIMEFRAME_M1, 0, 10)
    if rates is None:
        print(f"Failed to fetch rates for {settings.market_symbol}: {mt5.last_error()}")
    else:
        print(f"Successfully fetched {len(rates)} bars for {settings.market_symbol}")
except Exception as e:
    print(f"Error checking config: {e}")

mt5.shutdown()
