import MetaTrader5 as mt5
import sys

def run_diag():
    if not mt5.initialize():
        print(f"DIAG: MT5 Initialize Failed: {mt5.last_error()}")
        return

    print("DIAG: MT5 Connected successfully!")
    
    # Check terminal info
    info = mt5.terminal_info()
    if info:
        print(f"DIAG: Terminal: {info.name}, Company: {info.company}")
    
    # List all symbols that contain "GOLD" or "XAU"
    symbols = mt5.symbols_get()
    print(f"DIAG: Total symbols found: {len(symbols)}")
    
    matching = [s.name for s in symbols if "XAU" in s.name or "GOLD" in s.name]
    print(f"DIAG: Matching symbols: {matching}")
    
    # Try to fetch tick for the first matching symbol
    if matching:
        target = matching[0]
        mt5.symbol_select(target, True)
        tick = mt5.symbol_info_tick(target)
        if tick:
            print(f"DIAG: Price for {target}: Bid={tick.bid}, Ask={tick.ask}")
        else:
            print(f"DIAG: Failed to get tick for {target}: {mt5.last_error()}")
    
    mt5.shutdown()

if __name__ == "__main__":
    run_diag()
