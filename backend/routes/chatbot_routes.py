from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.user import User
from utils.ollama_client import call_ollama_generate
import os
import json

chatbot = Blueprint("chatbot", __name__)

SYSTEM_INSTR = (
    "Ești un asistent virtual specializat în biologie pentru liceu.\n"
    "- Răspunde concis și în limba română.\n"
    "- Folosește DOAR informațiile din contextul furnizat (modulele de biologie ale utilizatorului).\n"
    "- Dacă nu găsești informația în context, răspunde EXACT cu: 'Acest subiect nu este menționat în modulele de biologie pe care le ai.'\n"
    "- NU folosi cunoștințe externe sau generale de biologie.\n"
    "- Furnizează răspunsuri clare, structurate și bazate strict pe conținutul modulelor disponibile.\n"
)


def build_prompt(user_prompt: str, context_text: str | None = None, history: list | None = None) -> str:
    parts = [SYSTEM_INSTR.strip()]

    if context_text:
        parts.append("CONTEXT LECTIE:\n" + context_text.strip())

    # include a short history if provided (user/bot alternating)
    if history:
        hist_lines = ["Istoric conversație:"]
        for msg in history[-6:]:  # keep last few
            who = msg.get("from") or msg.get("role") or "user"
            text = msg.get("text") or ""
            hist_lines.append(f"{who}: {text}")
        parts.append("\n".join(hist_lines))

    parts.append("ÎNTREBAREA UTILIZATORULUI:\n" + user_prompt.strip())

    # ask the model to answer in Romanian and be concise
    parts.append("RESPUNDE ÎN LIMBA ROMÂNĂ, RĂSPUNS CONCIS:")

    return "\n\n".join(parts)


@chatbot.route("/respond", methods=["POST"])  # mounted at /api/chatbot/respond
@jwt_required()
def respond():
    # Get authenticated user
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    body = request.get_json(silent=True) or {}
    prompt = body.get("prompt")
    module_param = body.get("module")  # optional: specific module to query
    # IGNORE context_text from client to prevent bypass
    history = body.get("history")
    
    # optional: max chars to include from combined context (protect model input size)
    max_context_chars = body.get("max_context_chars") or 12000
    try:
        max_context_chars = int(max_context_chars)
    except Exception:
        max_context_chars = 12000

    if not prompt or not str(prompt).strip():
        return jsonify({"msg": "prompt required"}), 400

    # Helper to load modules list from user model (JSON text)
    def _safe_load(s):
        try:
            v = json.loads(s) if s else []
            return [int(x) for x in v] if isinstance(v, list) else []
        except Exception:
            return []

    # Get user's allowed modules (in_progress + completed)
    user_in_prog = _safe_load(getattr(user, "modules_in_progress", "[]"))
    user_completed = _safe_load(getattr(user, "completed_modules", "[]"))
    allowed_modules = sorted(set(user_in_prog + user_completed))

    if not allowed_modules:
        return jsonify({"msg": "Nu ai niciun modul de biologie în progres sau finalizat. Adaugă module în profilul tău pentru a folosi chatbot-ul."}), 400

    # Helper: load text of one module file
    def load_module_text(n):
        p = os.path.join("Lessons", "biologie", f"modul{n}.txt")
        if os.path.isfile(p):
            with open(p, "r", encoding="utf-8") as fh:
                return fh.read()
        return None

    # Build context ONLY from user's allowed modules
    combined_context = None
    modules_to_load = []

    if module_param is not None:
        # User specified specific module(s) - validate against allowed_modules
        if isinstance(module_param, list):
            for m in module_param:
                try:
                    mnum = int(m)
                    if mnum not in allowed_modules:
                        return jsonify({"msg": f"Modulul {mnum} nu este disponibil. Module disponibile: {allowed_modules}"}), 403
                    modules_to_load.append(mnum)
                except Exception:
                    continue
        elif isinstance(module_param, str) and module_param.lower() in ("all", "*", "any"):
            modules_to_load = allowed_modules
        else:
            try:
                mnum = int(module_param)
                if mnum not in allowed_modules:
                    return jsonify({"msg": f"Modulul {mnum} nu este disponibil. Module disponibile: {allowed_modules}"}), 403
                modules_to_load = [mnum]
            except Exception:
                return jsonify({"msg": "module must be numeric, a list of numbers, or 'all'"}), 400
    else:
        # No specific module requested - use all allowed modules
        modules_to_load = allowed_modules

    # Load module texts
    texts = []
    for n in modules_to_load:
        t = load_module_text(n)
        if t:
            texts.append(f"--- Modul {n} ---\n" + t)
        else:
            current_app.logger.warning(f"Module file modul{n}.txt not found")
    
    if not texts:
        return jsonify({"msg": "Nu s-a putut încărca conținutul modulelor"}), 500

    combined_context = "\n\n".join(texts)

    # Trim context_text to max_context_chars to avoid huge prompts
    if combined_context and len(combined_context) > max_context_chars:
        # keep last part (more likely to contain summaries) but you can choose front
        combined_context = combined_context[-max_context_chars:]

    prompt_payload = build_prompt(prompt, context_text=combined_context, history=history)

    try:
        result = call_ollama_generate(prompt_payload)
    except Exception as e:
        current_app.logger.exception("Ollama generate failed")
        return jsonify({"msg": "model error", "error": str(e)}), 500

    return jsonify({"reply": result}), 200
