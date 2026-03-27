import asyncio
from adapters.mt5_adapter import MT5Adapter
from config import settings

async def clear_positions():
    print("--- ASTRATRADE MT5 CLEANUP ---")
    try:
        adapter = MT5Adapter()
        positions = adapter.get_open_positions(symbol=settings.market_symbol)
        print(f"Found {len(positions)} open positions for {settings.market_symbol}")
        
        for pos in positions:
            ticket = pos.get('ticket')
            print(f"Closing Ticket: {ticket}...")
            res = adapter.close_position(ticket)
            print(f"Result: {res}")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(clear_positions())
