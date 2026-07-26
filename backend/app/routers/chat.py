from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services import vector_store, llm_service

router = APIRouter(prefix="/api/courses/{course_id}/chat", tags=["chat"])


@router.get("", response_model=list[schemas.ChatMessageOut])
def get_history(course_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.course_id == course_id, models.ChatMessage.user_id == current_user.id)
        .order_by(models.ChatMessage.created_at.asc())
        .all()
    )


@router.post("", response_model=schemas.ChatMessageOut)
async def send_message(
    course_id: str,
    payload: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    course = db.query(models.Course).filter(models.Course.id == course_id, models.Course.owner_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    user_msg = models.ChatMessage(user_id=current_user.id, course_id=course_id, role="user", content=payload.message)
    db.add(user_msg)
    db.commit()

    history_rows = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.course_id == course_id, models.ChatMessage.user_id == current_user.id)
        .order_by(models.ChatMessage.created_at.asc())
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in history_rows[:-1]]

    context = vector_store.retrieve(course_id, payload.message, top_k=4)
    reply_text = await llm_service.chat_with_context(course.title, context, history, payload.message)

    assistant_msg = models.ChatMessage(user_id=current_user.id, course_id=course_id, role="assistant", content=reply_text)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)
    return assistant_msg
