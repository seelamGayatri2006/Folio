"""RAG retrieval layer using ChromaDB with its built-in default embedding
function (all-MiniLM-L6-v2, runs locally, free — no embedding API needed).
One collection per course, so the chatbot only ever retrieves from the
document the user actually uploaded.
"""
import chromadb
from app.config import get_settings

settings = get_settings()
_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)


def _collection_name(course_id: str) -> str:
    return f"course_{course_id.replace('-', '')}"


def index_chunks(course_id: str, chunks: list[str]) -> None:
    if not chunks:
        return
    collection = _client.get_or_create_collection(_collection_name(course_id))
    ids = [f"chunk_{i}" for i in range(len(chunks))]
    collection.add(documents=chunks, ids=ids)


def retrieve(course_id: str, query: str, top_k: int = 4) -> str:
    try:
        collection = _client.get_collection(_collection_name(course_id))
    except Exception:
        return ""
    results = collection.query(query_texts=[query], n_results=top_k)
    docs = results.get("documents", [[]])[0]
    return "\n\n---\n\n".join(docs)
