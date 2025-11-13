import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app import create_app
from extensions import db
from models.pdf_document import PDFDocument

app = create_app()
with app.app_context():
    d = PDFDocument.query.get(1)
    if not d:
        print('No document with id=1')
    else:
        print('Document id=1 filename=', d.filename)
        txt = (d.text or '')[:2000]
        print('--- TEXT PREVIEW (first 2000 chars) ---')
        print(txt)
        print('--- END PREVIEW ---')

