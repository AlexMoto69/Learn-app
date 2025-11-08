from flask import Blueprint, request, jsonify
import os
import json
import re
from utils.ollama_client import call_ollama_generate

quiz = Blueprint("quiz", __name__)


# ✅ Extract JSON strictly between <<<JSON ... JSON;
JSON_BLOCK_PATTERN = re.compile(r"<<<JSON(.*?)JSON;", re.DOTALL)


def extract_json_block(text):
    """Extract JSON inside <<<JSON ... JSON;"""
    match = JSON_BLOCK_PATTERN.search(text)
    if not match:
        return None, {"msg": "no JSON block found", "raw": text}

    raw_json = match.group(1).strip()

    try:
        parsed = json.loads(raw_json)
    except Exception as e:
        return None, {"msg": "invalid JSON", "error": str(e), "raw": raw_json}

    if not isinstance(parsed, list) or len(parsed) != 5:
        return None, {"msg": "JSON is not an array of 5 items", "raw": parsed}

    return parsed, None


def build_prompt(lesson_text):
    """
    ✅ Uses VERY SIMPLE instructions + delimiters for safe JSON.
    ✅ Guaranteed to work with llama 8B/14B.
    """
    return f"""
Tu ești un generator de întrebări pentru Bacalaureat.

GENEREAZĂ EXACT 5 întrebări de tip grilă bazate STRICT pe textul de mai jos.

FORMAT OBLIGATORIU:
Întoarce DOAR acest bloc:

<<<JSON
[{{"question": "...", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "...", "source_sentence": 1}}, ... 5 items ...]
JSON;

Fără text înainte sau după bloc.

TEXTUL LECȚIEI:
{lesson_text}
"""


# ✅ MAIN ENDPOINT
@quiz.route("/biolaureat", methods=["GET"])
def generate_biolaureat_quiz():
    module = request.args.get("module")

    if not module:
        return jsonify({"msg": "Missing `module` parameter"}), 400

    # allow only numeric modules
    if not module.isdigit():
        return jsonify({"msg": "Module must be a number"}), 400

    filename = f"Lessons/biologie/modul{module}.txt"

    if not os.path.isfile(filename):
        return jsonify({"msg": f"Module {module} not found"}), 404

    with open(filename, "r", encoding="utf-8") as f:
        lesson_text = f.read()

    prompt = build_prompt(lesson_text)
    result = call_ollama_generate(prompt)

    questions, err = extract_json_block(result)
    if err:
        return jsonify(err), 500

    return jsonify({"module": module, "questions": questions}), 200


# ✅ DEBUG ENDPOINT — VERY USEFUL
@quiz.route("/debug_model", methods=["POST"])
def debug_model():
    prompt = request.json.get("prompt", "Test")
    result = call_ollama_generate(prompt)
    return {"raw": result}


# ✅ Generate from text
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

    return jsonify({"questions": questions}), 200
