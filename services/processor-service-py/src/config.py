import logging
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

class Settings(BaseSettings):
    """
    Configuration settings for the application, loaded from environment variables.
    """
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    # GCP Settings
    GCP_PROJECT_ID: str = "your-project-id"
    GCP_REGION: str = "your-region"
    
    # Pub/Sub Settings
    SUBSCRIPTION_NAME: str = "blog-posts-sub"
    TOPIC_NAME: str = "blog-posts"

    # Firestore Settings
    FIRESTORE_POSTS_COLLECTION: str = "posts"
    FIRESTORE_GENERATED_POSTS_COLLECTION: str = "generated_posts"
    
    # AI Provider Settings
    AI_PROVIDER: Literal["OPENAI", "GOOGLE"] = "GOOGLE"
    OPENAI_API_KEY_SECRET: str = "your-openai-api-key-secret-name"
    # GOOGLE_API_KEY is not used by the Vertex AI client, which uses ADC.
    # It is kept here in case you switch back to the Gemini Developer API method.
    GOOGLE_API_KEY: str | None = None

    # Logging Settings
    LOG_LEVEL: str = "INFO"

# Instantiate settings
try:
    settings = Settings()
except Exception as e:
    logging.error(f"Failed to load settings: {e}")
    # Provide default settings or exit
    settings = None 