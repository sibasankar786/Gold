from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # LLM
    openai_api_key: str = Field("", env="OPENAI_API_KEY")
    news_api_key: str = Field("", env="NEWSAPI_KEY")
    gemini_api_key: str = Field("", env="GEMINI_API_KEY")

    # Models
    llm_model: str = Field("gpt-4o-mini", env="LLM_MODEL")
    gemini_model: str = Field("gemini-1.5-flash", env="GEMINI_MODEL")
    embed_model: str = Field("text-embedding-3-small", env="EMBED_MODEL")
    gemini_embed_model: str = Field("models/embedding-001", env="GEMINI_EMBED_MODEL")

    # MongoDB
    mongodb_uri: str = Field("mongodb://localhost:27017", env="MONGODB_URI")
    mongodb_db: str = Field("astratrade", env="MONGODB_DB")

    # ChromaDB
    chroma_path: str = Field("./chroma_db", env="CHROMA_PATH")

    # News
    newsapi_key: str = Field("", env="NEWSAPI_KEY")

    # Market Data
    market_data_provider: str = Field("yfinance", env="MARKET_DATA_PROVIDER")
    market_symbol: str = Field("GC=F", env="MARKET_SYMBOL")
    market_timeframe: str = Field("1h", env="MARKET_TIMEFRAME")
    market_bars: int = Field(200, env="MARKET_BARS")

    # App
    env: str = Field("development", env="ENV")
    auto_trade_trial_mode: bool = Field(True, env="AUTO_TRADE_TRIAL_MODE")
    log_level: str = Field("INFO", env="LOG_LEVEL")
    port: int = Field(8000, env="PORT")

    # Risk defaults
    default_risk_pct: float = Field(0.5, env="DEFAULT_RISK_PCT")
    max_daily_trades: int = Field(3, env="MAX_DAILY_TRADES")
    max_daily_loss_pct: float = Field(2.0, env="MAX_DAILY_LOSS_PCT")
    max_spread: float = Field(0.7, env="MAX_SPREAD")

    # Forward test gate
    forward_test_min_trades: int = Field(100, env="FORWARD_TEST_MIN_TRADES")
    forward_test_min_days: int = Field(30, env="FORWARD_TEST_MIN_DAYS")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
