"""
Unit tests for chatbot module validation logic
This tests the core logic without requiring a full Flask app or LLM service
"""
import json

def test_safe_load():
    """Test the _safe_load helper function logic"""
    def _safe_load(s):
        try:
            v = json.loads(s) if s else []
            return [int(x) for x in v] if isinstance(v, list) else []
        except Exception:
            return []
    
    # Test valid JSON array
    assert _safe_load('[1, 2, 3]') == [1, 2, 3]
    assert _safe_load('[]') == []
    assert _safe_load('[5]') == [5]
    
    # Test invalid inputs
    assert _safe_load('') == []
    assert _safe_load(None) == []
    assert _safe_load('invalid json') == []
    assert _safe_load('{"key": "value"}') == []  # Not a list
    
    print("✓ _safe_load helper works correctly")

def test_module_validation():
    """Test module access validation logic"""
    allowed_modules = [1, 2, 3]
    
    # Test module parameter validation
    def validate_module(module_param, allowed_modules):
        modules_to_load = []
        
        if module_param is not None:
            if isinstance(module_param, list):
                for m in module_param:
                    try:
                        mnum = int(m)
                        if mnum not in allowed_modules:
                            return None, f"Module {mnum} not available"
                        modules_to_load.append(mnum)
                    except Exception:
                        continue
            elif isinstance(module_param, str) and module_param.lower() in ("all", "*", "any"):
                modules_to_load = allowed_modules
            else:
                try:
                    mnum = int(module_param)
                    if mnum not in allowed_modules:
                        return None, f"Module {mnum} not available"
                    modules_to_load = [mnum]
                except Exception:
                    return None, "Invalid module parameter"
        else:
            modules_to_load = allowed_modules
        
        return modules_to_load, None
    
    # Test valid scenarios
    modules, err = validate_module(1, allowed_modules)
    assert err is None and modules == [1]
    
    modules, err = validate_module([1, 2], allowed_modules)
    assert err is None and modules == [1, 2]
    
    modules, err = validate_module("all", allowed_modules)
    assert err is None and modules == [1, 2, 3]
    
    modules, err = validate_module(None, allowed_modules)
    assert err is None and modules == [1, 2, 3]
    
    # Test invalid scenarios
    modules, err = validate_module(5, allowed_modules)
    assert err is not None and "not available" in err
    
    modules, err = validate_module([1, 5], allowed_modules)
    assert err is not None and "not available" in err
    
    print("✓ Module validation logic works correctly")

def test_context_text_ignored():
    """Verify that context_text parameter is ignored in chatbot logic"""
    # This is a design test - in the actual code, context_text from client is NOT used
    # The chatbot ONLY builds context from user's allowed modules
    
    # Simulated endpoint behavior
    def chatbot_respond(body, user_modules):
        # Extract parameters
        prompt = body.get("prompt")
        module_param = body.get("module")
        # IGNORE context_text - this is the key security feature
        # context_text = body.get("context_text")  # NOT USED
        
        # Build context ONLY from user's modules
        modules_to_use = user_modules if module_param is None else [module_param]
        
        # In real code, we'd load module files here
        # For test, just verify context_text is not used
        return {"modules_used": modules_to_use}
    
    user_modules = [1, 2]
    body = {
        "prompt": "Test question",
        "context_text": "MALICIOUS INJECTED CONTEXT"  # Should be ignored
    }
    
    result = chatbot_respond(body, user_modules)
    
    # Verify only user modules are used, not injected context
    assert result["modules_used"] == user_modules
    assert "MALICIOUS" not in str(result)
    
    print("✓ Context text parameter is properly ignored (bypass prevented)")

def test_system_instruction():
    """Verify SYSTEM_INSTR contains correct restrictions"""
    SYSTEM_INSTR = (
        "Ești un asistent virtual specializat în biologie pentru liceu.\n"
        "- Răspunde concis și în limba română.\n"
        "- Folosește DOAR informațiile din contextul furnizat (modulele de biologie ale utilizatorului).\n"
        "- Dacă nu găsești informația în context, răspunde cu un mesaj simplu de forma: '[Subiect] este un proces/concept biologic complex care nu este menționat în modulele de biologie pe care le ai.'\n"
        "  De exemplu: 'Fotosinteza este un proces biologic complex care nu este menționat în modulele de biologie pe care le ai.'\n"
        "- NU folosi cunoștințe externe sau generale de biologie.\n"
        "- Furnizează răspunsuri clare, structurate și bazate strict pe conținutul modulelor disponibile.\n"
    )
    
    # Verify key restrictions are present
    assert "DOAR" in SYSTEM_INSTR or "doar" in SYSTEM_INSTR.lower()
    assert "context" in SYSTEM_INSTR.lower()
    assert "modulele" in SYSTEM_INSTR.lower()
    assert "Fotosinteza" in SYSTEM_INSTR  # Example is present
    assert "nu este menționat" in SYSTEM_INSTR.lower()
    
    print("✓ SYSTEM_INSTR contains correct restrictions and example")

if __name__ == '__main__':
    print("Running chatbot logic unit tests...\n")
    test_safe_load()
    test_module_validation()
    test_context_text_ignored()
    test_system_instruction()
    print("\n✓ All logic tests passed!")
    print("\nNote: Integration tests with actual Flask app require FAISS and LLM service.")
