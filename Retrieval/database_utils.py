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
    pool_pre_ping=True
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
            SELECT id, gcs_path, display_name, filename, content_type, created_at, file_size_bytes
            FROM documents
            WHERE user_id = :user_id AND is_archived = FALSE
            ORDER BY created_at DESC;
        """)
        result = conn.execute(stmt, parameters={"user_id": user_id})
        documents = [row._asdict() for row in result]
    return documents

def query_vector_store(user_id: str, query_text: str, top_k: int = 10) -> list[dict]:
    """Performs a semantic search for a user's query."""
    logger.info(f"Executing vector query for user: {user_id}")
    query_embedding = get_vertex_embedding(query_text)
    embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
    with db_pool.connect() as conn:
        stmt = sqlalchemy.text("""
            SELECT
                d.id,
                d.gcs_path,
                d.display_name,
                d.filename,
                d.content_type,
                d.created_at,
                d.file_size_bytes,
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
                "query_embedding": embedding_str,
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
    
def get_user_stats(user_id: str) -> dict:
    """Calculates aggregate stats for a user's documents."""
    logger.info(f"Fetching stats for user: {user_id}")
    with db_pool.connect() as conn:
        stmt = sqlalchemy.text("""
            SELECT
                COUNT(*) AS document_count,
                SUM(file_size_bytes) AS total_storage_bytes
            FROM documents
            WHERE user_id = :user_id AND is_archived = FALSE;
        """)
        result = conn.execute(stmt, parameters={"user_id": user_id})
        # .first() gets the single row of results, ._asdict() converts it to a dict
        stats = result.first()._asdict()
    return stats
        
#updated to use doc id
def get_document_status_by_id(user_id: str, doc_id: int) -> str | None:
    with db_pool.connect() as conn:
        stmt = sqlalchemy.text("""
            SELECT processing_status FROM documents
            WHERE user_id = :user_id AND id = :doc_id;
        """)
        result = conn.execute(stmt, parameters={"user_id": user_id, "doc_id": doc_id})
        status = result.scalar_one_or_none()
    return status

def create_upload_record(user_id: str, filename: str, filetype: str, file_hash: str) -> tuple[int, str]:
    

    logger.info(f"Initiating upload record for user {user_id}, hash {file_hash}")
    
    # 1. Construct the clean, final GCS path.
    gcs_path = f"{user_id}/{filename}"

    with db_pool.connect() as conn:
        # Use a transaction to ensure all database operations succeed or fail together.
        with conn.begin() as transaction:
            
            # 2. (For Overwrites): Before creating the new record, this first deletes
            # any old chunks associated with a previous version of this file,
            # ensuring no old data is left behind.
            pre_delete_stmt = sqlalchemy.text("""
                DELETE FROM chunks WHERE document_id IN (
                    SELECT id FROM documents WHERE user_id = :user_id AND file_hash = :file_hash
                );
            """)
            conn.execute(pre_delete_stmt, {"user_id": user_id, "file_hash": file_hash})

            # 3. This is a powerful "UPSERT" command.
            # It tries to INSERT a new row. If a row with the same unique combination
            # of (user_id, file_hash) already exists, it will UPDATE that row instead.
            stmt = sqlalchemy.text("""
                INSERT INTO documents (user_id, filename, display_name, gcs_path, content_type, file_hash, processing_status)
                VALUES (:user_id, :filename, :display_name, :gcs_path, :filetype, :file_hash, 'UPLOADING')
                ON CONFLICT (user_id, file_hash) DO UPDATE SET
                    filename = EXCLUDED.filename,
                    display_name = EXCLUDED.display_name,
                    gcs_path = EXCLUDED.gcs_path,
                    processing_status = 'UPLOADING',
                    chunk_count = NULL,
                    error_message = NULL,
                    updated_at = NOW()
                RETURNING id, gcs_path;
            """)
            
            result = conn.execute(stmt, parameters={
                "user_id": user_id,
                "filename": filename,
                "display_name": filename,
                "gcs_path": gcs_path,
                "filetype": filetype,
                "file_hash": file_hash
            })
            
            # Ensure we get the definitive path back from the database.
            doc_id, gcs_path = result.first()
    # 4. Return the path to the calling function in main.py
    return doc_id, gcs_path

def get_gcs_path_by_doc_id(uid: str, doc_id: int) -> str | None:
    logger.info(f"Fetching GCS path for user {uid}, document ID {doc_id}")
    with db_pool.connect() as conn:
        stmt = sqlalchemy.text("""
            SELECT gcs_path FROM documents
            WHERE user_id = :user_id AND id = :doc_id;
        """)
        result = conn.execute(stmt, parameters={"user_id": uid, "doc_id": doc_id})
        gcs_path = result.scalar_one_or_none()
    return gcs_path

def delete_document_records(doc_id: int):
    logger.info(f"Attempting to delete all database records for doc_id: {doc_id}")
    with db_pool.connect() as conn:
        with conn.begin() as transaction: 
            try:
                
                delete_chunks_stmt = sqlalchemy.text(
                    "DELETE FROM chunks WHERE document_id = :doc_id"
                )
                conn.execute(delete_chunks_stmt, {"doc_id": doc_id})

               
                delete_doc_stmt = sqlalchemy.text(
                    "DELETE FROM documents WHERE id = :doc_id"
                )
                result = conn.execute(delete_doc_stmt, {"doc_id": doc_id})
                
                
                if result.rowcount == 0:
                    raise ValueError(f"No document found with id {doc_id} to delete.")
                
                logger.info(f"Successfully deleted database records for doc_id: {doc_id}")
            except Exception as e:
               
                logger.error(
                    f"Database error while deleting records for doc_id {doc_id}. "
                    f"Transaction rolled back.", 
                    exc_info=True
                )
                raise