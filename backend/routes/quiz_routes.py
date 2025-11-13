from flask import Blueprint, request, jsonify, current_app
import os
import json
import re
from utils.ollama_client import call_ollama_generate

quiz = Blueprint("quiz", __name__)

# Pattern pentru blocul JSON
JSON_BLOCK_PATTERN = re.compile(r"<<<JSON\s*(\[.*?\])\s*JSON;?", re.DOTALL)

import faiss, numpy as np, json
from sentence_transformers import SentenceTransformer

EMBED_MODEL = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
INDEX = faiss.read_index("storage/index.faiss")
with open("storage/meta.json", "r", encoding="utf-8") as f:
    META = json.load(f)

def retrieve_context(module_number: int, k=8):
    # căutare focusată pe modul
    query = f"biologie modul {module_number} rezumat"
    q = EMBED_MODEL.encode([query], convert_to_numpy=True, normalize_embeddings=True)
    D, I = INDEX.search(q, k)

    hits = []
    for idx in I[0]:
        m = META[idx]
        if m["module"] == module_number:
            hits.append(m["text"])

    if not hits:
        # fallback: trimite tot modulul
        path = f"Lessons/biologie/modul{module_number}.txt"
        with open(path, "r", encoding="utf-8") as f:
            return [f.read().strip()]

    # deduplicate și scurtează la 4–6 bucăți
    unique = []
    seen = set()
    for h in hits:
        if h not in seen:
            unique.append(h)
            seen.add(h)
        if len(unique) >= 6:
            break
    return unique

def extract_json_block(text):
    # 1) Încercăm varianta cu marker
    m = JSON_BLOCK_PATTERN.search(text)
    if m:
        raw_json = m.group(1).strip()
        try:
            parsed = json.loads(raw_json)
            return parsed, None
        except Exception as e:
            return None, {"msg": "invalid JSON inside JSON block", "error": str(e), "raw": raw_json}

    # 2) Fallback: dacă textul ÎNSUȘI este un JSON array
    text_stripped = text.strip()
    if text_stripped.startswith("[") and text_stripped.endswith("]"):
        try:
            parsed = json.loads(text_stripped)
            return parsed, None
        except Exception as e:
            return None, {"msg": "invalid raw JSON", "error": str(e), "raw": text}

    return None, {"msg": "no JSON detected", "raw": text}



SYSTEM_RO = """Ești un generator de itemi în limba română.
- Răspunde EXCLUSIV în română.
- Respectă EXACT formatul cerut.
- Nu adăuga text în afara blocului JSON.
"""

def build_prompt(lesson_text):
    # concise, math-focused prompt template (use replace to inject lesson_text)
    template = SYSTEM_RO + """

Generează EXACT 5 întrebări practice în limba română, pe baza textului.
Reguli (FOARTE importante):
1) Răspunde DOAR cu blocul JSON marcat: <<<JSON ... JSON; (fără alt text sau numerotări). Nu adăuga explicații în afara JSON.
2) Fiecare întrebare are EXACT 3 opțiuni; EXACT o singură opțiune corectă.
3) Minimul: 2 întrebări de calcul/rezolvare (ex: calcule concrete, evaluări numerice). Restul: 1 aplicativ, 1 conceptual, 1 problemă scurtă.
4) Câmpul "correct_index" trebuie să fie UN NUMĂR întreg 0-based (0 pentru prima opțiune). Trebuie să fie valoare numerică (ex: 0) — NU string, NU 'A'/'a' sau "1.".
5) Explicațiile: 1–2 propoziții concise, independente de text (pentru calcule, arată pașii foarte scurt).
6) NU include referințe la alte module sau surse — folosește doar textul furnizat ca context.

Exemplu (format exact):
<<<JSON
[
  {
    "question": "Calculează: 27 + 58 = ?",
    "options": ["85", "95", "80"],
    "correct_index": 0,
    "explanation": "27 + 58 = 85.",
    "source_sentence": 0
  }
]
JSON;

TEXT:
{lesson_text}
"""
    return template.replace('{lesson_text}', lesson_text)

# --- NEW: biology-specific prompt for module quizzes
def build_module_prompt(lesson_text):
    template = SYSTEM_RO + """

Generează EXACT 5 întrebări practice în limba română, pe baza textului (BIOLOGIE).
Reguli (FOARTE importante):
1) Răspunde DOAR cu blocul JSON marcat: <<<JSON ... JSON; (fără alt text sau numerotări).
2) Fiecare întrebare are EXACT 3 opțiuni; EXACT o singură opțiune corectă.
3) Structurează întrebările astfel: minim 2 întrebări conceptuale/aplicative (înțelegere și aplicare), 1 întrebarea de definire, 1 de interpretare/integrare și 1 mică problemă/calcul relevantă dacă este aplicabil.
4) Câmpul "correct_index" trebuie să fie UN NUMĂR întreg 0-based (0 pentru prima opțiune).
5) Explicațiile: 1–2 propoziții concise, standalone (nu spune "conform textului").
6) Rămâi concentrat PE TEXTUL FURNIZAT; nu adăuga informații din alte module.

EXEMPLU (format exact):
<<<JSON
[
  {
    "question": "Care organel cellular este principalul loc al producției de ATP?",
    "options": ["Mitocondrie", "Nucleu", "Ribozom"],
    "correct_index": 0,
    "explanation": "Mitocondriile generează ATP în respirația celulară aerobă.",
    "source_sentence": 0
  }
]
JSON;

TEXT:
{lesson_text}
"""
    return template.replace('{lesson_text}', lesson_text)

# ✅ MAIN ENDPOINT (cu header X-Module)
@quiz.route("/biolaureat", methods=["GET"])
def generate_biolaureat_quiz():
    module = request.headers.get("X-Module")

    if not module:
        return jsonify({"msg": "Missing header: X-Module"}), 400

    if not module.isdigit():
        return jsonify({"msg": "X-Module must be numeric"}), 400

    module_path = f"Lessons/biologie/modul{module}.txt"

    if not os.path.isfile(module_path):
        return jsonify({"msg": f"Module {module} not found"}), 404

    with open(module_path, "r", encoding="utf-8") as f:
        lesson_text = f.read()

    # use module-specific prompt (biology) for module quizzes
    prompt = build_module_prompt(lesson_text)
    result = call_ollama_generate(prompt)

    questions, err = extract_json_block(result)
    if err:
        return jsonify(err), 500

    # debug log raw result (truncated) -- we expect model to provide 0-based correct_index per prompt
    try:
        current_app.logger.debug('MODEL RAW (truncated): %s', (result or '')[:2000])
        current_app.logger.debug('Parsed questions: %s', str(questions)[:2000])
    except Exception:
        pass

    return jsonify({
        "module": int(module),
        "questions": questions
    }), 200


# Debug endpoint
@quiz.route("/debug_model", methods=["POST"])
def debug_model():
    prompt = request.json.get("prompt", "Test")
    result = call_ollama_generate(prompt)
    return {"raw": result}


@quiz.route("/generate_text", methods=["POST"])
def generate_from_text():
    body = request.get_json(silent=True) or {}
    lesson_text = body.get("text")
    if not lesson_text:
        return jsonify({"msg": "text required"}), 400

    prompt = build_prompt(lesson_text)
    result = call_ollama_generate(prompt)

    questions, err = extract_json_block(result)
    if err:
        return jsonify(err), 500

    # Note: no post-processing normalization; prompt requests 0-based indices.

    return jsonify({"questions": questions}), 200
