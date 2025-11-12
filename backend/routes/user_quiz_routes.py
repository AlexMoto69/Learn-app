from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.user import User
from utils.ollama_client import call_ollama_generate
import datetime

user_quiz = Blueprint("user_quiz", __name__)

# Simple daily quiz provider: returns generated questions from module(s) or context
@user_quiz.route("/daily", methods=["GET"])  # /api/quiz/daily
@jwt_required()
def daily_quiz():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Accept optional query params: module (int or 'all'), count
    module = request.args.get("module")
    count = int(request.args.get("count", 5))

    # Build a prompt to generate a short quiz
    if module:
        if module.lower() in ("all", "*"):
            prompt = f"Generează {count} întrebări grilă scurte (3 variante) despre concepte importante din toate modulele de biologie, în limba română."
        else:
            prompt = f"Generează {count} întrebări grilă scurte (3 variante) despre concepte importante din modul {module} de biologie, în limba română."
    else:
        prompt = f"Generează {count} întrebări grilă scurte (3 variante) despre concepte importante la biologie pentru liceu, în limba română."

    try:
        result = call_ollama_generate(prompt)
    except Exception as e:
        current_app.logger.exception("model error")
        return jsonify({"msg": "model error", "error": str(e)}), 500

    return jsonify({"reply": result}), 200


# Submit quiz results
@user_quiz.route("/submit", methods=["POST"])  # /api/quiz/submit
@jwt_required()
def submit_quiz():
    body = request.get_json(silent=True) or {}
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Expected body: { "score": int, "max_score": int, "questions_correct": int, "questions_total": int }
    score = body.get("score")
    max_score = body.get("max_score") or body.get("questions_total")
    correct = body.get("questions_correct")
    total = body.get("questions_total")

    if score is None and correct is None:
        return jsonify({"msg": "score or questions_correct required"}), 400

    # compute a normalized score if needed
    if score is None and correct is not None and total:
        try:
            score = int(correct) * 100 // int(total)
        except Exception:
            score = 0

    # update total_score (simple additive), and compute progression/streaks
    try:
        user.total_score = (user.total_score or 0) + int(score)
    except Exception:
        user.total_score = (user.total_score or 0)

    today = datetime.date.today()
    updated_streak = user.current_streak or 0

    if user.last_quiz_date is None:
        updated_streak = 1
    else:
        if user.last_quiz_date == today - datetime.timedelta(days=1):
            updated_streak = (user.current_streak or 0) + 1
        elif user.last_quiz_date == today:
            updated_streak = user.current_streak or 0
        else:
            updated_streak = 1

    user.current_streak = updated_streak
    if (user.longest_streak or 0) < updated_streak:
        user.longest_streak = updated_streak

    user.last_quiz_date = today

    db.session.add(user)
    db.session.commit()

    return jsonify({
        "msg": "quiz recorded",
        "total_score": user.total_score,
        "current_streak": user.current_streak,
        "longest_streak": user.longest_streak,
        "last_quiz_date": user.last_quiz_date.isoformat()
    }), 200

