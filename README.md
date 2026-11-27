# ExamPrep AI

ExamPrep AI is an AI-assisted study workspace for organizing university subjects and turning syllabus or past-paper text into searchable study material. Students can ask questions and receive streamed responses grounded in material added for the selected subject.

The project is an early-stage application. Some navigation pages are placeholders; see [Current scope](#current-scope) before deploying it for students.

![ExamPrep AI system architecture](./doc/architecture.png)

## Features

- **Subject dashboard:** Select a subject and ask a question or use a suggested study prompt.
- **Study-material ingestion:** Add subject syllabus and past-paper text from the admin page. Text is split into chunks, embedded, and stored in PostgreSQL with pgvector.
- **Retrieval-augmented responses:** Retrieve relevant chunks for a subject and include them with the study prompt sent to the model.
- **Streaming answers:** Receive generated responses over Server-Sent Events (SSE).
- **Provider fallback:** Try Cerebras, Gemini, and Groq in sequence when a provider cannot start a response stream.
- **Semantic response cache:** Reuse sufficiently similar cached answers within the same subject and request type.
- **Conversation history:** Store the last 10 messages in Redis with a 24-hour expiry when configured, or in process memory for local development.
- **Admin protection:** Require a shared bearer key for subject creation and knowledge ingestion routes.

## Request flow

1. An admin creates a subject and submits syllabus or past-paper text.
2. The backend splits text into chunks, requests 768-dimensional document embeddings, and stores them in the subject's `KnowledgeChunk` rows.
3. A chat request is validated, rate-limited, and scrubbed for common email, phone, and IP patterns.
4. The backend embeds the question and checks the semantic cache for the same subject and request type. A cache match requires a cosine similarity of at least `0.85`.
5. On a cache miss, the backend retrieves up to three relevant knowledge chunks (similarity greater than `0.3`), combines them with subject syllabus/PYQ records, then requests a streamed answer through the provider fallback chain.
6. The response is streamed to the browser, added to the conversation history, and cached for later similar questions.

## Technology

| Area | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL, Prisma ORM, pgvector |
| Embeddings | Gemini Embedding 001, requested at 768 dimensions |
| Chat providers | Cerebras, Gemini, and Groq adapters |
| Optional session store | Redis |

## Repository layout

```text
backend/       Express API, AI services, Prisma schema and migrations
frontend/      Next.js application
doc/           Architecture diagram and project documentation
```

The frontend and backend have separate package manifests and lockfiles. Install dependencies and run commands from the relevant directory.

## Requirements

- Node.js 20 or newer
- PostgreSQL with the pgvector extension available
- A Gemini API key for embeddings
- At least one chat provider key: Gemini, Cerebras, or Groq
- Redis is optional for local development

## Local development

### 1. Get the code

```bash
git clone https://github.com/abhishek123pal/Exam-Prep_Ai.git
cd Exam-Prep_Ai
```

For PowerShell, use `Copy-Item` instead of `cp` in the environment-file steps below.

### 2. Configure the backend

```bash
cd backend
npm ci
cp .env.example .env
```

Set the values in `backend/.env`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | API port; defaults to `5000`. |
| `DATABASE_URL` | Yes | PostgreSQL connection used by the running API. |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection for Prisma migrations. |
| `GEMINI_API_KEY` | Yes | Gemini embeddings and Gemini chat fallback. |
| `CEREBRAS_API_KEY` | Optional | Cerebras chat provider. |
| `GROQ_API_KEY` | Optional | Groq chat provider. |
| `REDIS_URL` | No | Redis connection for persistent chat history. Without it, history is process-local and resets when the backend restarts. |
| `ADMIN_API_KEY` | Yes for admin routes | Long random secret required as a bearer token for `/api/admin/*`. |
| `FRONTEND_ORIGIN` | For non-local frontend | Allowed frontend origin or comma-separated origins, without trailing slashes. |
| `TRUST_PROXY_HOPS` | Deployment-dependent | Number of trusted proxies in front of Express. Leave unset locally; configure to match the deployed proxy chain. |

Enable pgvector on the database if it is not already enabled. The migration also attempts to enable it; the database role must have permission to do so or the extension must be enabled by the database administrator.

Apply migrations and start the API:

```bash
npx prisma migrate deploy
npm run dev
```

The health endpoint is available at `http://localhost:5000/health`.

### 3. Configure and start the frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

`frontend/.env.local` contains:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Open `http://localhost:3000`. Create a subject at `/admin`, then add syllabus or past-paper text for that subject before asking questions.

The admin page asks for the value of `ADMIN_API_KEY` and sends it in an `Authorization: Bearer …` header. Never put this secret in a `NEXT_PUBLIC_*` variable or commit it to the repository.

## API overview

### Public routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Backend health response. |
| `GET` | `/api/ai/subjects` | List subjects for the dashboard. |
| `POST` | `/api/ai/chat/stream` | Generate a subject-grounded answer as SSE. |

Chat requests must include a `prompt`, `subjectId`, and a unique `sessionId` between 8 and 128 characters. The frontend creates a per-tab session ID; API clients must create and reuse a separate ID for each conversation. The `type` field is optional; `sample_paper` triggers the sample-paper prompt flow.

Example request:

```json
{
  "prompt": "Explain the main topics in this unit",
  "subjectId": "<subject-id-from-api>",
  "sessionId": "<unique-conversation-id>",
  "type": "chat"
}
```

The stream sends `data:` events containing JSON such as `{"text":"…","provider":"GROQ"}` and finishes with `data: [DONE]`.

### Admin routes

All admin routes require the `Authorization: Bearer <ADMIN_API_KEY>` header.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/admin/subjects` | Create a subject (`code`, `name`, `semester`, `branch`). |
| `POST` | `/api/admin/syllabus` | Ingest syllabus text and metadata for a subject. |
| `POST` | `/api/admin/pyq` | Ingest past-paper text and metadata for a subject. |

Ingestion requires a valid `subjectId` and at least 50 characters of content.

## Database and migration notes

The Prisma schema defines subjects, syllabus records, past-paper records, knowledge chunks, and a subject-scoped semantic cache. The vector tables use 768-dimensional embeddings and cosine similarity search.

Before applying migrations to an existing database:

1. Take a database backup.
2. Review the migration in `backend/prisma/migrations/` against the database’s actual schema.
3. Be aware that the current vector/cache migration deletes existing `SemanticCache` rows. Those entries are treated as disposable because the older cache was not scoped by subject.
4. The migration also removes knowledge chunks whose `subjectId` no longer matches an existing subject.
5. Apply migrations with `npx prisma migrate deploy` from `backend/`.

The migration has not been verified against every possible existing production database. Test it against a copy of your database before applying it to production.

## Production deployment

Deploy the frontend and backend as separate services:

1. **Provision PostgreSQL** with pgvector enabled. Use a pooled `DATABASE_URL` for application traffic when appropriate and a direct `DIRECT_URL` for Prisma migrations.
2. **Deploy the backend** from the `backend` directory. Build with `npm ci && npm run build`; start with `npm start`. Configure the backend variables from `backend/.env.example` in the hosting provider’s secret/environment settings.
3. **Run database migrations** as a release/pre-deploy step with `npx prisma migrate deploy` before serving requests.
4. **Deploy the frontend** from the `frontend` directory. Set `NEXT_PUBLIC_API_URL` to the deployed backend’s HTTPS origin, then build with `npm ci && npm run build` and start with `npm start` if the host uses a Node server.
5. Set `FRONTEND_ORIGIN` on the backend to the deployed frontend origin. If the backend is behind a reverse proxy, set `TRUST_PROXY_HOPS` to the actual number of trusted proxy hops; do not enable broad proxy trust without checking the infrastructure.
6. Confirm `/health`, load the frontend, create a subject, ingest study text, and make a streamed chat request.

Do not expose `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `GROQ_API_KEY`, `DATABASE_URL`, `DIRECT_URL`, or `ADMIN_API_KEY` in frontend configuration.

## Build and verification

From the repository root, run the build checks in each project:

```bash
# Backend
cd backend
npm ci
npm run build
```

```bash
# Frontend
cd frontend
npm ci
npm run build
```

The backend package does not yet have an automated test suite; its current `npm test` script is a placeholder that exits with an error. Production builds have been run for both applications, but the database migration still needs verification against a copy of the target database before production use.

## Security and operational notes

- Admin access uses one shared API key, not individual accounts or role-based login. Use a strong random secret and consider adding a proper identity and authorization system before opening the application to a broad audience.
- The chat API rate limiter allows 30 requests per client IP per minute. It is in-memory and applies per backend process; use a shared rate-limit store for multi-instance deployments.
- Correct Express proxy trust configuration is required for client-IP rate limiting behind a proxy.
- Redis is optional, but the in-memory fallback does not persist history across restarts or coordinate it across backend instances.
- The API scrubs common email, phone, and IP patterns from prompts before processing. This should not be treated as a complete privacy or data-loss-prevention system.

## Current scope

Implemented flows include subject selection, subject creation, text ingestion, vector retrieval, semantic caching, and streamed AI responses. The Explorer, Mock Tests, Analytics, and Settings pages are currently placeholders. There is no student login, multi-user account system, file/PDF upload flow, or automated backend test suite.
