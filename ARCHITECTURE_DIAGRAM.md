# Architecture Diagram - Chatbot Module Restriction

## Before Implementation ❌

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ POST /api/chatbot/respond
       │ { prompt, context_text: "ANY CONTENT" }
       │ No authentication required
       │
       ▼
┌─────────────────────────┐
│  Chatbot Endpoint       │
│  - No JWT check         │
│  - Accepts context_text │
│  - No module validation │
└──────────┬──────────────┘
           │
           │ Uses injected context
           │
           ▼
    ┌──────────────┐
    │  LLM Model   │
    │  (Ollama)    │
    └──────┬───────┘
           │
           │ Response
           │
           ▼
    ┌──────────────┐
    │    Client    │
    │   (Reply)    │
    └──────────────┘

ISSUES:
❌ No authentication
❌ Context injection possible
❌ Unrestricted module access
❌ Generic error messages
```

## After Implementation ✅

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ POST /api/chatbot/respond
       │ Authorization: Bearer <JWT>
       │ { prompt, module }
       │ (context_text ignored)
       │
       ▼
┌────────────────────────────────────┐
│  JWT Authentication Middleware     │
│  ✓ Validate token                  │
│  ✓ Extract user_id                 │
└────────────┬───────────────────────┘
             │
             │ Valid token
             │
             ▼
┌────────────────────────────────────┐
│  Load User from Database           │
│  ✓ Get user by ID                  │
│  ✓ Extract modules_in_progress     │
│  ✓ Extract completed_modules       │
└────────────┬───────────────────────┘
             │
             │ User: { modules: [1, 2, 3] }
             │
             ▼
┌────────────────────────────────────┐
│  Module Access Validation          │
│  ✓ Check user has modules          │
│  ✓ Validate requested module       │
│  ✓ Build allowed_modules list      │
└────────────┬───────────────────────┘
             │
             ├─────► No modules?
             │       └─► 400: "Adaugă module..."
             │
             ├─────► Unauthorized module?
             │       └─► 403: "Modulul X nu este disponibil..."
             │
             │ ✓ Authorized
             │
             ▼
┌────────────────────────────────────┐
│  Build Context (Server-Side Only) │
│  ✓ Load module files from disk     │
│  ✓ Combine allowed modules only    │
│  ✓ Trim to max length              │
└────────────┬───────────────────────┘
             │
             │ Context from modules [1, 2, 3]
             │
             ▼
┌────────────────────────────────────┐
│  Prepare LLM Prompt                │
│  ✓ Add SYSTEM_INSTR                │
│  ✓ Add module context              │
│  ✓ Add user prompt                 │
│  ✓ Include standard msg format     │
└────────────┬───────────────────────┘
             │
             │ Full prompt with instructions
             │
             ▼
┌────────────────────────────────────┐
│  LLM Model (Ollama/Gmini)          │
│  Processes prompt with context     │
│  Uses ONLY provided context        │
│  Applies standard message rule     │
└────────────┬───────────────────────┘
             │
             │ Response
             │
             ▼
┌────────────────────────────────────┐
│  Return Response to Client         │
│  ✓ 200 OK: Reply (in modules)      │
│  ✓ 200 OK: Standard msg (not in)   │
│  ✓ 400/403: Error messages         │
└────────────┬───────────────────────┘
             │
             ▼
      ┌──────────────┐
      │    Client    │
      │   (Reply)    │
      └──────────────┘

IMPROVEMENTS:
✅ JWT authentication required
✅ Module access validated
✅ Context injection prevented
✅ Standard message for unavailable topics
✅ Clear error messages
```

## Data Flow Example: "Ce este fotosinteza?"

### Step 1: Request
```
POST /api/chatbot/respond
Authorization: Bearer eyJ0eXAiOiJKV1Qi...
{
  "prompt": "Ce este fotosinteza?"
}
```

### Step 2: Authentication
```
JWT Middleware
├─ Decode token: Valid ✓
└─ Extract user_id: 123
```

### Step 3: Load User
```
Database Query
├─ User ID: 123
├─ modules_in_progress: [1, 2]
├─ completed_modules: [3]
└─ allowed_modules: [1, 2, 3]
```

### Step 4: Build Context
```
Load Module Files
├─ modul1.txt (System & Anatomy)
├─ modul2.txt (Biochemistry)
└─ modul3.txt (Cell Biology)

Search for "fotosinteza":
├─ Not in modul1.txt ✗
├─ Not in modul2.txt ✗
└─ Not in modul3.txt ✗
```

### Step 5: Prepare Prompt
```
SYSTEM_INSTR:
"- Folosește DOAR informațiile din context
 - Dacă nu găsești informația, răspunde cu mesaj standard:
   '[Subiect] este un proces biologic complex care nu este
    menționat în modulele de biologie pe care le ai.'"

CONTEXT:
[Content from modul1, modul2, modul3]

USER PROMPT:
"Ce este fotosinteza?"
```

### Step 6: LLM Response
```
Model analyzes context:
├─ Search for "fotosinteza" in context: Not found
├─ Apply standard message rule
└─ Generate response with topic name
```

### Step 7: Return Response
```
200 OK
{
  "reply": "Fotosinteza este un proces biologic complex 
            care nu este menționat în modulele de biologie 
            pe care le ai."
}
```

## Security Flow

```
┌──────────────┐
│  Client      │
└──────┬───────┘
       │
       ├─────────────────────────────┐
       │                             │
       ▼                             ▼
┌─────────────────┐         ┌──────────────────┐
│ Valid JWT?      │         │ Try to inject    │
│ YES → Continue  │         │ context_text?    │
│ NO → 401        │         │ IGNORED → Safe   │
└─────────┬───────┘         └──────────────────┘
          │
          ▼
┌──────────────────────────────┐
│ User has modules?            │
│ YES → Load modules           │
│ NO → 400 "Add modules..."    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Module access authorized?    │
│ YES → Load content           │
│ NO → 403 "Not available..."  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Build context from           │
│ SERVER-SIDE FILES ONLY       │
│ (Client cannot inject)       │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Send to LLM with             │
│ strict instructions          │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Return response              │
│ (standard msg if not found)  │
└──────────────────────────────┘
```

## Module Validation Flow

```
User requests module 5
        │
        ▼
┌─────────────────────┐
│ Load user's modules │
│ allowed: [1, 2, 3]  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Is 5 in [1,2,3]?    │
└─────────┬───────────┘
          │
          ├─── YES → Load modul5.txt
          │
          └─── NO → ┌──────────────────────────┐
                    │ 403 Forbidden            │
                    │ "Modulul 5 nu este       │
                    │  disponibil. Module      │
                    │  disponibile: [1, 2, 3]" │
                    └──────────────────────────┘
```

## Context Building Process

```
User's Modules: [1, 2, 3]
        │
        ▼
┌────────────────────────────────┐
│ For each module in [1, 2, 3]:  │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Load modul1.txt         │   │
│  │ → "--- Modul 1 ---\n..."│   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Load modul2.txt         │   │
│  │ → "--- Modul 2 ---\n..."│   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Load modul3.txt         │   │
│  │ → "--- Modul 3 ---\n..."│   │
│  └─────────────────────────┘   │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│ Combine all module texts       │
│ context = "\n\n".join(texts)   │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│ Trim to max 12,000 characters  │
│ (keep last part for summaries) │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│ Send to LLM with SYSTEM_INSTR  │
└────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────┐
│ Client Request  │
└────────┬────────┘
         │
         ├──► No JWT token?
         │    └─► 401 Unauthorized
         │
         ├──► User not found?
         │    └─► 404 Not Found
         │
         ├──► No modules?
         │    └─► 400 "Adaugă module..."
         │
         ├──► Unauthorized module?
         │    └─► 403 "Modulul X nu este disponibil..."
         │
         ├──► Module file missing?
         │    └─► 500 "Nu s-a putut încărca..."
         │
         ├──► LLM service error?
         │    └─► 500 "model error"
         │
         └──► Success
              └─► 200 OK + reply
```

## Comparison: Old vs New

| Aspect | Before | After |
|--------|--------|-------|
| **Authentication** | ❌ None | ✅ JWT Required |
| **Module Access** | ❌ Any module | ✅ Validated |
| **Context Source** | ⚠️ Client + Server | ✅ Server Only |
| **Context Injection** | ❌ Vulnerable | ✅ Prevented |
| **Standard Message** | ❌ No | ✅ Yes |
| **Error Messages** | ⚠️ Generic | ✅ User-friendly |
| **Security Scan** | ❓ Not checked | ✅ 0 vulnerabilities |
| **Tests** | ❌ None | ✅ Comprehensive |

## Key Takeaways

1. **Security First**: JWT + validation = secure endpoint
2. **User Experience**: Standard message provides clarity
3. **Bypass Prevention**: Server-side context only
4. **Clear Errors**: User knows exactly what's wrong
5. **Well Tested**: Unit tests ensure reliability
6. **Well Documented**: Easy to maintain and extend

---

**Implementation follows security best practices while improving user experience!** 🎉
