from extensions import db
import json

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    total_score = db.Column(db.Integer, default=0)
    current_streak = db.Column(db.Integer, default=0)
    last_quiz_date = db.Column(db.Date, nullable=True)
    longest_streak = db.Column(db.Integer, default=0)

    # store module progress as JSON text to avoid immediate migrations complexity
    modules_in_progress = db.Column(db.Text, nullable=True, default='[]')
    completed_modules = db.Column(db.Text, nullable=True, default='[]')
    # store map module_id -> quizzes_completed (0..8)
    modules_progress = db.Column(db.Text, nullable=True, default='{}')
    # date when daily quiz was last completed
    last_daily_quiz_date = db.Column(db.Date, nullable=True)

    # helper for convenience
    def to_dict(self):
        def _safe_load_list(s):
            try:
                v = json.loads(s) if s else []
                return v if isinstance(v, list) else []
            except Exception:
                return []

        def _safe_load_map(s):
            try:
                v = json.loads(s) if s else {}
                if isinstance(v, dict):
                    out = {}
                    for k, val in v.items():
                        try:
                            out[int(k)] = int(val)
                        except Exception:
                            continue
                    return out
                return {}
            except Exception:
                return {}

        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "total_score": self.total_score,
            "current_streak": self.current_streak,
            "longest_streak": self.longest_streak,
            "last_quiz_date": self.last_quiz_date.isoformat() if self.last_quiz_date else None,
            "last_daily_quiz_date": self.last_daily_quiz_date.isoformat() if self.last_daily_quiz_date else None,
            "modules_in_progress": _safe_load_list(self.modules_in_progress),
            "completed_modules": _safe_load_list(self.completed_modules),
            "modules_progress": _safe_load_map(self.modules_progress)
        }
