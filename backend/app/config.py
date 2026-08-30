from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME : str = "IT Ticketing Portal"
    DATABASE_URL : str = "sqlite:///./database.db"

    SECRET_KEY : str = "super_secret_jwt_key_change_in_production_1234567890"
    ALGORITHM : str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
