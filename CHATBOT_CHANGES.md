# Chatbot Module-Based Restriction - Implementation Summary

## Overview
The chatbot endpoint has been updated to restrict responses based on the user's enrolled modules, preventing unauthorized access to content and ensuring responses are based only on the user's learning materials.

## Key Changes

### 1. JWT Authentication Required
- Endpoint now requires valid JWT token
- Users must be authenticated to use the chatbot
- Returns 404 if user not found

### 2. Module-Based Access Control
- Chatbot only loads content from user's modules:
  - `modules_in_progress`: Modules user is currently studying
  - `completed_modules`: Modules user has completed
- User must have at least one module to use chatbot
- Returns helpful error message if no modules available

### 3. Module Validation
- When user specifies a module parameter, it's validated against their allowed modules
- Unauthorized module access returns 403 Forbidden with list of available modules
- Supports:
  - Single module: `module: 1`
  - Multiple modules: `module: [1, 2, 3]`
  - All user's modules: `module: "all"` or no module parameter

### 4. Security - Context Bypass Prevention
- **CRITICAL**: Client-sent `context_text` parameter is now IGNORED
- This prevents users from injecting arbitrary content to bypass module restrictions
- Context is built ONLY from server-side module files based on user's permissions

### 5. Standard Message for Unavailable Topics
When the chatbot is asked about topics not covered in the user's modules, it responds with a standard message format:

**Example:**
```
User asks: "Ce este fotosinteza?"
Response: "Fotosinteza este un proces biologic complex care nu este menționat în modulele de biologie pe care le ai."
```

This is enforced via the updated SYSTEM_INSTR prompt.

### 6. Updated System Instructions
```
SYSTEM_INSTR = (
    "Ești un asistent virtual specializat în biologie pentru liceu.\n"
    "- Răspunde concis și în limba română.\n"
    "- Folosește DOAR informațiile din contextul furnizat (modulele de biologie ale utilizatorului).\n"
    "- Dacă nu găsești informația în context, răspunde cu un mesaj simplu de forma: '[Subiect] este un proces/concept biologic complex care nu este menționat în modulele de biologie pe care le ai.'\n"
    "  De exemplu: 'Fotosinteza este un proces biologic complex care nu este menționat în modulele de biologie pe care le ai.'\n"
    "- NU folosi cunoștințe externe sau generale de biologie.\n"
    "- Furnizează răspunsuri clare, structurate și bazate strict pe conținutul modulelor disponibile.\n"
)
```

## API Changes

### Before
```json
POST /api/chatbot/respond
{
  "prompt": "Ce este fotosinteza?",
  "context_text": "ARBITRARY CONTENT",  // Could be abused
  "module": 5  // No validation
}
```

### After
```json
POST /api/chatbot/respond
Headers: {
  "Authorization": "Bearer <JWT_TOKEN>"  // REQUIRED
}
{
  "prompt": "Ce este fotosinteza?",
  "module": 1  // Validated against user's modules
  // context_text is IGNORED
}
```

## Response Examples

### Success - Topic in User's Modules
```json
{
  "reply": "Celula este unitatea structurală și funcțională de bază a organismului..."
}
```

### Success - Topic NOT in User's Modules
```json
{
  "reply": "Fotosinteza este un proces biologic complex care nu este menționat în modulele de biologie pe care le ai."
}
```

### Error - No JWT Token
```json
HTTP 401 Unauthorized
{
  "msg": "Missing Authorization Header"
}
```

### Error - No Modules
```json
HTTP 400 Bad Request
{
  "msg": "Nu ai niciun modul de biologie în progres sau finalizat. Adaugă module în profilul tău pentru a folosi chatbot-ul."
}
```

### Error - Unauthorized Module
```json
HTTP 403 Forbidden
{
  "msg": "Modulul 5 nu este disponibil. Module disponibile: [1, 2, 3]"
}
```

## Testing

Unit tests added in `backend/tests/test_chatbot_logic.py`:
- ✓ Module JSON loading and validation
- ✓ Module access validation
- ✓ Context text bypass prevention
- ✓ System instruction validation

Run tests:
```bash
cd backend
python tests/test_chatbot_logic.py
```

## Files Changed
- `backend/routes/chatbot_routes.py` - Main implementation
- `backend/tests/test_chatbot_logic.py` - Unit tests
- `backend/tests/test_chatbot.py` - Integration tests (requires full Flask app)
- `.gitignore` - Added to exclude Python cache files

## Security Considerations

### Protected Against:
1. **Unauthorized Access**: JWT authentication required
2. **Module Bypass**: Client cannot access modules they don't have
3. **Context Injection**: Client-sent context is ignored
4. **Information Leakage**: Standard message for unavailable topics doesn't reveal content

### Best Practices:
- Keep JWT secret secure
- Rotate tokens regularly
- Validate all user input
- Log suspicious access attempts

## Migration Notes

### For Existing Deployments:
1. Ensure database has `modules_in_progress` and `completed_modules` columns in User table
2. Run migration script if needed: `python scripts/apply_db_alter_env.py`
3. Update frontend to send JWT token with chatbot requests
4. Update frontend to handle new error responses
5. Inform users they need modules to use chatbot

### For Frontend Integration:
```javascript
// Before making chatbot request, ensure user is logged in
const token = localStorage.getItem('access_token');
if (!token) {
  // Redirect to login
}

// Make chatbot request with token
const response = await fetch('/api/chatbot/respond', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    prompt: userQuestion,
    module: selectedModule || "all"  // optional
  })
});

// Handle new error cases
if (response.status === 400) {
  // User has no modules - guide them to profile
}
if (response.status === 403) {
  // Requested module not available - show available modules
}
```

## Future Enhancements

Potential improvements:
1. Cache module content per user session to reduce file I/O
2. Add telemetry to track which modules users query most
3. Add rate limiting per user to prevent abuse
4. Add module content search/indexing for faster context retrieval
5. Support for module-specific fine-tuned models
