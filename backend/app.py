from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db, jwt


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)

    db.init_app(app)
    jwt.init_app(app)

    from routes.auth_routes import auth
    app.register_blueprint(auth, url_prefix="/auth")

    # register quiz blueprint
    from routes.quiz_routes import quiz as quiz_bp
    app.register_blueprint(quiz_bp, url_prefix="/api/quiz")

    @app.route("/")
    def home():
        return {"message": "Uplearn API is running"}

    return app


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=True)
