import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app import create_app
from extensions import db
from models.pdf_document import PDFDocument

app = create_app()
with app.app_context():
    docs = PDFDocument.query.order_by(PDFDocument.id.desc()).all()
    if not docs:
        print('No PDF documents found.')
        sys.exit(0)
    print(f'Found {len(docs)} documents:')
    for d in docs:
        data_len = len(d.data) if d.data else 0
        text_len = len(d.text) if d.text else 0
        print(f'- id={d.id} filename={d.filename!r} owner={d.owner_id} data_len={data_len} text_len={text_len} created_at={d.created_at}')
    # print details for the most recent
    latest = docs[0]
    print('\n--- latest document preview (text first 600 chars) ---')
    print((latest.text or '')[:600])
    print('--- end preview ---')

