from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db
from models.user import User

auth = Blueprint("auth", __name__)

@auth.route("/register", methods=["POST"])
def register():
    data = request.json
    existing_user = User.query.filter_by(username=data["username"]).first()
    if existing_user:
        return jsonify({"error": "Username already exists"}), 400

    hashed_pw = generate_password_hash(data["password"])
    user = User(username=data["username"], email=data["email"], password_hash=hashed_pw)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"})

from flask_jwt_extended import create_access_token

@auth.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data or "username" not in data or "password" not in data:
        return jsonify({
            "success": False,
            "error": "Missing username or password"
        }), 400

    user = User.query.filter_by(username=data["username"]).first()
    if not user:
        return jsonify({
            "success": False,
            "error": "User not found"
        }), 404

    if not check_password_hash(user.password_hash, data["password"]):
        return jsonify({
            "success": False,
            "error": "Invalid password"
        }), 401

    token = create_access_token(identity=str(user.id))

    return jsonify({
        "success": True,
        "message": "Login successful",
        "access_token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "total_score": user.total_score,
            "current_streak": user.current_streak
        }
    }), 200

from flask_jwt_extended import jwt_required, get_jwt_identity

@auth.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "total_score": user.total_score,
        "current_streak": user.current_streak
    }), 200
