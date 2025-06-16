import os
import json
import logging
from base64 import b64decode
from tempfile import NamedTemporaryFile
import hashlib

from fastapi import FastAPI, Request, HTTPException, Response
from google.cloud import storage
import vertexai
from vertexai.language_models import TextEmbeddingModel
from langchain.text_splitter import RecursiveCharacterTextSplitter
from unstructured.partition.auto import partition
import sqlalchemy
import pg8000.dbapi

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
GCP_REGION = os.getenv("GCP_REGION")

NEON_DATABASE_URL = os.getenv("NEON_DATABASE_URL")


app = FastAPI()
storage_client = storage.Client()
vertexai.init(project=GCP_PROJECT_ID, location=GCP_REGION)

if not NEON_DATABASE_URL:
    raise ValueError("NEON_DATABASE_URL environment variable is not set.")

db_pool = sqlalchemy.create_engine(
    NEON_DATABASE_URL, 
    pool_size=5,
    pool_recycle=1800,
    pool_pre_ping=True,
    pool_timeout=30
)
logger.info("Database pool for Neon initialized.")

def get_vertex_embeddings(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    logger.info(f"Generating embeddings for {len(texts)} texts")
    model = TextEmbeddingModel.from_pretrained("text-embedding-005")
    all_embeddings = []

    TOKEN_LIMIT = 18500
    
    batch_for_embedding = []
    current_batch_tokens = 0
    
    for text in texts:
        # 1. Make a quick, free API call to get the exact token count for the current chunk.
        token_count_response = model.count_tokens([text])
        text_token_count = token_count_response.total_tokens

        # Safety Check: If a single chunk is larger than the limit, skip it.
        if text_token_count > TOKEN_LIMIT:
            logger.warning(
                f"Skipping a chunk because its token count ({text_token_count}) "
                f"exceeds the limit of {TOKEN_LIMIT}."
            )
            continue

        # 2. If adding this chunk would make the batch too big,
        #    process the current batch first.
        if current_batch_tokens + text_token_count > TOKEN_LIMIT and batch_for_embedding:
            logger.info(
                f"Token limit reached ({current_batch_tokens} + {text_token_count}). "
                f"Processing batch of {len(batch_for_embedding)} chunks..."
            )
            response = model.get_embeddings(batch_for_embedding)
            all_embeddings.extend([r.values for r in response])
            
            # Reset for the next batch
            batch_for_embedding = []
            current_batch_tokens = 0

        # 3. Add the current chunk and its token count to the batch.
        batch_for_embedding.append(text)
        current_batch_tokens += text_token_count
    
    # 4. Process the final batch after the loop has finished.
    if batch_for_embedding:
        logger.info(f"Processing final batch of {len(batch_for_embedding)} chunks.")
        response = model.get_embeddings(batch_for_embedding)
        all_embeddings.extend([r.values for r in response])

    logger.info("Embeddings generated successfully")
    return all_embeddings

def download_chunk_and_hash(bucket_name: str, file_name: str) -> tuple[list[str], str]:

    logger.info(f"Downloading and chunking {file_name} from bucket {bucket_name}")
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(file_name)

    file_content = blob.download_as_bytes()
    file_hash = hashlib.md5(file_content).hexdigest()

    with NamedTemporaryFile() as tmp:
        tmp.write(file_content)
        tmp.flush()

        elements = partition(filename = tmp.name, content_type=blob.content_type)

    raw_text = "\n\n".join([el.text for el in elements if el.text.strip()])

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=200,
    ) 
    chunks = text_splitter.split_text(raw_text)
    logger.info(f"Content split into {len(chunks)} chunks")
    return chunks, file_hash

def update_document_and_insert_chunks(doc_id: int, metadata: dict, chunks: list[str], embeddings: list[list[float]]):
    """Finds the placeholder record by hash and updates it with the processed data."""
    logger.info(f"Updating database record for document with doc_id = {doc_id}")
    
    with db_pool.connect() as conn:
        with conn.begin() as transaction:
            try:
                
                update_stmt = sqlalchemy.text("""
                    UPDATE documents SET
                        file_size_bytes = :file_size_bytes,
                        chunk_count = :chunk_count,
                        file_hash = :file_hash,
                        processing_status = 'COMPLETED',
                        updated_at = NOW()
                    WHERE id = :doc_id;
                """)
                result = conn.execute(update_stmt, {**metadata, "doc_id": doc_id})
                if result.rowcount == 0:
                    logger.error(f"FATAL: Document with ID {doc_id} not found. Cannot update.")
                    transaction.rollback() 
                    return
                # Delete any old chunks for this document before inserting new ones
                conn.execute(sqlalchemy.text("DELETE FROM chunks WHERE document_id = :doc_id"), {"doc_id": doc_id})

                # Insert the new chunks
                if chunks and embeddings:
                    chunk_data = [
                        {
                            "document_id": doc_id, 
                            "chunk_text": text, 
                            "embedding": f"[{','.join(map(str, embedding))}]"
                        } for text, embedding in zip(chunks, embeddings)
                    ]
                    
                    chunk_insert_stmt = sqlalchemy.text(
                        "INSERT INTO chunks (document_id, chunk_text, embedding) VALUES (:document_id, :chunk_text, CAST(:embedding AS vector));"
                    )
                    
                    conn.execute(chunk_insert_stmt, chunk_data)
                
                logger.info(f"Successfully processed and marked document ID {doc_id} as COMPLETED.")
            except Exception as e:
                logger.error(f"Error during database transaction for doc_id {doc_id}: {e}", exc_info=True)
                
                raise


@app.post("/")
async def subscriber(request: Request):
    envelope = await request.json()
    if not envelope or 'message' not in envelope:
        logger.error("Recerived empty or invalid Pub/Sub message")
        return Response(status_code=400)
    
    doc_id = None
    
    try:
        data = json.loads(b64decode(envelope['message']['data']).decode("utf-8"))
        gcs_path = data.get("name")
        metadata = data.get("metadata", {})

        doc_id_str = metadata.get("document-id")

        if not doc_id_str:
            logger.error(f"FATAL: 'document-id' not found in metadata for file {gcs_path}. Cannot process.")
            # Acknowledge the message so Pub/Sub doesn't retry this broken message.
            return Response(status_code=200, content="OK (Acknowledged)")
        
        doc_id = int(doc_id_str)
        
        chunks, file_hash = download_chunk_and_hash(data['bucket'], gcs_path)
        embeddings = get_vertex_embeddings(chunks)

        doc_metadata = {
            "file_size_bytes": data.get("size", 0),
            "file_hash": file_hash,
            "chunk_count": len(chunks)
        }
        update_document_and_insert_chunks(doc_id, doc_metadata, chunks, embeddings)

        return Response(status_code=200)
    except Exception as e:
        logger.exception(f"Critical error processing message for doc_id {doc_id}: {e}")
        if doc_id:
            try:
                with db_pool.connect() as conn:
                    error_update_stmt = sqlalchemy.text("UPDATE documents SET processing_status = 'FAILED', error_message = :error WHERE id = :doc_id;")
                    conn.execute(error_update_stmt, {"doc_id": doc_id, "error": str(e)})
                    conn.commit() # Explicitly commit the failure state
            except Exception as db_err:
                logger.error(f"Additionally, failed to mark doc_id {doc_id} as FAILED in the database: {db_err}")
        
        return Response(status_code=200, content="OK (Error Acknowledged)")

    