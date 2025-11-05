import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
    JWT_SECRET_KEY = "jwt-secret-key"
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:alex5780@localhost:5432/UpLearn"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
