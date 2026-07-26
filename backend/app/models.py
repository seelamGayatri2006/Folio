import uuid
import datetime as dt
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, ForeignKey, DateTime, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True)  # null if OAuth-only
    oauth_provider = Column(String, nullable=True)    # "google" | "github" | None
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    documents = relationship("Document", back_populates="owner", cascade="all, delete")
    courses = relationship("Course", back_populates="owner", cascade="all, delete")


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    owner_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    page_count = Column(Integer, default=0)
    char_count = Column(Integer, default=0)
    status = Column(String, default="processing")  # processing | ready | failed
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    owner = relationship("User", back_populates="documents")
    course = relationship("Course", back_populates="source_document", uselist=False)


class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    owner_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    document_id = Column(UUID(as_uuid=False), ForeignKey("documents.id"), nullable=False)

    title = Column(String, nullable=False)
    description = Column(Text)
    estimated_minutes = Column(Integer, default=0)
    difficulty = Column(String, default="beginner")
    objectives = Column(JSON, default=list)     # list[str]
    prerequisites = Column(JSON, default=list)  # list[str]

    status = Column(String, default="generating")  # generating | ready | failed
    created_at = Column(DateTime, default=dt.datetime.utcnow)
    last_accessed_at = Column(DateTime, default=dt.datetime.utcnow)

    owner = relationship("User", back_populates="courses")
    source_document = relationship("Document", back_populates="course")
    chapters = relationship(
        "Chapter", back_populates="course",
        cascade="all, delete", order_by="Chapter.order_index"
    )


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    course_id = Column(UUID(as_uuid=False), ForeignKey("courses.id"), nullable=False)
    title = Column(String, nullable=False)
    summary = Column(Text)
    order_index = Column(Integer, default=0)

    course = relationship("Course", back_populates="chapters")
    lessons = relationship(
        "Lesson", back_populates="chapter",
        cascade="all, delete", order_by="Lesson.order_index"
    )


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    chapter_id = Column(UUID(as_uuid=False), ForeignKey("chapters.id"), nullable=False)
    title = Column(String, nullable=False)
    order_index = Column(Integer, default=0)

    # topic/subtopic nesting collapsed into structured JSON content
    content_markdown = Column(Text)       # main explanation
    key_takeaways = Column(JSON, default=list)
    important_notes = Column(JSON, default=list)
    real_world_examples = Column(JSON, default=list)
    summary = Column(Text)

    chapter = relationship("Chapter", back_populates="lessons")
    progress = relationship("LessonProgress", back_populates="lesson", cascade="all, delete")


class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    lesson_id = Column(UUID(as_uuid=False), ForeignKey("lessons.id"), nullable=False)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    time_spent_seconds = Column(Integer, default=0)

    lesson = relationship("Lesson", back_populates="progress")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    course_id = Column(UUID(as_uuid=False), ForeignKey("courses.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow)


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    chapter_id = Column(UUID(as_uuid=False), ForeignKey("chapters.id"), nullable=False)
    questions = Column(JSON, default=list)
    # each question: {id, type, question, options[], correct_answer, explanation}
    created_at = Column(DateTime, default=dt.datetime.utcnow)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    quiz_id = Column(UUID(as_uuid=False), ForeignKey("quizzes.id"), nullable=False)
    answers = Column(JSON, default=dict)
    score = Column(Float, default=0.0)
    total = Column(Integer, default=0)
    created_at = Column(DateTime, default=dt.datetime.utcnow)
