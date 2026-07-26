import datetime as dt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.post("/lessons/{lesson_id}")
def mark_lesson(
    lesson_id: str,
    payload: schemas.MarkLessonRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    record = (
        db.query(models.LessonProgress)
        .filter(models.LessonProgress.user_id == current_user.id, models.LessonProgress.lesson_id == lesson_id)
        .first()
    )
    if not record:
        record = models.LessonProgress(user_id=current_user.id, lesson_id=lesson_id, time_spent_seconds=0)
        db.add(record)

    record.completed = payload.completed
    record.completed_at = dt.datetime.utcnow() if payload.completed else None
    record.time_spent_seconds += payload.time_spent_seconds or 0
    db.commit()
    return {"ok": True}


@router.get("/dashboard-stats")
def dashboard_stats(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    courses = db.query(models.Course).filter(models.Course.owner_id == current_user.id).all()
    total_lessons = sum(sum(len(ch.lessons) for ch in c.chapters) for c in courses)
    completed = (
        db.query(models.LessonProgress)
        .filter(models.LessonProgress.user_id == current_user.id, models.LessonProgress.completed == True)  # noqa: E712
        .count()
    )
    quiz_attempts = db.query(models.QuizAttempt).filter(models.QuizAttempt.user_id == current_user.id).all()
    avg_quiz_score = round(sum(a.score for a in quiz_attempts) / len(quiz_attempts), 1) if quiz_attempts else None
    total_time = (
        db.query(models.LessonProgress)
        .filter(models.LessonProgress.user_id == current_user.id)
        .all()
    )
    minutes_spent = round(sum(p.time_spent_seconds for p in total_time) / 60, 1)

    return {
        "total_courses": len(courses),
        "total_lessons": total_lessons,
        "completed_lessons": completed,
        "avg_quiz_score": avg_quiz_score,
        "minutes_spent": minutes_spent,
        "quiz_attempts": len(quiz_attempts),
    }
