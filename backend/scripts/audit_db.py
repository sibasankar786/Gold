import asyncio
from motor.asyncio import AsyncIOMotorClient
import json

async def check_db():
    print("--- ASTRATRADE MONGODB AUDIT ---")
    try:
        client = AsyncIOMotorClient('mongodb://localhost:27017')
        db = client.astratrade
        
        # Check trades
        trades_count = await db.trades.count_documents({})
        print(f"Total Trades in MongoDB: {trades_count}")
        
        last_trades = await db.trades.find().sort("timestamp", -1).to_list(5)
        for t in last_trades:
            # Convert ObjectId to string for printing
            t['_id'] = str(t['_id'])
            print(f"Trade: {t.get('pair')} | Entry: {t.get('entry')} | Bias: {t.get('bias')} | Outcome: {t.get('outcome')}")
            print(f"Notes: {t.get('notes')[:100]}...")
            print("-" * 30)
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
