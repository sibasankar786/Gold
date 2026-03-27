"""MongoDB async client — single connection instance shared across the app."""
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client


def get_db():
    return get_client()[settings.mongodb_db]


async def close_client():
    global _client
    if _client:
        _client.close()
        _client = None


# Collection accessors — import these in routes/services
def trades_col():
    return get_db()["trades"]

def setup_stats_col():
    return get_db()["setup_stats"]

def forward_tests_col():
    return get_db()["forward_tests"]

def sentiment_events_col():
    return get_db()["sentiment_events"]
