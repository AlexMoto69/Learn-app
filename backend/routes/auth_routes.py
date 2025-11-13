from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db
from models.user import User
import json
import datetime

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
from routes.auth_refresh import create_refresh_token

@auth.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data or "password" not in data or ("username" not in data and "email" not in data):
        return jsonify({
            "success": False,
            "error": "Missing username/email or password"
        }), 400

    if "username" in data:
        user = User.query.filter_by(username=data["username"]).first()
    else:
        user = User.query.filter_by(email=data["email"]).first()

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
    try:
        refresh = create_refresh_token(user.id)
    except Exception:
        refresh = None

    return jsonify({
        "success": True,
        "message": "Login successful",
        "access_token": token,
        "refresh_token": refresh,
        "user": user.to_dict()
    }), 200


from flask_jwt_extended import jwt_required, get_jwt_identity

@auth.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    # return full user dict including module lists
    return jsonify(user.to_dict()), 200


# allow updating profile fields including module lists
@auth.route("/profile", methods=["POST"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    body = request.get_json(silent=True) or {}
    # fallback: if client didn't send Content-Type, try to parse raw body
    if not body:
        try:
            raw = request.data.decode('utf-8') if request.data else ''
            if raw:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    body = parsed
        except Exception:
            body = {}
    updated = {}

    # update username/email (unique checks)
    if "username" in body:
        new_username = (body.get("username") or "").strip()
        if new_username and new_username != user.username:
            if User.query.filter_by(username=new_username).first():
                return jsonify({"msg": "username already taken"}), 400
            user.username = new_username
            updated["username"] = new_username

    if "email" in body:
        new_email = (body.get("email") or "").strip()
        if new_email and new_email != user.email:
            if User.query.filter_by(email=new_email).first():
                return jsonify({"msg": "email already taken"}), 400
            user.email = new_email
            updated["email"] = new_email

    # update password
    if "password" in body:
        pw = body.get("password")
        if pw:
            user.password_hash = generate_password_hash(pw)
            updated["password"] = "changed"

    # allow updating total_score directly (numeric)
    if "total_score" in body:
        try:
            user.total_score = int(body.get("total_score"))
            updated["total_score"] = user.total_score
        except Exception:
            return jsonify({"msg": "total_score must be a number"}), 400

    # update modules lists (expect arrays)
    for key in ("modules_in_progress", "completed_modules"):
        if key in body:
            val = body.get(key)
            if not isinstance(val, list):
                return jsonify({"msg": f"{key} must be an array/list"}), 400
            # ensure ints
            try:
                val_clean = [int(x) for x in val]
            except Exception:
                return jsonify({"msg": f"{key} must contain integers"}), 400
            # store as JSON text
            setattr(user, key, json.dumps(val_clean))
            updated[key] = val_clean

    # update modules_progress (expect map: module_id -> quizzes_completed)
    if "modules_progress" in body:
        mp = body.get("modules_progress")
        if not isinstance(mp, dict):
            return jsonify({"msg": "modules_progress must be an object/dict"}), 400
        safe_map = {}
        try:
            for k, v in mp.items():
                ik = int(k)
                iv = int(v)
                if iv < 0 or iv > 8:
                    return jsonify({"msg": "modules_progress values must be between 0 and 8"}), 400
                safe_map[str(ik)] = iv
        except Exception:
            return jsonify({"msg": "modules_progress must be a map of integers"}), 400
        user.modules_progress = json.dumps(safe_map)
        updated["modules_progress"] = {int(k): v for k, v in safe_map.items()}

    # update last_daily_quiz_date (expect ISO date or null)
    if "last_daily_quiz_date" in body:
        val = body.get("last_daily_quiz_date")
        if val is None:
            user.last_daily_quiz_date = None
            updated["last_daily_quiz_date"] = None
        else:
            try:
                d = datetime.date.fromisoformat(val)
                user.last_daily_quiz_date = d
                updated["last_daily_quiz_date"] = d.isoformat()
            except Exception:
                return jsonify({"msg": "last_daily_quiz_date must be an ISO date string YYYY-MM-DD or null"}), 400

    db.session.add(user)
    db.session.commit()

    return jsonify({"msg": "profile updated", "updated": updated, "user": user.to_dict()}), 200
