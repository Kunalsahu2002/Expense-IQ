# ExpenseIQ — Resume & Portfolio Bullets

Use these bullet points to highlight the **engineering rigor**, **architectural design**, and **product thinking** you applied while building ExpenseIQ. Pick 3 or 4 that best fit the role you are applying for.

### AI & Architecture (Highly Recommended)
- **Architected a Deterministic AI Guardrail System:** Designed an "AI proposes, code decides" pipeline using Node.js and Google Gemini, ensuring non-deterministic LLM output (receipt parsing) is strictly validated via Zod and sandboxed from direct database writes.
- **Engineered an AI Audit Trail:** Built a PostgreSQL-backed audit logging system that records raw AI prompts, responses, models, and latencies, establishing 100% observability into LLM hallucinations and reducing debugging time.
- **Implemented Bulletproof Data Integrity:** Created a shared, single-path write function for all manual and AI-generated transactions, enforcing deterministic SHA-256 deduplication (Date + Amount + Vendor) to prevent duplicate ledger entries.

### Full-Stack & Performance
- **Built a High-Performance Next.js Frontend:** Developed a responsive, dark-mode financial dashboard using Next.js 15 App Router, Tailwind CSS v4, and Recharts, focusing on modern glassmorphism UI/UX.
- **Optimized with Redis Caching & Rate Limiting:** Integrated Redis to cache expensive deterministic aggregations (Month-over-Month delta) and applied custom rate-limiting middleware (10 req/hr) to protect LLM endpoints from abuse.
- **Containerized for Production CI/CD:** Wrote a highly optimized, multi-stage Dockerfile for the Express/Prisma backend, reducing image size and preparing the architecture for seamless cloud deployment on Render/AWS.

### Feature Specific (If applying for product-focused roles)
- **Developed a Proactive Alerting Engine:** Built a background alerting system that compares real-time deterministic aggregations against user-defined category budgets, triggering warnings at 50%, 90%, and 100% capacity.
- **Engineered Graceful AI Fallbacks:** Designed a resilient UI flow that captures failed AI validations (Zod errors) and intelligently pre-fills partial data into a manual review form, preventing user frustration during LLM outages.
- **Integrated Secure Authentication:** Implemented a full JWT-based authentication flow with bcrypt password hashing and secure Axios interceptors for session management.

---

### 💡 Interview Talking Points
If an interviewer asks you about this project, focus on the **"AI proposes, code decides"** philosophy. 
Most junior/mid developers just pipe OpenAI responses straight into their database. By emphasizing that you *distrust* the AI and force it through deterministic Zod schema validation and a SHA-256 deduplication check before writing to Postgres, you demonstrate senior-level system design and data integrity concerns.
