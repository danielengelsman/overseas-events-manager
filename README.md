# Overseas Events Manager (Starter)

A minimal Next.js + Supabase + Netlify starter that manages **Trips** with sections and includes an **AI Copilot** that can create trips from chat instructions or uploaded docs (skeleton).

> ⚠️ This starter emphasizes clarity over completeness. For production, tighten auth on server routes (verify Supabase JWTs) and expand RLS policies.

## Features
- Supabase Auth (magic-link) and Postgres with RLS-based multi-tenancy (organizations & memberships).
- Trips CRUD from the UI (simple).
- AI endpoint with tool-calls: `create_trip` (implemented), `add_flight` (stub), etc.
- File upload to Supabase Storage with signed URLs (endpoint implemented).
- Netlify-ready deployment.

## 1) Create Supabase Project
1. Create a new Supabase project.
2. Go to **SQL Editor** → run the migration in [`supabase/migrations/000_init.sql`](supabase/migrations/000_init.sql).
3. Create a public storage bucket named `documents` (no public read; the app requests signed URLs).
4. Copy **Project URL**, **anon key**, and **service role** from Settings → API.

## 2) Configure env
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...           # from Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=...      # from Supabase
SUPABASE_SERVICE_ROLE=...              # from Supabase (server only)
OPENAI_API_KEY=...                     # your OpenAI key
DEFAULT_ORG_ID=                        # (optional) leave blank
```

## 3) Local Dev
```bash
npm i
npm run dev
```

Open http://localhost:3000. Sign in via magic-link, then create or select an Organization (top bar).

## 4) Deploy to Netlify
- Create a new Netlify site from Git (or drag & drop this folder).
- Add the same environment variables in **Site Settings → Environment variables**.
- Netlify auto-detects Next.js and builds with the official plugin.

## 5) Using the AI Copilot
Open a trip and use the **AI Copilot** panel. Try:
> "Create a trip called Web Summit Lisbon from 2025-11-10 to 2025-11-13 in Lisbon, Portugal and add attendees John (john@example.com) and Maya (maya@example.com)."

The Copilot will call the `create_trip` tool and persist to Supabase.

---

## Security Notes
- The `/api/ai/chat` and `/api/upload-url` routes use the **service role** key and **trust** `orgId` and `userId` from the client for brevity. For production, verify Supabase JWTs server-side and derive `orgId` from memberships to prevent spoofing.
- RLS policies restrict row access by membership; service role bypasses RLS (as intended for system actions). Keep the key server-side only.

## Roadmap
- Implement `add_flight`, `add_accommodation`, `add_transport` tool handlers.
- Add OCR via OpenAI Vision or Google DocAI and map to tool calls.
- Traveler pack export (PDF/ICS).
- Full-text + semantic search (pgvector).
