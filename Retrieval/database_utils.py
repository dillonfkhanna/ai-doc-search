import os
import logging
import sqlalchemy
import vertexai
from vertexai.language_models import TextEmbeddingModel

logger = logging.getLogger(__name__)

# Get the full database URL from environment variables, provided by Cloud Run
NEON_DATABASE_URL = os.getenv("NEON_DATABASE_URL")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
GCP_REGION = os.getenv("GCP_REGION")

if GCP_PROJECT_ID and GCP_REGION:
    vertexai.init(project=GCP_PROJECT_ID, location=GCP_REGION)

if not NEON_DATABASE_URL:
    raise ValueError("NEON_DATABASE_URL environment variable is not set.")

db_pool = sqlalchemy.create_engine(
    NEON_DATABASE_URL,
    pool_size=5,
    pool_recycle=1800,
    pool_pre_ping=True,
)
logger.info("Neon database pool initialized.")

def get_vertex_embedding(text: str) -> list[float]:
    logger.info("Generating embedding for query...")
    model = TextEmbeddingModel.from_pretrained("text-embedding-005")
    embeddings = model.get_embeddings([text])
    logger.info("Embedding generated.")
    return embeddings[0].values

def list_user_documents(user_id: str) -> list[dict]:
    logger.info(f"Listing documents for user: {user_id}")
    with db_pool.connect() as conn:
        # The only change is adding "gcs_path" to the SELECT list.
        stmt = sqlalchemy.text("""
            SELECT id, gcs_path, filename, display_name, file_size_bytes, content_type, created_at
            FROM documents
            WHERE user_id = :user_id AND is_archived = FALSE
            ORDER BY created_at DESC;
        """)
        result = conn.execute(stmt, parameters={"user_id": user_id})
        documents = [row._asdict() for row in result]
    return documents

def query_vector_store(user_id: str, query_text: str, top_k: int = 5) -> list[dict]:
    """Performs a semantic search for a user's query."""
    logger.info(f"Executing vector query for user: {user_id}")
    query_embedding = get_vertex_embedding(query_text)
    
    with db_pool.connect() as conn:
        stmt = sqlalchemy.text("""
            SELECT
                d.gcs_path,
                d.display_name,
                d.content_type,
                c.chunk_text AS snippet,
                1 - (c.embedding <=> :query_embedding) AS score
            FROM chunks AS c
            JOIN documents AS d ON c.document_id = d.id
            WHERE d.user_id = :user_id AND d.is_archived = FALSE
            ORDER BY c.embedding <=> :query_embedding
            LIMIT :top_k;
        """)
        
        result = conn.execute(
            stmt,
            parameters={
                "query_embedding": str(query_embedding),
                "user_id": user_id,
                "top_k": top_k,
            }
        )
        matches = [row._asdict() for row in result]
    return matches

def check_for_duplicate(user_id: str, file_hash: str) -> bool:
    """Checks if a file with the same hash already exists for a user."""
    logger.info(f"Checking for duplicate file hash for user: {user_id}")
    with db_pool.connect() as conn:
        stmt = sqlalchemy.text("""
            SELECT EXISTS (
                SELECT 1 FROM documents WHERE user_id = :user_id AND file_hash = :file_hash
            );
        """)
        result = conn.execute(stmt, parameters={"user_id": user_id, "file_hash": file_hash})
        return result.scalar_one_or_none() is True