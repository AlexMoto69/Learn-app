from extensions import db
import datetime

class PDFDocument(db.Model):
    __tablename__ = 'pdf_document'
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(1024), nullable=True)
    text = db.Column(db.Text, nullable=True)
    data = db.Column(db.LargeBinary, nullable=True)  # store PDF bytes here
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "filename": self.filename,
            "filepath": self.filepath,
            "has_data": bool(self.data),
            "created_at": self.created_at.isoformat(),
        }
