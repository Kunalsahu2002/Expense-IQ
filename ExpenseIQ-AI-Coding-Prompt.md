# Prompt for Antigravity/Claude Code/Gemini

Copy-paste everything below into your AI coding tool, with `ExpenseIQ-Architecture-Plan.md` attached/uploaded in the same project folder.

---

I'm building a production-grade full-stack project called **ExpenseIQ** — an AI receipt-parsing expense tracker where AI extraction is never trusted directly; it must pass through deterministic validation, duplicate-detection, and audit-logging before touching the database. I've attached the full architecture document (`ExpenseIQ-Architecture-Plan.md`) — read it completely first.

**Before writing any code:**
1. Read `ExpenseIQ-Architecture-Plan.md` in full.
2. Summarize back to me: the data model, the AI guardrail pipeline (steps 1–7 in section 4), and the build order (section 8).
3. Confirm you understand the core principle: **"AI proposes, deterministic code decides."** AI-sourced and manually-entered expenses must go through the exact same write function — there is no separate, less-scrutinized path for AI output.
4. Do not generate the entire codebase in one shot. Build one phase at a time, in the exact order listed in section 8 of the plan, and wait for my confirmation after each phase before moving to the next.

**Non-negotiable engineering standards to apply throughout (not just where the plan explicitly says so):**
- Every request body is validated with Zod before it touches business logic — not just the AI-extraction endpoint.
- No secrets, API keys, or connection strings hardcoded anywhere — everything via `process.env`, and generate a `.env.example` (with placeholder values only) alongside real `.env` usage.
- Every database write that matters (expense creation, budget changes) has a corresponding audit log entry — success and failure/rejection cases both.
- Consistent error handling: a single Express error-handling middleware, structured JSON error responses (`{ error: { code, message } }`), correct HTTP status codes (400 for validation, 401/403 for auth, 404, 429 for rate limit, 500 for server errors) — no bare `try/catch` with inconsistent responses scattered across routes.
- Input sanitization on all user-supplied text fields (vendor name, description) before storage.
- Rate limiting (Redis) specifically on the `/api/expenses/scan` endpoint, since it triggers a paid/limited external AI call.
- Passwords hashed with bcrypt (cost factor 10+), JWT secrets long and random, tokens expire (don't issue forever-valid tokens).
- Prisma migrations committed properly (not just `db push`), so schema history is traceable.
- Write basic tests (Jest + Supertest) for the guardrail pipeline specifically: a test that feeds a malformed AI response and asserts it's rejected and logged, and a test that submits a duplicate receipt and asserts it's flagged, not silently duplicated.
- README with an architecture diagram description, matching the style referenced in the plan (clear "what breaks without this control" explanation), not just a generic setup guide.
- Code should be organized in clear modules/layers matching section 3–4 of the plan (e.g. `services/ai/`, `services/validation/`, `services/expenses/`, `routes/`, `middleware/`) — not one giant `index.js`.

**Build order to follow (from the plan, section 8):**
Phase 1: Prisma schema + Express skeleton + JWT auth
Phase 2: Manual expense CRUD (no AI yet) — this is the baseline the guardrail pipeline will later share
Phase 3: AI guardrail pipeline — Groq extraction → Zod validation → hash-based dedup → audit log (this is the core of the project — take the most care here)
Phase 4: Aggregations, Redis caching, natural-language insights, deterministic budget alerts
Phase 5: Frontend (Next.js) — auth pages, dashboard, the AI-proposal confirmation screen (user must see and confirm AI-extracted data before it's saved — do not auto-save on scan)
Phase 6: Docker, deployment config for Vercel/Render/Neon/Upstash, rate limiting hardening
Phase 7: Tests, README, final polish

At each phase: explain what you built and why, flag any assumptions or deviations from the plan, and wait for my go-ahead before continuing.
