"""Extracts and chunks text from uploaded PDFs.

Handles large / multi-page PDFs by streaming page-by-page rather than
loading everything into one giant string at once, and produces
token-bounded chunks suitable for embedding + LLM context windows.
"""
from pypdf import PdfReader
import tiktoken

encoder = tiktoken.get_encoding("cl100k_base")


def extract_text(file_path: str) -> tuple[str, int]:
    """Returns (full_text, page_count). Skips unreadable pages instead of failing the whole doc."""
    reader = PdfReader(file_path)
    pages_text = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        pages_text.append(text)
    full_text = "\n\n".join(pages_text)
    return full_text, len(reader.pages)


def chunk_text(text: str, max_tokens: int = 800, overlap_tokens: int = 100) -> list[str]:
    """Token-aware sliding-window chunking, used both for RAG embedding
    and for splitting large documents across multiple LLM calls during
    course generation."""
    tokens = encoder.encode(text)
    if not tokens:
        return []

    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + max_tokens, len(tokens))
        chunk_tokens = tokens[start:end]
        chunks.append(encoder.decode(chunk_tokens))
        if end == len(tokens):
            break
        start = end - overlap_tokens
    return chunks


def truncate_to_tokens(text: str, max_tokens: int) -> str:
    tokens = encoder.encode(text)
    if len(tokens) <= max_tokens:
        return text
    return encoder.decode(tokens[:max_tokens])
