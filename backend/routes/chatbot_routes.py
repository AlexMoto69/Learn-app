from flask import Blueprint, request, jsonify, current_app
from utils.ollama_client import call_ollama_generate
import os

chatbot = Blueprint("chatbot", __name__)

SYSTEM_INSTR = (
    "Ești un asistent virtual specializat în biologie pentru liceu.\n"
    "- Răspunde concis și în limba română.\n"
    "- Dacă ți se dă un context (textul unei lecții sau numărul unui modul), folosește informațiile din acel context ca primă sursă.\n"
    "- Dacă nu găsești informația în context, poți folosi cunoștințe generale de biologie, dar evită speculațiile nefondate; dacă nu știi, spune 'Nu știu'.\n"
    "- Furnizează răspunsuri clare, structurate și, când e util, include un scurt exemplu sau o referință la sursa din context (de ex. 'conform lecției, paragraful X').\n"
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
def respond():
    body = request.get_json(silent=True) or {}
    prompt = body.get("prompt")
    module = body.get("module")
    context_text = body.get("context_text")
    history = body.get("history")
    # optional: max chars to include from combined context (protect model input size)
    max_context_chars = body.get("max_context_chars") or 12000
    try:
        max_context_chars = int(max_context_chars)
    except Exception:
        max_context_chars = 12000

    if not prompt or not str(prompt).strip():
        return jsonify({"msg": "prompt required"}), 400

    # Helper: load text of one module file
    def load_module_text(n):
        p = os.path.join("Lessons", "biologie", f"modul{n}.txt")
        if os.path.isfile(p):
            with open(p, "r", encoding="utf-8") as fh:
                return fh.read()
        return None

    # If module provided, it can be:
    # - an integer (single module)
    # - a list of integers
    # - the string "all" (or None) meaning all modules
    combined_context = None
    if module is not None:
        # normalize module param
        if isinstance(module, list):
            nums = []
            for m in module:
                try:
                    nums.append(int(m))
                except Exception:
                    continue
            texts = []
            for n in nums:
                t = load_module_text(n)
                if t is None:
                    return jsonify({"msg": f"module {n} not found"}), 404
                texts.append(f"--- Modul {n} ---\n" + t)
            combined_context = "\n\n".join(texts)
        elif isinstance(module, str) and module.lower() in ("all", "*", "any"):
            # read all module files in the folder
            lessons_dir = os.path.join("Lessons", "biologie")
            if os.path.isdir(lessons_dir):
                files = sorted([f for f in os.listdir(lessons_dir) if f.startswith("modul") and f.endswith(".txt")])
                texts = []
                for fn in files:
                    mnum = ''.join(filter(str.isdigit, fn))
                    t = load_module_text(mnum)
                    if t:
                        texts.append(f"--- Modul {mnum} ---\n" + t)
                combined_context = "\n\n".join(texts)
            else:
                return jsonify({"msg": "lessons directory not found"}), 404
        else:
            # try treat as single numeric module
            try:
                module_num = int(module)
            except Exception:
                return jsonify({"msg": "module must be numeric, a list of numbers, or 'all'"}), 400
            t = load_module_text(module_num)
            if t is None:
                return jsonify({"msg": f"module {module_num} not found"}), 404
            combined_context = t

    # If combined_context was built from modules, merge with explicit context_text
    if combined_context:
        if context_text:
            context_text = context_text + "\n\n" + combined_context
        else:
            context_text = combined_context

    # If no module provided and no explicit context_text, we leave context_text as-is (None)

    # Trim context_text to max_context_chars to avoid huge prompts
    if context_text:
        if len(context_text) > max_context_chars:
            # keep last part (more likely to contain summaries) but you can choose front
            context_text = context_text[-max_context_chars:]

    prompt_payload = build_prompt(prompt, context_text=context_text, history=history)

    try:
        result = call_ollama_generate(prompt_payload)
    except Exception as e:
        current_app.logger.exception("Ollama generate failed")
        return jsonify({"msg": "model error", "error": str(e)}), 500

    return jsonify({"reply": result}), 200
