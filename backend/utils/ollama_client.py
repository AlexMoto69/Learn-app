from flask import current_app
import httpx
import json

def call_ollama_generate(prompt: str, max_tokens: int | None = None):
    url = current_app.config["OLLAMA_URL"]
    model = current_app.config["OLLAMA_MODEL"]

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False   # ✅ streaming off
    }

    if max_tokens:
        payload["max_tokens"] = int(max_tokens)

    try:
        r = httpx.post(url, json=payload, timeout=120)
        r.raise_for_status()
    except Exception as e:
        raise RuntimeError(f"Ollama request failed: {e}")

    data = r.json()

    output = data.get("response")

    # dacă modelul a returnat altceva decât string
    if output is None:
        return "<<<ERROR>>> Empty response from model."

    # asigură-te că e string
    if not isinstance(output, str):
        try:
            output = str(output)
        except:
            return "<<<ERROR>>> Could not convert model output to string."

    output = output.strip()

    # ✅ Some models wrap JSON in triple backticks
    if output.startswith("```"):
        output = output.strip("`").strip()

    # ✅ If JSON is in quotes, unescape
    if output.startswith('"') and output.endswith('"'):
        try:
            output = json.loads(output)
        except:
            pass

    return output
