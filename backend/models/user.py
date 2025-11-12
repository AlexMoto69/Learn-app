from extensions import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    total_score = db.Column(db.Integer, default=0)
    current_streak = db.Column(db.Integer, default=0)
    last_quiz_date = db.Column(db.Date, nullable=True)
    longest_streak = db.Column(db.Integer, default=0)

    # helper for convenience
    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "total_score": self.total_score,
            "current_streak": self.current_streak,
            "longest_streak": self.longest_streak,
            "last_quiz_date": self.last_quiz_date.isoformat() if self.last_quiz_date else None
        }
