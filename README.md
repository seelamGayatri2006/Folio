# Folio — PDF to E-Course Learning Platform

Upload a PDF (book, paper, docs, manual) and get back a structured, interactive
course: chapters, lessons, an AI companion chatbot grounded in the document via
RAG, auto-generated quizzes, and persistent progress tracking.

Built for the In2Peta Generative AI Internship assignment.

## Architecture

```
frontend/  Next.js 14 (App Router) + TypeScript + Tailwind CSS
backend/   FastAPI + SQLAlchemy + PostgreSQL
           PDF extraction: pypdf
           LLM: Groq (free, OpenAI-compatible API) — swappable for OpenRouter/HF
           Vector store: ChromaDB (local embeddings, no extra API needed) for RAG
```

**Course generation pipeline** (runs as a FastAPI background task after upload,
so the request returns instantly and the frontend polls for status):
1. Extract text from the PDF (`pypdf`), page by page, skipping unreadable pages.
2. Chunk the text and index it into a per-course ChromaDB collection.
3. Ask the LLM for a course **outline** (title, objectives, chapters, lesson titles).
4. For each lesson, retrieve the most relevant chunks for that chapter/lesson via
   the vector store and ask the LLM to write the full lesson content grounded in
   that excerpt — this keeps large PDFs from blowing the context window and keeps
   lessons on-topic.
5. Generate a quiz per chapter from that chapter's generated content.

**Chat companion**: every message retrieves the top-k relevant chunks from the
course's vector store and passes them to the LLM as grounding context, so answers,
summaries, and quiz requests are based on the actual PDF rather than the model's
general knowledge.

## Database schema

`users → documents → courses → chapters → lessons → lesson_progress`
plus `chat_messages`, `quizzes`, `quiz_attempts`. See `backend/app/models.py`
for the full SQLAlchemy schema — tables are created automatically on backend
startup (`Base.metadata.create_all`), no manual migration needed for first run.

## Local setup

### 1. Database
Create a free Postgres database on [Neon](https://neon.tech) or
[Supabase](https://supabase.com) and copy the connection string.

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edit .env: paste DATABASE_URL, a random JWT_SECRET, and a free GROQ_API_KEY
# (get one at https://console.groq.com — no credit card required)
uvicorn app.main:app --reload --port 8000
```
API docs (auto-generated) live at `http://localhost:8000/docs`.

### 3. Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```
App runs at `http://localhost:3000`.

## Deployment

**Frontend → Vercel**
- Import the repo, set root directory to `frontend`.
- Env var: `NEXT_PUBLIC_API_URL=<your backend URL>`.

**Backend → Render / Railway / Fly.io / Koyeb**
- Root directory `backend`, start command:
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Env vars: everything in `.env.example` (`DATABASE_URL`, `JWT_SECRET`,
  `GROQ_API_KEY`, `FRONTEND_URL=<your Vercel URL>`).
- Note: `chroma_db/` and `uploads/` are written to local disk. On platforms with
  ephemeral filesystems (e.g. Render free tier restarts), mount a persistent disk
  or swap to a managed vector DB (Pinecone free tier) and S3-compatible storage
  for production durability.

**Database → Neon or Supabase** (both have generous free tiers).

## Extending authentication with OAuth

Email/password auth is fully implemented (`backend/app/routers/auth.py`,
bcrypt + JWT). To add Google/GitHub OAuth on top: the cleanest path is wiring
[NextAuth.js](https://next-auth.js.org) into the frontend for the OAuth handshake,
then exchanging the resulting profile for a backend JWT via a small
`/api/auth/oauth` endpoint that upserts a `User` row with `oauth_provider` set
(the `User` model already has this column ready).

## Bonus features implemented
- RAG-based chatbot (ChromaDB + Groq)
- Full-text search across chapters/lessons/keywords within a course
- Markdown rendering for lesson content
- Streaming-ready chat architecture (currently request/response; swap to SSE
  by having `/chat` yield tokens if you want live streaming)

## Bonus features not implemented (noted for the demo)
Flashcards, mind maps, certificates, audio narration, multi-language support,
and course export were left out to keep the 5-day scope focused on a solid,
working core — happy to discuss trade-offs live.

## Project structure
```
backend/
  app/
    main.py           FastAPI app, CORS, router wiring
    config.py          env settings
    database.py         SQLAlchemy engine/session
    models.py            DB schema
    schemas.py            Pydantic request/response models
    auth.py                 JWT + password hashing
    routers/
      auth.py                signup / login / me
      courses.py               upload, generation pipeline, get/list/search
      progress.py                mark lesson complete, dashboard stats
      chat.py                      RAG chatbot
      quiz.py                        fetch quiz, submit + score
    services/
      pdf_processor.py            text extraction + chunking
      llm_service.py                 Groq calls: outline, lesson, quiz, chat
      vector_store.py                  ChromaDB indexing + retrieval

frontend/
  app/
    page.tsx                      landing
    login/, signup/                 auth pages
    dashboard/                        bookshelf + stats
    upload/                             PDF upload
    course/[id]/                          course overview
    course/[id]/lesson/[lessonId]/          lesson reader
    course/[id]/quiz/[chapterId]/             quiz
  components/                                  Navbar, Spine, ChatCompanion
  lib/api.ts                                     typed fetch client
```
