import sys, os
# ensure project root on path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app
from extensions import db
from models.pdf_document import PDFDocument
import os

try:
    import PyPDF2
except Exception:
    PyPDF2 = None

app = create_app()

with app.app_context():
    docs = PDFDocument.query.order_by(PDFDocument.id.asc()).all()
    if not docs:
        print('No PDFDocument rows found in DB.')
    for d in docs:
        print('---')
        print(f'Processing id={d.id} filename={d.filename} owner={d.owner_id}')
        if d.text and d.text.strip():
            print('Already has text (len=%d), skipping.' % len(d.text))
            continue
        if not os.path.exists(d.filepath):
            print('File not found on disk:', d.filepath)
            continue
        if not PyPDF2:
            print('PyPDF2 not installed in this environment; cannot extract. Install with: pip install PyPDF2')
            continue
        try:
            extracted_pages = []
            with open(d.filepath, 'rb') as fh:
                reader = PyPDF2.PdfReader(fh)
                for i, p in enumerate(reader.pages):
                    try:
                        txt = p.extract_text() or ''
                    except Exception:
                        txt = ''
                    if txt.strip():
                        extracted_pages.append(txt)
            extracted = '\n\n'.join(extracted_pages)
            if extracted.strip():
                d.text = extracted
                db.session.add(d)
                db.session.commit()
                print(f'Updated document id={d.id} text length={len(extracted)}')
            else:
                print('Extraction produced empty text for:', d.filepath)
        except Exception as e:
            print('Error extracting', d.filepath, str(e))

print('Done')
