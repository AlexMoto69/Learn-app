from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db, jwt
import os


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)

    db.init_app(app)
    jwt.init_app(app)

    from routes.auth_routes import auth
    app.register_blueprint(auth, url_prefix="/auth")

    # register refresh blueprint
    from routes.auth_refresh import refresh_bp
    app.register_blueprint(refresh_bp)

    # register quiz blueprint
    from routes.quiz_routes import quiz as quiz_bp
    app.register_blueprint(quiz_bp, url_prefix="/api/quiz")

    # register chatbot blueprint (lightweight, uses ollama)
    from routes.chatbot_routes import chatbot as chatbot_bp
    app.register_blueprint(chatbot_bp, url_prefix="/api/chatbot")

    # register user quiz routes (daily quiz + submit)
    from routes.user_quiz_routes import user_quiz as user_quiz_bp
    app.register_blueprint(user_quiz_bp, url_prefix="/api/quiz")

    # register pdf routes
    from routes.pdf_routes import pdf_bp
    app.register_blueprint(pdf_bp, url_prefix="/api/pdf")

    # register friends routes
    from routes.friends_routes import friends_bp
    app.register_blueprint(friends_bp, url_prefix="/api/friends")

    # ensure storage/pdf directory exists
    storage_pdf = os.path.join(os.path.dirname(__file__), 'storage', 'pdfs')
    os.makedirs(storage_pdf, exist_ok=True)

    @app.route("/")
    def home():
        return {"message": "Uplearn API is running"}

    return app


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=True)
