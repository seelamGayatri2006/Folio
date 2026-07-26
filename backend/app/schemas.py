from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
import datetime as dt


# ---- Auth ----
class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    avatar_url: Optional[str] = None
    created_at: dt.datetime

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    name: str


# ---- Documents / Courses ----
class DocumentOut(BaseModel):
    id: str
    filename: str
    page_count: int
    status: str
    created_at: dt.datetime

    class Config:
        from_attributes = True


class LessonOut(BaseModel):
    id: str
    title: str
    order_index: int
    content_markdown: Optional[str] = None
    key_takeaways: List[str] = []
    important_notes: List[str] = []
    real_world_examples: List[str] = []
    summary: Optional[str] = None
    completed: bool = False

    class Config:
        from_attributes = True


class ChapterOut(BaseModel):
    id: str
    title: str
    summary: Optional[str] = None
    order_index: int
    lessons: List[LessonOut] = []
    completion_pct: float = 0.0

    class Config:
        from_attributes = True


class CourseOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    estimated_minutes: int
    difficulty: str
    objectives: List[str] = []
    prerequisites: List[str] = []
    status: str
    completion_pct: float = 0.0
    created_at: dt.datetime
    chapters: List[ChapterOut] = []

    class Config:
        from_attributes = True


class CourseSummaryOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    difficulty: str
    status: str
    completion_pct: float = 0.0
    created_at: dt.datetime
    last_accessed_at: dt.datetime

    class Config:
        from_attributes = True


# ---- Progress ----
class MarkLessonRequest(BaseModel):
    completed: bool
    time_spent_seconds: Optional[int] = 0


# ---- Chat ----
class ChatRequest(BaseModel):
    message: str


class ChatMessageOut(BaseModel):
    role: str
    content: str
    created_at: dt.datetime

    class Config:
        from_attributes = True


# ---- Quiz ----
class QuizQuestion(BaseModel):
    id: str
    type: str  # "mcq" | "true_false" | "short_answer"
    question: str
    options: List[str] = []
    correct_answer: str
    explanation: str


class QuizOut(BaseModel):
    id: str
    chapter_id: str
    questions: List[QuizQuestion]

    class Config:
        from_attributes = True


class QuizSubmitRequest(BaseModel):
    answers: Dict[str, str]  # question_id -> answer


class QuizResultOut(BaseModel):
    score: float
    total: int
    results: List[Dict[str, Any]]
