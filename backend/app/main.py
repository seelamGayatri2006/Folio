from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.config import get_settings
from app.routers import auth, courses, progress, chat, quiz
from app import models  # noqa: F401 — ensures models are registered before create_all

settings = get_settings()

app = FastAPI(title="PDF to E-Course Learning Platform API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(progress.router)
app.include_router(chat.router)
app.include_router(quiz.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
