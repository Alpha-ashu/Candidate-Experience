# Backend (FastAPI + MongoDB + AI Proxy)

This backend implements the secure, server‑side interview engine described in the project spec. It exposes REST + WebSocket APIs, persists state in MongoDB, and proxies AI requests to OpenAI/Gemini without exposing provider keys to the browser.

## Features

- FastAPI app with CORS and HttpOnly session cookies
- JWT auth with scoped, short‑lived tokens (IST, WST, AIPT, UPT, ACET)
- State machine: Setup → Precheck → Ready → Active → Completed/Ended
- Append‑only collections: sessions, questions, answers, anti‑cheat events, strikes, summaries, media
- AI Proxy for questions/summaries using server‑side provider keys (OpenAI/Gemini)
- WebSocket stream for live events (QUESTION_CREATED, STRIKE_CREATED)
- Upload endpoint protected by UPT (pre‑signed style token)

## Quick Start

1) Environment

- Python 3.10+
- MongoDB (Atlas or local)

Environment variables (example `.env.local`):

```
MONGODB_URI=mongodb://localhost:27017
DB_NAME=cx
AUTH_SECRET=replace_me_with_long_random_string
COOKIE_SECURE=false
ALLOWED_ORIGINS=http://localhost:3000
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
AI_PROVIDER=openai  # or gemini
```

2) Install and run

```
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

3) Frontend configuration

- Point the frontend to `http://localhost:8000` for API calls.
- Cookies are HttpOnly; ensure same origin or configure CORS and `withCredentials` as needed.

## Endpoints (high‑level)

- POST `/auth/login` → sets HttpOnly session cookie + returns user JWT (candidate role)
- POST `/interview/sessions` → create session (PendingPrecheck) [User JWT]
- POST `/interview/{id}/precheck` → submit anti‑cheat batch + status [IST + ACET]
- POST `/interview/{id}/start` → transition to Ready → issue WST/AIPT/UPT
- WS   `/interview/{id}/stream?token=<WST>` → live events
- POST `/interview/{id}/next-question` → proxy to AI, persist, emit QUESTION_CREATED [AIPT]
- POST `/interview/{id}/answer` → persist answer first [IST]
- POST `/interview/{id}/finalize` → generate summary, seal session [IST]
- GET  `/interview/{id}/summary` → fetch summary [User JWT]
- POST `/interview/{id}/token/refresh` → rotate IST/WST using session cookie
- POST `/media/upload` → upload media using UPT

## Notes

- Provider keys never reach the browser. Only the backend AI Proxy talks to OpenAI/Gemini.
- Tokens are short‑lived (≤15m) and scoped. All token claims include `aud`, `scope[]`, `sessionId` where applicable, `exp`, `iat`, `jti`.
- Anti‑cheat events are signed by authorization (ACET) and chained by `prevHash` to be tamper‑evident.

## Next steps

- Replace in‑process WebSocket broadcaster with Redis for multi‑instance deployments
- Add rate limiting and usage caps
- Integrate object storage for pre‑signed uploads (S3/GCS) instead of local endpoint
- Add more robust policy rules and a separate policy engine file
