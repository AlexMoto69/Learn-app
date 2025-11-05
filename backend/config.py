import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-key")

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:alex5780@localhost:5432/UpLearn"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Add your OpenAI API key
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
