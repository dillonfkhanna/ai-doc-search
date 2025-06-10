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

    for i in range(0, len(texts), 250):
        batch = texts[i:i + 250]
        response = model.get_embeddings(batch)
        all_embeddings.extend([r.values for r in response])

    logger.info("Embeddings generated successfully")
    return all_embeddings

def download_and_chunk_content(bucket_name: str, file_name: str) -> tuple[list[str], str]:

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

def insert_document_and_chunks(db_pool, metadata: dict, chunks: list[str], embeddings: list[list[float]]):
    logger.info(f"Starting database transaction for document: {metadata['filename']}")
    with db_pool.connect() as conn:
        with conn.begin():
            try:
                stmt = sqlalchemy.text("""
                    INSERT INTO documents (user_id, gcs_path, filename, file_size_bytes, content_type, file_hash, chunk_count, display_name)
                    VALUES (:user_id, :gcs_path, :filename, :file_size_bytes, :content_type, :file_hash, :chunk_count, :display_name)
                    RETURNING id
                """)
                result = conn.execute(stmt, parameters=metadata)
                document_id = result.scalar_one()

                if chunks:
                    chunk_data = [
                        {
                            "document_id": document_id,
                            "chunk_text": text,
                            "embedding": str(embedding)
                        } for text, embedding in zip(chunks, embeddings)
                    ]

                    chunk_stmt = sqlalchemy.text("""
                        INSERT INTO chunks (document_id, chunk_text, embedding)
                        VALUES (:document_id, :chunk_text, :embedding)
                    """)
                    conn.execute(chunk_stmt, parameters=chunk_data)
                logger.info(f"Successfully prepared insert for document ID {document_id} and {len(chunks)} chunks.")
            except Exception:
                logger.error("Database transaction failed. Rolling back changes.")
                raise

@app.post("/")
async def subscriber(request: Request):
    envelope = await request.json()
    if not envelope or 'message' not in envelope:
        logger.error("Recerived empty or invalid Pub/Sub message")
        return Response(status_code=400)
    try:
        data = json.loads(b64decode(envelope['message']['data']).decode("utf-8"))
        gcs_path = data.get("name")

        user_id = gcs_path.split('/')[0]
        if not user_id:
            logger.error(f"Filename '{gcs_path}' does not contain a user ID")
            return Response(status_code=200, content="OK (Acknowledged)")
        
        chunks, file_hash = download_and_chunk_content(data['bucket'], gcs_path)
        embeddings = get_vertex_embeddings(chunks)

        doc_metadata = {
            "user_id": user_id,
            "gcs_path": gcs_path,
            "filename": os.path.basename(gcs_path),
            "display_name": os.path.basename(gcs_path),
            "file_size_bytes": data.get("size", 0),
            "content_type": data.get("contentType", ""),
            "file_hash": file_hash,
            "chunk_count": len(chunks)
        }
        insert_document_and_chunks(db_pool, doc_metadata, chunks, embeddings)

        return Response(status_code=200)
    except Exception as e:
        logger.exception(f"Critical error processing message: {e}")
        raise HTTPException(status_code=500, detail=str(e))    

    