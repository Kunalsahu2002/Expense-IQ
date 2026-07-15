# ExpenseIQ — Architecture & Build Plan
### AI Receipt Parser with Policy-Enforcement Layer

---

## 1. Core Design Philosophy

> **"AI proposes, deterministic code decides."**

Every AI output in this system is treated as **untrusted input**. It never touches the database directly. It always passes through: schema validation → business-rule validation → duplicate detection, before being written to the ledger. This principle must be visible in the code structure itself — AI service functions return *suggestions only*; a separate, AI-independent function performs the actual write.

This is the single idea that separates ExpenseIQ from every generic "AI expense tracker" tutorial on YouTube.

---

## 2. Tech Stack (Final)

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), Tailwind CSS, shadcn/ui, Recharts |
| Backend | Node.js + Express (separate REST API, not Next.js server actions) |
| Database | PostgreSQL + Prisma ORM |
| Cache / Rate-limit | Redis (Upstash) |
| AI | Groq API (`llama-3.3-70b-versatile`) |
| Validation | Zod |
| Auth | JWT (jsonwebtoken) + bcrypt — self-built, no third-party auth service |
| File upload | Multer |
| Testing | Jest + Supertest (backend) |
| Deployment | Vercel (frontend) · Render (backend) · Neon (Postgres) · Upstash (Redis) |
| Containerization | Docker (multi-stage) — mirrors your VRIZE CI/CD experience |

---

## 3. Data Model (Prisma Schema — conceptual)

```
User
 ├─ id, email, passwordHash, name, createdAt
 ├─ role: USER | ADMIN
 └─ monthlyBudget (optional, per category)

Expense (the ledger — append-only in spirit)
 ├─ id, userId, amount, category, vendor, date
 ├─ description, receiptUrl
 ├─ sourceHash        ← hash(vendor + amount + date) for dedup
 ├─ createdBy: AI | MANUAL
 ├─ aiConfidence (optional, if you want to show it in UI)
 └─ createdAt, updatedAt

ExpenseAuditLog (append-only, immutable)
 ├─ id, expenseId, userId, action (CREATED | FLAGGED_DUPLICATE | REJECTED)
 ├─ rawAiOutput (JSON, for debugging/trust — store what AI actually said)
 ├─ validationResult (PASSED | FAILED + reason)
 └─ timestamp

Category (fixed enum, not free text)
 ├─ housing, food, travel, shopping, utilities, health, entertainment, other

BudgetAlert
 ├─ id, userId, category, threshold, triggeredAt
```

Key design choice: `Expense` rows are never hard-deleted or silently edited once created from a receipt — corrections create a new audit entry, so financial history stays traceable. This is your "tamper-evident" story, simplified from QuerySense's audit pattern.

---

## 4. The AI Guardrail Pipeline (the heart of the project)

This is what you should be able to draw on a whiteboard in an interview.

```
1. User uploads receipt image → Multer → temp storage
2. Rate limit check (Redis, per-user, e.g. 20 uploads/hour) → 429 if exceeded
3. Image sent to Groq (vision-capable model or OCR text + LLM) with a strict prompt:
   "Return ONLY valid JSON: { amount, date, vendor, category, description }"
4. Raw AI response is NEVER trusted:
   a. Parse JSON — if parse fails, reject immediately, log to audit as FAILED
   b. Zod schema validation:
      - amount: positive number, max 2 decimal places, under a sane upper bound
      - date: valid ISO date, not in the future, not older than X years
      - category: must be one of the fixed enum values (if AI invents a category,
        map to "other" — never let free-text categories into the DB)
      - vendor: non-empty string, max length cap (prevent AI going off the rails)
   c. If validation fails → reject, log to ExpenseAuditLog with reason, return
      error to user asking for manual entry — AI failure never blocks the user
5. Duplicate detection (deterministic, not AI-judged):
   - Compute sourceHash = SHA256(vendor + amount + date, normalized)
   - Query DB for existing expense with same hash for this user
   - If found → flag as duplicate, do NOT auto-reject; show user a confirmation
     ("This looks like a receipt you already added on [date] — add anyway?")
6. Only after steps 4 and 5 pass does the write happen — via a single service
   function (e.g. createExpense()) that both the AI path and the manual-entry
   path call. AI never has its own separate write path.
7. Every attempt (success, validation failure, duplicate flag) is written to
   ExpenseAuditLog — mirrors QuerySense's audit trail concept.
```

**Interview one-liner:** "The AI never writes to my database. It proposes a JSON object, which then has to survive schema validation and a deterministic duplicate check — the same function creates an expense whether the data came from AI or manual entry, so there's no special trusted path for AI output."

---

## 5. Secondary AI Feature — Natural-Language Monthly Insights

Separate, lower-stakes AI use case — good for showing you understand *where* AI is safe to use more loosely (insights/explanations) vs. where it must be tightly guarded (financial writes).

- Backend aggregates spending data deterministically (pure SQL/Prisma queries — totals, category breakdowns, month-over-month deltas)
- This structured, already-correct data is passed to Groq **only to phrase it in natural language** ("Food spending rose 40% this month, mostly weekend orders")
- AI is not allowed to invent numbers — it only narrates numbers your code already computed. Cache the result in Redis (invalidate when new expenses are added that month) so you're not re-generating on every dashboard load.

This is the same "AI proposes, code decides" pattern applied to a read-only feature, which shows range.

---

## 6. Budget Alerts (deterministic threshold logic)

- User sets a monthly budget per category (plain number, user-entered — not AI)
- A backend job (can be a simple cron/interval check, or triggered on each new expense) computes: `categorySpend / categoryBudget`
- Thresholds (50%, 90%, 100%) are checked with plain `if` statements — zero AI involvement in the decision
- Once a threshold is crossed, **AI is called only to write the notification message** ("You've used 92% of your Food budget with 6 days left in the month")
- Prevents the classic mistake of asking an LLM "should I alert the user" — that decision must never be probabilistic

---

## 7. REST API Design

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | Create account (bcrypt hash) |
| POST | `/auth/login` | public | Returns JWT |
| POST | `/api/expenses/scan` | JWT | Upload receipt → AI extraction → guardrail pipeline → returns proposed expense (not yet saved) |
| POST | `/api/expenses` | JWT | Confirm & save an expense (from AI proposal or manual entry) — single shared write path |
| GET | `/api/expenses` | JWT | List/paginate user's expenses |
| GET | `/api/expenses/summary` | JWT | Monthly/category aggregates (Redis-cached) |
| GET | `/api/expenses/insights` | JWT | AI-generated natural-language summary (cached) |
| POST | `/api/budget` | JWT | Set/update category budgets |
| GET | `/api/budget/alerts` | JWT | Active threshold alerts |
| GET | `/api/admin/audit` | JWT + ADMIN | View audit log (optional, adds an RBAC talking point) |

Note the two-step flow for `/scan` → `/expenses`: AI proposes via `/scan` (nothing written yet), the user sees the extracted data on screen and confirms, *then* `/expenses` performs the actual write. This UX choice also doubles as a safety feature — a human reviews AI output before it's committed, similar to a human-in-the-loop pattern.

---

## 8. Build Order (follow sequentially, test each phase)

**Phase 1 — Foundation**
1. Prisma schema + migrations against Neon Postgres
2. Express skeleton, health-check route, connect to DB
3. JWT auth (register/login), bcrypt hashing, auth middleware

**Phase 2 — Core CRUD (no AI yet)**
4. Manual expense entry (POST/GET `/api/expenses`) — this is your baseline, prove the ledger works before adding AI on top
5. Category enum enforcement, basic dashboard fetch endpoints

**Phase 3 — AI Guardrail Pipeline**
6. Groq integration for receipt extraction (`/api/expenses/scan`)
7. Zod schemas for AI output validation
8. `sourceHash` duplicate detection logic
9. `ExpenseAuditLog` writes for every attempt (success/fail/duplicate)
10. **Test explicitly**: submit a malformed AI response (mock it), confirm it's rejected and logged, not saved

**Phase 4 — Insights & Alerts**
11. Aggregation queries (category totals, month-over-month)
12. Redis caching layer for summary/insights endpoints
13. Natural-language insight generation (Groq, narrating pre-computed numbers only)
14. Budget threshold checking (deterministic) + AI-worded alert messages

**Phase 5 — Frontend**
15. Auth pages, dashboard layout (can reference the ai-finance-platform zip's shadcn structure, rebuilt in your own component logic)
16. Receipt upload + "review AI extraction before saving" confirmation screen — make this visually clear, it's your key differentiator to demo
17. Charts (Recharts): monthly trend, category breakdown
18. Budget alert banners, insights panel

**Phase 6 — Hardening & Deploy**
19. Rate limiting (Redis) on `/scan` endpoint specifically — AI calls cost money/time, this is a legitimate production concern to mention
20. Dockerize backend (multi-stage, matches your VRIZE CI/CD experience)
21. Deploy: Neon (Postgres), Upstash (Redis), Render (backend + Docker), Vercel (frontend)
22. Write a script that fires a duplicate receipt submission and a malformed-AI-response test, to have concrete "I tested this" evidence

**Phase 7 — Resume Polish**
23. README with architecture diagram (mirror QuerySense's README structure — it's a good template)
24. Record a short demo GIF: upload receipt → see AI proposal → confirm → see it blocked on a duplicate resubmit
25. Write resume bullets emphasizing: guardrail pipeline, audit trail, deterministic threshold logic, shared write-path design

---

## 9. What You Should Be Able to Say in an Interview

- "Why Zod and not just trusting the AI's JSON?" → AI can hallucinate types, invent categories, or return malformed dates; schema validation is the deterministic gate.
- "Why hash-based dedup instead of asking the AI 'is this a duplicate'?" → duplicate detection needs to be reliable and cheap, not probabilistic — a hash comparison is O(1) and never hallucinates.
- "What happens if Groq is down?" → `/scan` fails gracefully, user can still manually enter the expense via the same `/api/expenses` write path — AI is additive, not a single point of failure.
- "Why route both AI-sourced and manual expenses through the same write function?" → prevents a second, less-scrutinized code path for AI data; one function, one set of guarantees.
- "What would break without the audit log?" → silent, untraceable corrections to financial history — no way to answer "why does this month's total not match what I remember."

---

## 10. Explicit Non-Goals (keep scope realistic for a solo 1 YOE portfolio project)

- No real payment processing or bank integration (out of scope, adds no interview value)
- No multi-currency support (unless you have spare time — not core to the guardrail story)
- No mobile app — responsive web is enough
- Don't over-engineer the AI insights feature — one well-explained caching + narration flow is enough depth, no need for multi-agent complexity here (save that pattern for a different project if you build a third one later)
