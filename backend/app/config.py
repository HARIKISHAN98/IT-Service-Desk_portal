from pydantic_settings import BaseSettings
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME : str = "IT Ticketing Portal"
    DATABASE_URL : str = "sqlite:///./database.db"

    # Must be Provided by .env 
    SECRET_KEY : str
    ALGORITHM : str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours

    class Config:
        env_file = BACKEND_DIR / ".env"
        extra = "ignore"

settings = Settings()
