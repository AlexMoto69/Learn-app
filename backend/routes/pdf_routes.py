from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.pdf_document import PDFDocument
from models.user import User
import os, io
import datetime

# try import PyPDF2, otherwise we'll attempt a basic fallback
try:
    import PyPDF2
except Exception:
    PyPDF2 = None

pdf_bp = Blueprint('pdf', __name__)

# NOTE: we store PDFs in DB (data column) and do not save uploads to disk by default.


@pdf_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_pdf():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'msg': 'User not found'}), 404

    if 'file' not in request.files:
        return jsonify({'msg': 'No file part'}), 400

    f = request.files['file']
    if not f or f.filename == '':
        return jsonify({'msg': 'No selected file'}), 400

    # simple filename sanitization
    filename = os.path.basename(f.filename)

    # read bytes
    try:
        file_bytes = f.read()
    except Exception as e:
        current_app.logger.exception('read failed')
        return jsonify({'msg': 'failed to read file', 'error': str(e)}), 500

    # (no longer saving a copy to disk) -- store raw bytes in DB only
    # extract text from bytes
    extracted = ''
    try:
        if PyPDF2 and file_bytes:
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            pages = []
            for p in reader.pages:
                try:
                    pages.append(p.extract_text() or '')
                except Exception:
                    pages.append('')
            extracted = '\n\n'.join([p for p in pages if p])
        else:
            extracted = ''
    except Exception:
        current_app.logger.exception('pdf extraction failed')
        extracted = ''

    # store in DB; do NOT keep a file on disk by default
    doc = PDFDocument(owner_id=int(user_id), filename=filename, filepath=None, text=extracted, data=file_bytes)
    db.session.add(doc)
    db.session.commit()

    return jsonify({'msg': 'uploaded', 'document': doc.to_dict()}), 201


@pdf_bp.route('/<int:doc_id>/quiz', methods=['POST'])
@jwt_required()
def quiz_from_pdf(doc_id):
    user_id = int(get_jwt_identity())
    doc = PDFDocument.query.get(doc_id)
    if not doc:
        return jsonify({'msg': 'document not found'}), 404
    if int(doc.owner_id) != user_id:
        return jsonify({'msg': 'forbidden'}), 403

    body = request.get_json(silent=True) or {}
    count = int(body.get('count', 5))

    if not doc.text or not doc.text.strip():
        return jsonify({'msg': 'document has no extracted text'}), 400

    # build a strict PDF-only prompt
    def build_pdf_prompt(doc_text, count):
        # concise prompt that forces model to use only the provided document text
        template = (
            "Ești un generator de teste în limba română.\n"
            "FOLOSEȘTE DOAR TEXTUL FURNIZAT mai jos (NU folosi alte surse sau cunoștințe externe).\n"
            "Generează EXACT {count} întrebări practice bazate NUMAI pe textul documentului.\n"
            "Fiecare întrebare trebuie să aibă EXACT 3 opțiuni; o singură opțiune corectă.\n"
            "Câmpul \"correct_index\" trebuie să fie UN NUMĂR întreg 0-based (0 pentru prima opțiune).\n"
            "Preferă întrebări interactive: probleme concrete, calcule simple, aplicări practice ale conceptelor din text.\n"
            "Explicațiile: 1–2 propoziții concise, bazate doar pe textul dat.\n"
            "Răspunde EXCLUSIV cu un bloc JSON marcat: <<<JSON ... JSON; (fără alt text).\n\n"
            "EXEMPLU (folosește exact acest format):\n<<<JSON\n[\n  {\n    \"question\": \"Calculează: 27 + 58 = ?\",\n    \"options\": [\"85\", \"95\", \"80\"],\n    \"correct_index\": 0,\n    \"explanation\": \"27 + 58 = 85.\",\n    \"source_sentence\": 0\n  }\n]\nJSON;\n\n"
            "TEXT DOCUMENT:\n{doc_text}\n"
        )
        # safe insertion using replace to avoid accidental format interpretation
        return template.replace('{count}', str(count)).replace('{doc_text}', doc_text)

    prompt = build_pdf_prompt(doc.text, count)

    try:
        from utils.ollama_client import call_ollama_generate
        result = call_ollama_generate(prompt)
    except Exception as e:
        current_app.logger.exception('model error')
        return jsonify({'msg': 'model error', 'error': str(e)}), 500

    # reuse extract_json_block from quiz_routes for parsing
    from routes.quiz_routes import extract_json_block

    questions, err = extract_json_block(result)
    if err:
        return jsonify({'msg': 'no structured JSON detected', 'raw': result, 'error': err}), 200

    # DO NOT modify correct_index here — return model output verbatim.

    return jsonify({'document_id': doc_id, 'questions': questions}), 200


@pdf_bp.route('/list', methods=['GET'])
@jwt_required()
def list_user_docs():
    user_id = int(get_jwt_identity())
    docs = PDFDocument.query.filter_by(owner_id=user_id).order_by(PDFDocument.created_at.desc()).all()
    return jsonify([d.to_dict() for d in docs]), 200


@pdf_bp.route('/<int:doc_id>', methods=['DELETE'])
@jwt_required()
def delete_pdf(doc_id):
    """Delete a PDF document: remove DB record and delete file from disk if present. Only owner may delete."""
    user_id = int(get_jwt_identity())
    doc = PDFDocument.query.get(doc_id)
    if not doc:
        return jsonify({'msg': 'document not found'}), 404
    if int(doc.owner_id) != user_id:
        return jsonify({'msg': 'forbidden'}), 403

    # attempt to delete file on disk (if filepath set and file exists)
    try:
        if getattr(doc, 'filepath', None):
            try:
                if os.path.isfile(doc.filepath):
                    os.remove(doc.filepath)
            except Exception:
                # not fatal — log and continue
                current_app.logger.exception('failed to remove file from disk: %s', doc.filepath)
    except Exception:
        # defensive catch in case doc has unexpected attributes
        current_app.logger.exception('error checking/removing file path')

    try:
        db.session.delete(doc)
        db.session.commit()
    except Exception as e:
        current_app.logger.exception('failed to delete PDF from DB')
        return jsonify({'msg': 'failed to delete document', 'error': str(e)}), 500

    return jsonify({'msg': 'deleted', 'document_id': doc_id}), 200
