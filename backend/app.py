from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db
from flask_jwt_extended import JWTManager
import openai

openai.api_key = Config.OPENAI_API_KEYpyt
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)

    db.init_app(app)
    jwt.init_app(app)

    from routes.auth_routes import auth
    app.register_blueprint(auth, url_prefix="/auth")

    @app.route("/")
    def home():
        return {"message": "Uplearn API is running"}

    return app

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        from models.user import User
        db.create_all()
    app.run(debug=True)
