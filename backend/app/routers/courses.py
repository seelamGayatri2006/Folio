import os
import uuid
import asyncio
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.config import get_settings
from app.services import pdf_processor, llm_service, vector_store

router = APIRouter(prefix="/api/courses", tags=["courses"])
settings = get_settings()


def _course_completion_pct(course: models.Course, user_id: str, db: Session) -> float:
    lesson_ids = [
        l.id for ch in course.chapters for l in ch.lessons
    ]
    if not lesson_ids:
        return 0.0
    completed = (
        db.query(models.LessonProgress)
        .filter(
            models.LessonProgress.user_id == user_id,
            models.LessonProgress.lesson_id.in_(lesson_ids),
            models.LessonProgress.completed == True,  # noqa: E712
        )
        .count()
    )
    return round(100 * completed / len(lesson_ids), 1)


def _chapter_completion_pct(chapter: models.Chapter, user_id: str, db: Session) -> float:
    lesson_ids = [l.id for l in chapter.lessons]
    if not lesson_ids:
        return 0.0
    completed = (
        db.query(models.LessonProgress)
        .filter(
            models.LessonProgress.user_id == user_id,
            models.LessonProgress.lesson_id.in_(lesson_ids),
            models.LessonProgress.completed == True,  # noqa: E712
        )
        .count()
    )
    return round(100 * completed / len(lesson_ids), 1)


async def _generate_course_pipeline(course_id: str, full_text: str):
    """Runs after upload: outline -> per-lesson content -> quizzes -> vector index.
    Runs in a background task so the upload endpoint returns immediately and the
    frontend can poll course status."""
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        course = db.query(models.Course).filter(models.Course.id == course_id).first()
        if not course:
            return

        excerpt = pdf_processor.truncate_to_tokens(full_text, 6000)
        outline = await llm_service.generate_course_outline(excerpt)

        course.title = outline.get("title", "Untitled Course")
        course.description = outline.get("description", "")
        course.estimated_minutes = outline.get("estimated_minutes", 60)
        course.difficulty = outline.get("difficulty", "beginner")
        course.objectives = outline.get("objectives", [])
        course.prerequisites = outline.get("prerequisites", [])
        db.commit()

        chunks = pdf_processor.chunk_text(full_text, max_tokens=800, overlap_tokens=100)
        vector_store.index_chunks(course_id, chunks)

        for c_idx, ch in enumerate(outline.get("chapters", [])):
            chapter = models.Chapter(
                course_id=course.id,
                title=ch.get("title", f"Chapter {c_idx + 1}"),
                summary=ch.get("summary", ""),
                order_index=c_idx,
            )
            db.add(chapter)
            db.commit()
            db.refresh(chapter)

            chapter_full_text = ""
            for l_idx, lesson_meta in enumerate(ch.get("lessons", [])):
                lesson_title = lesson_meta.get("title", f"Lesson {l_idx + 1}")
                relevant = vector_store.retrieve(course_id, f"{chapter.title} {lesson_title}", top_k=3)
                if not relevant:
                    relevant = excerpt

                content = await llm_service.generate_lesson_content(chapter.title, lesson_title, relevant)
                await asyncio.sleep(1.2)  # pace requests to stay under free-tier rate limits
                lesson = models.Lesson(
                    chapter_id=chapter.id,
                    title=lesson_title,
                    order_index=l_idx,
                    content_markdown=content.get("content_markdown", ""),
                    key_takeaways=content.get("key_takeaways", []),
                    important_notes=content.get("important_notes", []),
                    real_world_examples=content.get("real_world_examples", []),
                    summary=content.get("summary", ""),
                )
                db.add(lesson)
                chapter_full_text += f"\n\n{lesson.content_markdown}"
            db.commit()

            try:
                await asyncio.sleep(1.2)
                questions = await llm_service.generate_quiz(chapter.title, chapter_full_text[:6000])
                quiz = models.Quiz(chapter_id=chapter.id, questions=questions)
                db.add(quiz)
                db.commit()
            except Exception:
                pass  # quiz generation failure shouldn't fail the whole course

        course.status = "ready"
        db.commit()
    except Exception as e:
        course = db.query(models.Course).filter(models.Course.id == course_id).first()
        if course:
            course.status = "failed"
            db.commit()
        print(f"Course generation failed for {course_id}: {e}")
    finally:
        db.close()


@router.post("/upload", response_model=schemas.CourseSummaryOut)
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    os.makedirs(settings.upload_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(settings.upload_dir, safe_name)

    contents = await file.read()
    if len(contents) > settings.max_pdf_size_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.max_pdf_size_mb}MB limit")

    with open(file_path, "wb") as f:
        f.write(contents)

    full_text, page_count = pdf_processor.extract_text(file_path)
    if not full_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract any text from this PDF")

    document = models.Document(
        owner_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        page_count=page_count,
        char_count=len(full_text),
        status="ready",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    course = models.Course(
        owner_id=current_user.id,
        document_id=document.id,
        title=f"Generating course from {file.filename}...",
        status="generating",
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    background_tasks.add_task(_generate_course_pipeline, course.id, full_text)

    return schemas.CourseSummaryOut(
        id=course.id,
        title=course.title,
        description=course.description,
        difficulty=course.difficulty,
        status=course.status,
        completion_pct=0.0,
        created_at=course.created_at,
        last_accessed_at=course.last_accessed_at,
    )


@router.get("", response_model=list[schemas.CourseSummaryOut])
def list_courses(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    courses = (
        db.query(models.Course)
        .filter(models.Course.owner_id == current_user.id)
        .order_by(models.Course.last_accessed_at.desc())
        .all()
    )
    return [
        schemas.CourseSummaryOut(
            id=c.id, title=c.title, description=c.description, difficulty=c.difficulty,
            status=c.status, completion_pct=_course_completion_pct(c, current_user.id, db),
            created_at=c.created_at, last_accessed_at=c.last_accessed_at,
        )
        for c in courses
    ]


@router.get("/{course_id}", response_model=schemas.CourseOut)
def get_course(course_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    course = (
        db.query(models.Course)
        .filter(models.Course.id == course_id, models.Course.owner_id == current_user.id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    import datetime as dt
    course.last_accessed_at = dt.datetime.utcnow()
    db.commit()

    completed_lesson_ids = {
        p.lesson_id
        for p in db.query(models.LessonProgress).filter(
            models.LessonProgress.user_id == current_user.id, models.LessonProgress.completed == True  # noqa: E712
        ).all()
    }

    chapters_out = []
    for ch in course.chapters:
        lessons_out = [
            schemas.LessonOut(
                id=l.id, title=l.title, order_index=l.order_index,
                content_markdown=l.content_markdown, key_takeaways=l.key_takeaways or [],
                important_notes=l.important_notes or [], real_world_examples=l.real_world_examples or [],
                summary=l.summary, completed=l.id in completed_lesson_ids,
            )
            for l in ch.lessons
        ]
        chapters_out.append(
            schemas.ChapterOut(
                id=ch.id, title=ch.title, summary=ch.summary, order_index=ch.order_index,
                lessons=lessons_out, completion_pct=_chapter_completion_pct(ch, current_user.id, db),
            )
        )

    return schemas.CourseOut(
        id=course.id, title=course.title, description=course.description,
        estimated_minutes=course.estimated_minutes, difficulty=course.difficulty,
        objectives=course.objectives or [], prerequisites=course.prerequisites or [],
        status=course.status, completion_pct=_course_completion_pct(course, current_user.id, db),
        created_at=course.created_at, chapters=chapters_out,
    )


@router.get("/{course_id}/search", response_model=list[dict])
def search_course(course_id: str, q: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Search across chapters, lessons, and keywords within a course."""
    course = db.query(models.Course).filter(models.Course.id == course_id, models.Course.owner_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    q_lower = q.lower()
    results = []
    for ch in course.chapters:
        if q_lower in ch.title.lower() or q_lower in (ch.summary or "").lower():
            results.append({"type": "chapter", "chapter_id": ch.id, "title": ch.title})
        for l in ch.lessons:
            haystack = f"{l.title} {l.content_markdown or ''} {l.summary or ''}".lower()
            if q_lower in haystack:
                results.append({"type": "lesson", "chapter_id": ch.id, "lesson_id": l.id, "title": l.title})
    return results
