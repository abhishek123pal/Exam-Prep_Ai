# ExamPrep AI

ExamPrep AI is an early-stage study assistant with a Next.js frontend and an Express, TypeScript, PostgreSQL, Prisma, and pgvector backend. It can ingest subject material, retrieve relevant chunks, and stream AI responses through configured model providers.

## Requirements

- Node.js 20 or newer
- PostgreSQL with the `vector` extension available
- A Google Gemini API key for embeddings
- At least one chat provider key: Cerebras, Groq, or Gemini (the Gemini key is also used for embeddings)
- Redis is optional. Without it, chat history is held in process memory and is lost when the server restarts.

## Configure

Open two terminals from the repository root.

In the first terminal:

```bash
cd backend
npm install
cp .env.example .env
```

Set `DATABASE_URL`, `DIRECT_URL`, `GEMINI_API_KEY`, and at least one chat provider key in `backend/.env`. Set `REDIS_URL` if Redis is available. Set a long random `ADMIN_API_KEY`; the admin page asks for this key and sends it as a bearer token.

Apply the database migrations and start the backend:

```bash
npx prisma migrate deploy
npm run dev
```

In the second terminal:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The default frontend API URL is `http://localhost:5000`. Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` if the backend runs elsewhere. For a deployed frontend, set the backend's `FRONTEND_ORIGIN` to its origin (comma-separated origins are supported).

The chat endpoint applies an in-process limit of 30 requests per client IP per minute. Deployments with multiple backend instances should move this limit to a shared store such as Redis.

Open `http://localhost:3000`. Create a subject from `/admin`, then add syllabus or past-paper text to make it available to retrieval.

## Build

```bash
cd backend
npm run build
```

```bash
cd frontend
npm run build
```

## Current scope

The dashboard, subject selection, admin ingestion, retrieval, and streamed responses are implemented. Explorer, mock test, analytics, and settings pages are still placeholders. Authentication currently protects admin endpoints with one shared `ADMIN_API_KEY`; configure a stronger identity and role system before exposing a public multi-user deployment.
