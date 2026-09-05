from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://curio:curio_dev_password@localhost:5432/curio"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    tmdb_api_key: str

    staleness_upcoming_days: int = 3
    staleness_airing_days: int = 7
    staleness_completed_days: int = 90


settings = Settings()
