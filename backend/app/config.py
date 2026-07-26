from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    openrouter_api_key: str = ""
    hf_api_key: str = ""

    frontend_url: str = "http://localhost:3000"
    upload_dir: str = "./app/uploads"
    max_pdf_size_mb: int = 25
    chroma_persist_dir: str = "./app/chroma_db"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
