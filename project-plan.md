# Cross-Media Ranking Web App — Project Plan

## Project Summary

A web app for ranking and discovering books, TV shows, and movies (including
international content like Chinese dramas) using **pairwise head-to-head
comparisons** instead of star ratings. Core differentiators versus existing
competitors (Rankd, Trove):

1. **Unified cross-media search** — one search bar returns matches across
   movies, TV, and books simultaneously, with adaptations of the same story
   (e.g. a book and its film adaptation) grouped together instead of forcing
   the user to search separately per category.
2. **Working AI recommendations** — embedding-based similarity search over
   synopses, not just genre/tag matching.
3. **User-to-user taste compatibility** — social matching based on ranking
   overlap, which competitors currently lack.

## Tech Stack

- **Frontend:** React (web app, not mobile — deployment simplicity)
- **Backend:** FastAPI
- **Database:** PostgreSQL + pgvector extension
- **External data:** TMDB API (movies/TV), Open Library API (books)
- **AI/ML:** UF NaviGator AI Toolkit (embeddings + LLM calls) for prototyping;
  abstracted behind an internal provider interface so it can be swapped for
  a production provider (OpenAI/Anthropic/self-hosted) later
- **Auth:** Neon Auth (managed, backed by the same Neon Postgres project as
  the database — see Phase 1 Implementation Plan for details)
- **Background jobs:** Celery + Redis (for staleness refresh jobs, not for
  scheduled polling of search — see Feature 3)

## Design Principles Established So Far

- No fixed-interval polling of external APIs "just in case" — fetch live on
  first request, cache the result, and only re-fetch when data is stale.
  TMDB's rate limit (~40 req/sec per IP) is not a practical constraint at
  this scale; caching exists for latency and good practice, not to dodge
  rate limits.
- TMDB caching is capped at 6 months per their terms — build staleness
  refresh logic well under that ceiling (days for airing content, weeks/
  months for completed content).
- TMDB attribution notice is required in-app ("This product uses the TMDB
  API but is not endorsed or certified by TMDB").
- Keep all AI-provider calls (embeddings, chat completions) behind one
  internal module/interface so swapping providers later isn't a rewrite.

---

## Feature Breakdown (build one at a time, in this rough order)

### Phase 1 — Foundation

**1. Project scaffolding & data model**
- Set up FastAPI backend + React frontend as separate services
- Postgres schema: `users`, `media_items`, `user_rankings`, `comparisons`,
  `watchlist`
- pgvector extension enabled, embedding column on `media_items`
- Auth via Neon Auth (signup/login UI handled by Neon Auth's SDK; backend
  verifies Neon-issued JWTs rather than owning credentials itself)

**2. External metadata search (single-source first)**
- TMDB integration: search movies + TV (multi-search endpoint)
- Open Library integration: search books
- No merging yet — just prove both API integrations work and return
  normalized internal objects

**3. Metadata caching layer**
- `media_items` table stores fetched results with `last_fetched_at` and
  `status` (upcoming/airing/completed)
- On search: check DB first, serve cached if fresh, otherwise fetch live
  and upsert
- Background job (Celery, daily/weekly) sweeps stale rows for refresh —
  not a fixed-interval poller, only refreshes what's actually stale

### Phase 1 Implementation Plan (detailed)

**Decisions locked in:**
- Hybrid monorepo: `backend/` (FastAPI) and `frontend/` (React) run natively for
  fast reload. Root `docker-compose.yml` runs *only* third-party infra —
  Postgres+pgvector and Redis — not the app code itself.
- Python tooling: `uv` for dependency/venv management.
- Celery scope for Phase 1: stubbed — broker/backend wired to Redis, beat
  schedule registered, `refresh_stale_media_items()` task exists and is
  discoverable, but its body is a no-op/TODO. Real sweep logic deferred to a
  later pass.
- TMDB API key already obtained; plan only documents the env var.
- **Database + Auth hosting:** Postgres and auth are provisioned on Neon
  (project `dry-king-34703897`, branch `production`), not the local
  `docker-compose` Postgres container described below — the repo is linked
  via the `neon` CLI (`neon link`) and `neon.ts` (`auth: true`), which pulls
  `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, and
  `NEON_AUTH_JWKS_URL` into the root `.env`. Redis (for the Phase 1 Celery
  stub) still runs via local `docker-compose` for now — Upstash is the
  intended target once the caching/Celery work actually resumes, deferred
  per current scope.
- **Auth: Neon Auth**, not self-issued JWTs. Chosen over the originally
  planned custom `passlib[bcrypt]` signup/login (see superseded assumption
  below) to get social login/password-reset for free and skip owning
  credential storage, accepting the Neon coupling as a deliberate trade-off.

**Flagged assumptions (reasonable defaults, cheap to revisit, not blocking):**
- Embedding column: `vector(1536)` placeholder (OpenAI-style dimension) until
  NaviGator's actual embedding model/dimension is confirmed in Phase 4.
  Changing it later is a one-column Alembic migration.
- Staleness thresholds (tunable via env): upcoming 3 days, airing 7 days,
  completed 90 days — well under TMDB's 6-month cache cap.
- ~~Auth: HS256 JWT, symmetric secret, 7-day expiry, passwords hashed via
  `passlib[bcrypt]`~~ — superseded by the Neon Auth decision above.
- Exact Neon Auth React SDK integration for a plain Vite app (not Next.js) —
  component/hook names and frontend publishable-key env var(s) — is
  unconfirmed; verify against Neon Auth's current React docs before wiring
  the frontend (Phase 1 build order step 9).
- TMDB search-result status mapping is coarse (search/multi-search doesn't
  return the full `status` field) — refine via detail-endpoint calls later
  if needed.
- Open Library search results lack full synopsis/description — deferred to
  a later enrichment pass (detail-endpoint call), not blocking Phase 1's
  proof of integration.

**Repository structure:**
```
curio/
├── docker-compose.yml          # Postgres+pgvector, Redis only
├── .env.example
├── backend/
│   ├── pyproject.toml          # uv-managed
│   ├── alembic/                # migrations
│   └── app/
│       ├── main.py             # FastAPI app, router includes, CORS
│       ├── config.py           # pydantic-settings
│       ├── db.py                # SQLAlchemy engine/session
│       ├── models/             # users (app profile only), media_item, user_ranking, comparison, watchlist
│       ├── schemas/             # media_item.py (normalized MediaItem), user.py
│       ├── routers/             # search.py (no auth.py — Neon Auth owns signup/login)
│       ├── services/
│       │   ├── external/       # tmdb.py, open_library.py
│       │   ├── cache/          # media_cache.py
│       │   └── ai/             # RESERVED SEAM for Phase 4 — empty provider.py stub only
│       ├── core/security.py    # verifies Neon Auth JWTs via NEON_AUTH_JWKS_URL, get_current_user dependency
│       └── workers/            # celery_app.py, tasks.py (stub sweep task)
└── frontend/
    ├── package.json            # Vite + React + TS + Neon Auth SDK
    └── src/
        ├── api/                # client.ts, search.ts
        ├── pages/               # SearchPage (login/signup rendered by Neon Auth's own components)
        ├── components/          # SearchBar, MediaResultCard, Footer (TMDB attribution)
        └── context/AuthContext.tsx  # thin wrapper over Neon Auth's session/hooks
```
Standard FastAPI layering (routers/models/schemas/services) — chosen so
Phase 2's comparison engine and Phase 3's unified search just add files into
this same skeleton, no restructuring needed. No repository-pattern/DI layer —
unnecessary for a solo prototype.

**docker-compose.yml:** two services only — `postgres` (image
`pgvector/pgvector:pg16`, port 5432, healthcheck via `pg_isready`) and
`redis` (image `redis:7-alpine`, port 6379). No `depends_on` orchestration
needed since backend/frontend aren't containerized.

**Postgres schema** (5 tables, uuid PKs via `gen_random_uuid()`, `timestamptz`
timestamps):
- `users` — app-profile table, no longer credential-owning. `id` matches the
  Neon Auth user id (created lazily on first authenticated request, not
  self-generated); display_name (nullable); created_at, updated_at. Email
  and credentials live in Neon Auth's own synced table
  (`neon_auth.users_sync` in the same Postgres database), not duplicated
  here — join against it if email is needed in a query. No `hashed_password`
  column.
- `media_items` — id, media_type (`movie|tv|book`, CHECK not native enum —
  easier to extend later), external_source (`tmdb|open_library`),
  external_id, title, synopsis, release_date (nullable), status
  (`upcoming|airing|completed|unknown`), poster_url, raw_metadata (jsonb —
  full raw API response, enables re-mapping without re-fetching), embedding
  `vector(1536)` (nullable), last_fetched_at, created_at, updated_at.
  `UNIQUE (external_source, external_id)` prevents duplicate cached rows;
  index on `(status, last_fetched_at)` for the future sweep query.
- `user_rankings` — id, user_id (FK cascade), media_item_id (FK cascade),
  rank_position (int), media_type (denormalized for fast per-type queries),
  created_at, updated_at. `UNIQUE (user_id, media_item_id)`. Per-media-type
  lists for now (per-type vs unified list is a Phase 2 planning question,
  see Open Questions below).
- `comparisons` — id, user_id (FK), winner_media_item_id (FK),
  loser_media_item_id (FK), created_at. No unique constraint — same pair can
  recur.
- `watchlist` — id, user_id (FK), media_item_id (FK), added_at.
  `UNIQUE (user_id, media_item_id)`.

pgvector extension enabled via `CREATE EXTENSION IF NOT EXISTS vector;` in
the first migration, before `media_items` is created.

**Migrations:** Alembic (`uv add alembic sqlalchemy pgvector "psycopg[binary]"`).
`alembic/env.py` reads `DATABASE_URL` from `app.config.settings` rather than
a hardcoded ini value. Write SQLAlchemy models first, then
`alembic revision --autogenerate`, review the diff, apply with
`alembic upgrade head`.

**Auth (Neon Auth):** no custom signup/login endpoints — Neon Auth's SDK
handles the signup/login UI on the frontend directly and issues the session
JWT. `core/security.py` holds a `get_current_user` FastAPI dependency that
verifies incoming JWTs against `NEON_AUTH_JWKS_URL` (already pulled into
`.env` by `neon link`/`neon deploy`), extracts the Neon Auth user id from the
token's `sub` claim, and upserts a matching row into the app's `users` table
on first sight (lazy profile creation) — reusable by all future protected
routes. No `passlib`/bcrypt, no self-issued tokens, no `JWT_SECRET`.

**External API integration:** a normalized `MediaItem` pydantic schema
(`schemas/media_item.py` — media_type, external_source, external_id, title,
synopsis, release_date, status, poster_url, raw_metadata) is the shape both
clients map into.
- `services/external/tmdb.py` — TMDB `/search/multi`, filters to
  `movie`/`tv` (drops `person` results), maps title/name → title,
  overview → synopsis, release_date/first_air_date → release_date, poster
  path → full poster URL.
- `services/external/open_library.py` — Open Library `/search.json` (no
  API key needed), maps title, cover_i → poster URL, status always
  `completed`.
- `routers/search.py` — two separate endpoints, `GET /search/movies-tv` and
  `GET /search/books`, per Phase 1 scope (no merging — that's Phase 3).

**Caching layer:** `services/cache/media_cache.py` — check DB (title
substring match, scoped to `external_source`) → if any fresh row matches,
serve DB results only → else call the external client live, upsert via
`ON CONFLICT (external_source, external_id) DO UPDATE ... last_fetched_at=now()`,
return freshly mapped results. Both search endpoints route through this
layer, never the external clients directly. Staleness thresholds live in
`config.py` as env-overridable settings.

**Celery stub:** `workers/celery_app.py` (Redis broker/backend, beat
schedule entry for a daily sweep) and `workers/tasks.py`
(`refresh_stale_media_items()` — documented no-op/TODO body). Verification
only requires worker/beat to start cleanly and the task to be discoverable.

**AI-provider seam (reserved, not implemented):** `services/ai/provider.py`
with just an `AIProvider` interface stub (`embed()`, `complete()`) — no
NaviGator client code, nothing wired into any router. Guarantees Phase 4's
embedding pipeline and onboarding agent import from this path without a
restructure. The `media_items.embedding` column already exists so no schema
change is needed later, only a possible dimension adjustment.

**Frontend (prove the loop, not the real UI):** Vite + React + TypeScript,
no state-management library yet (plain `fetch` + `useState`/`useEffect`
suffices; introduce React Query when Phase 2/3 interactions get more
complex). Neon Auth's React SDK provides the signup/login UI and session
state directly — no hand-built `LoginPage`/`SignupPage` forms; `AuthContext`
becomes a thin wrapper exposing the Neon Auth session (and its JWT, attached
to API calls) plus a route guard. `SearchPage` (one search bar, two result
sections hitting the two separate endpoints) and a global `Footer` carrying
the required TMDB attribution text: *"This product uses the TMDB API but is
not endorsed or certified by TMDB."* **Open item:** confirm Neon Auth's
exact React SDK usage for a plain Vite app before building this (see flagged
assumption above).

**Environment variables:**
- Root `.env` (docker-compose, for local Redis; Postgres now comes from
  Neon, see above): `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` —
  plus, pulled in automatically by `neon link`/`neon deploy`: `DATABASE_URL`,
  `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`, `NEON_AUTH_BASE_URL`,
  `NEON_AUTH_JWKS_URL`.
- `backend/.env`: `DATABASE_URL` (from Neon), `REDIS_URL`,
  `NEON_AUTH_JWKS_URL` (from Neon), `TMDB_API_KEY`,
  `STALENESS_UPCOMING_DAYS`, `STALENESS_AIRING_DAYS`,
  `STALENESS_COMPLETED_DAYS`. No `JWT_SECRET`/`JWT_ALGORITHM`/
  `JWT_EXPIRE_MINUTES` — tokens are issued and signed by Neon Auth, not
  self-issued.
- `frontend/.env`: `VITE_API_BASE_URL`, plus whichever Neon Auth
  frontend/publishable key its React SDK requires (name TBD — flagged
  assumption above).
- All real `.env` files gitignored; only `.env.example` files committed.
  Open Library needs no key.

**Suggested build order:**
1. `docker-compose.yml` + root `.env.example` → bring up Redis (Postgres now
   comes from the linked Neon project instead of a local container), verify
   connectivity before writing app code.
2. `backend/` scaffold: `uv init`, add deps (fastapi, uvicorn, sqlalchemy,
   alembic, psycopg[binary], pgvector, pyjwt, pydantic-settings, celery,
   redis) — `passlib[bcrypt]` no longer needed, Neon Auth owns credentials.
3. SQLAlchemy models → Alembic autogenerate → `alembic upgrade head` →
   verify schema in DB.
4. Auth: `core/security.py`'s `get_current_user` dependency verifying
   Neon-issued JWTs via `NEON_AUTH_JWKS_URL` → verify by hitting a
   protected route with/without a valid token.
5. Normalized `MediaItem` schema → TMDB client → Open Library client (test
   independently before wiring caching).
6. Caching layer → wire into `routers/search.py`.
7. Celery stub: confirm worker/beat start cleanly.
8. AI seam placeholder (near-zero effort, alongside step 2).
9. `frontend/` scaffold: Vite+React+TS, routing, auth pages, search page,
   footer.
10. Full end-to-end verification pass (below).

**Verification plan (end-to-end):**
1. `docker compose up -d` → confirm `curio-redis` healthy (Postgres is the
   Neon `production` branch, already live — confirm with `neon` CLI or
   console instead of a local container check).
2. `cd backend && uv sync && uv run alembic upgrade head` (against the Neon
   `DATABASE_URL`) → confirm all 5 tables exist, `vector` extension enabled
   (`\dx`), `media_items.embedding` is `vector(1536)`.
3. `uv run uvicorn app.main:app --reload` → `/docs` shows the `search`
   router (no `auth` router — Neon Auth handles that outside this backend).
4. `cd frontend && npm install && npm run dev` → the Neon Auth signup/login
   UI loads.
5. Signup via the Neon Auth UI → confirm a row appears in
   `neon_auth.users_sync`, and a corresponding lazily-created row appears in
   the app's own `users` table on first authenticated backend call.
6. Log out, log back in → same Neon Auth user, same app-side `users` row
   (no duplicate created).
7. Hitting `/search` while logged out returns 401 (or the frontend redirects
   to Neon Auth's login), proving `get_current_user`'s JWKS verification
   actually gates the route.
8. Search a movie/show (e.g. "Dune") → results render; `media_items` rows
   inserted with `external_source='tmdb'`.
9. Search a book (e.g. "Dune") → results render; rows inserted with
   `external_source='open_library'`.
10. Repeat the exact same TMDB search immediately → confirm (via a log line
    distinguishing cache-hit vs live-fetch in `tmdb.py`'s call path) that
    the second search does **not** call TMDB live — proves the caching
    requirement.
11. Re-trigger the same upsert twice → row count unchanged, `last_fetched_at`
    updates (uniqueness constraint holds).
12. `uv run celery -A app.workers.celery_app worker --loglevel=info` and
    `... beat --loglevel=info` → both start cleanly, connect to Redis;
    `celery -A app.workers.celery_app inspect registered` shows the stub
    sweep task.
13. TMDB attribution footer text visible on every page.

Phase 1 is complete when all 13 steps pass.

### Phase 2 — Core Ranking Mechanic

**4. Pairwise comparison engine**
- Binary-insertion ranking: when a user finishes a title, present
  comparisons against their existing ranked list until it slots into place
- `comparisons` table logs every head-to-head choice (useful for future
  algorithm changes/analytics)
- Separate ranked list per media type initially, or unified — decide during
  detailed planning

**5. Ranked list UI**
- View/scroll personal ranked list per category
- Add-to-list flow that triggers the comparison mechanic
- Watchlist (unranked, "want to watch/read") separate from ranked list

### Phase 3 — The Differentiator: Unified Search

**6. Unified cross-media search**
- Single search bar, debounced (~300ms client-side, consider server-side
  debounce too as abuse protection)
- Parallel calls to TMDB (movies+TV) and Open Library on query
- Merge results into one list, tagged by `media_type`, with icon/badge
  per type instead of separate tabs
- Relevance ranking across merged sources (fuzzy string match against
  query, not just concatenating source-by-source)

**7. Adaptation grouping**
- Detect when a title exists across multiple media types (e.g. book +
  movie + show of the same story)
- Fuzzy-match titles to group these as one expandable result
  ("Dune — 📖 Book · 🎬 Movie (2021) · 🎬 Movie (1984)")
- Data model: a lightweight `adaptation_group` linking table connecting
  related `media_items` rows across types
- This also feeds Feature 9 (recommendations) — a user ranking the book
  highly is a strong signal for the film adaptation

### Phase 4 — AI Layer

**8. Embedding generation pipeline**
- Generate embeddings for synopses via NaviGator (or chosen provider) when
  a `media_item` is first cached
- Store in pgvector column
- Confirm NaviGator toolkit exposes an embeddings endpoint before locking
  this in — verify against the current model list

**9. Recommendation engine**
- Similarity search: given a user's top-ranked items, find nearest
  neighbors in embedding space
- Weight recommendations by rank position (similarity to top-ranked items
  matters more than similarity to low-ranked ones)
- Boost using adaptation-group signal from Feature 7 where applicable

**10. Onboarding agent (cold-start solution)**
- New user describes taste in free text ("loved The Bear, hated Emily in
  Paris, want more sci-fi books")
- Agent resolves mentioned titles via search tool calls, seeds initial
  taste profile from them, and decides how many pairwise comparisons are
  needed before recommendations are reliable
- This is the one genuinely agentic (multi-step, tool-calling) feature
  worth building — treat as a contained, demoable unit of scope

### Phase 5 — Social

**11. Friends / follow system**
- Basic follow/friend relationship between users
- View a friend's ranked list

**12. Taste compatibility score**
- Rank correlation (Spearman/Kendall) between two users' overlapping
  ranked items
- Surface as a simple percentage/score on a friend's profile

**13. Group recommendations (stretch)**
- Given two or more users, suggest titles that satisfy both taste profiles
  — useful for "what should we watch together" use case

---

## Open Questions for Detailed Planning (flag these to Claude Code)

- Unified ranked list across all media types, or separate lists per type
  with cross-type recommendations only?
- Exact staleness thresholds per content status (airing vs completed)
- How strict should adaptation-group fuzzy matching be to avoid false
  positives (e.g. two unrelated titles with the same name)?
- Confirm NaviGator toolkit's specific embedding-capable model before
  architecture lock-in
- Monetization/cost model, if any, before scaling past prototype usage
