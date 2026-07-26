from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/chapters/{chapter_id}/quiz", tags=["quiz"])


@router.get("", response_model=schemas.QuizOut)
def get_quiz(chapter_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    quiz = db.query(models.Quiz).filter(models.Quiz.chapter_id == chapter_id).order_by(models.Quiz.created_at.desc()).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not yet available for this chapter")
    return quiz


@router.post("/submit", response_model=schemas.QuizResultOut)
def submit_quiz(
    chapter_id: str,
    payload: schemas.QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    quiz = db.query(models.Quiz).filter(models.Quiz.chapter_id == chapter_id).order_by(models.Quiz.created_at.desc()).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    results = []
    correct_count = 0
    for q in quiz.questions:
        user_answer = payload.answers.get(q["id"], "")
        is_correct = user_answer.strip().lower() == q["correct_answer"].strip().lower()
        if is_correct:
            correct_count += 1
        results.append({
            "question_id": q["id"],
            "question": q["question"],
            "your_answer": user_answer,
            "correct_answer": q["correct_answer"],
            "is_correct": is_correct,
            "explanation": q["explanation"],
        })

    score = round(100 * correct_count / len(quiz.questions), 1) if quiz.questions else 0.0

    attempt = models.QuizAttempt(
        user_id=current_user.id, quiz_id=quiz.id, answers=payload.answers,
        score=score, total=len(quiz.questions),
    )
    db.add(attempt)
    db.commit()

    return schemas.QuizResultOut(score=score, total=len(quiz.questions), results=results)
