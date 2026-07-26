"""Thin wrapper around a free LLM provider (Groq by default — OpenAI-compatible
API, generous free tier, fast inference). Swap BASE_URL/model to use
OpenRouter or Hugging Face Inference API instead; the call shape is the same
for Groq/OpenRouter since both are OpenAI-compatible.
"""
import json
import asyncio
import httpx
from app.config import get_settings

settings = get_settings()
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


async def _chat_completion(messages: list[dict], json_mode: bool = False, max_tokens: int = 4000) -> str:
    """Calls Groq with automatic retry/backoff on 429 (rate limit) and
    transient 5xx errors — the free tier's requests-per-minute limit is easy
    to hit during course generation since it fires many calls in a row."""
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": settings.groq_model,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": max_tokens,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    max_retries = 5
    async with httpx.AsyncClient(timeout=90) as client:
        for attempt in range(max_retries):
            resp = await client.post(GROQ_URL, headers=headers, json=body)

            if resp.status_code == 429 or resp.status_code >= 500:
                retry_after = resp.headers.get("retry-after")
                if retry_after:
                    wait = float(retry_after)
                else:
                    wait = min(2 ** attempt, 30)  # 1, 2, 4, 8, 16... capped at 30s
                if attempt == max_retries - 1:
                    resp.raise_for_status()
                await asyncio.sleep(wait)
                continue

            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    raise RuntimeError("Groq API: exhausted retries")


def _safe_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)


async def generate_course_outline(document_excerpt: str) -> dict:
    """First pass: title, description, objectives, difficulty, and a chapter/topic
    skeleton (no full lesson content yet — that's generated per-chapter to stay
    within token limits on large PDFs)."""
    system = (
        "You are an expert curriculum designer. Given raw text extracted from a "
        "document, design a structured online course that teaches its content. "
        "Respond with ONLY valid JSON, no prose, matching this schema:\n"
        "{"
        '"title": str, "description": str, "estimated_minutes": int, '
        '"difficulty": "beginner"|"intermediate"|"advanced", '
        '"objectives": [str], "prerequisites": [str], '
        '"chapters": [{"title": str, "summary": str, '
        '"lessons": [{"title": str}]}]'
        "}"
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": f"Document content:\n\n{document_excerpt}"},
    ]
    raw = await _chat_completion(messages, json_mode=True, max_tokens=3000)
    return _safe_json(raw)


async def generate_lesson_content(chapter_title: str, lesson_title: str, source_excerpt: str) -> dict:
    """Second pass, called per lesson: produces the full teaching content
    grounded in the relevant excerpt of the source document."""
    system = (
        "You are a patient, expert teacher writing one lesson of an online course. "
        "Base the lesson strictly on the provided source material. "
        "Respond with ONLY valid JSON matching this schema:\n"
        "{"
        '"content_markdown": str, "key_takeaways": [str], '
        '"important_notes": [str], "real_world_examples": [str], "summary": str'
        "}\n"
        "content_markdown should be well-structured markdown with headings, "
        "3-6 paragraphs, and use analogies where helpful."
    )
    user = (
        f"Chapter: {chapter_title}\nLesson: {lesson_title}\n\n"
        f"Source material:\n{source_excerpt}"
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    raw = await _chat_completion(messages, json_mode=True, max_tokens=2000)
    return _safe_json(raw)


async def generate_quiz(chapter_title: str, chapter_content: str, num_questions: int = 6) -> list[dict]:
    system = (
        "You are a teacher writing a chapter quiz. Mix multiple-choice, "
        "true/false, and short-answer questions. Respond with ONLY valid JSON:\n"
        '{"questions": [{"id": str, "type": "mcq"|"true_false"|"short_answer", '
        '"question": str, "options": [str], "correct_answer": str, "explanation": str}]}\n'
        "For true_false, options should be [\"True\", \"False\"]. "
        "For short_answer, options should be []. Give each question a short unique id like q1, q2."
    )
    user = f"Chapter: {chapter_title}\n\nContent:\n{chapter_content}\n\nGenerate {num_questions} questions."
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    raw = await _chat_completion(messages, json_mode=True, max_tokens=2500)
    return _safe_json(raw)["questions"]


async def chat_with_context(course_title: str, retrieved_context: str, history: list[dict], user_message: str) -> str:
    """RAG-grounded chatbot response. `retrieved_context` is the top-k chunks
    pulled from the vector store for this course."""
    system = (
        f"You are an AI learning companion for the course '{course_title}'. "
        "Answer questions using the provided course excerpts. Explain concepts "
        "clearly, offer to summarize chapters, suggest next lessons, or generate "
        "quizzes when relevant. If the excerpts don't cover the question, say so "
        "honestly rather than inventing facts.\n\n"
        f"Relevant course excerpts:\n{retrieved_context}"
    )
    messages = [{"role": "system", "content": system}]
    messages.extend(history[-10:])  # keep recent context bounded
    messages.append({"role": "user", "content": user_message})
    return await _chat_completion(messages, json_mode=False, max_tokens=1000)
