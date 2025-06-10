from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import logging

from database_utils import list_user_documents, query_vector_store, check_for_duplicate
from gcp_utils import generateUploadUrl, generatePreviewUrl
from auth import verify_token

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False with allow_origins="*"
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.info("--- Query API Service v2 is starting up! ---")

class QueryRequest(BaseModel):
    query: str

class DuplicateCheckRequest(BaseModel):
    file_hash: str

class SearchResult(BaseModel):
    gcs_path: str
    display_name: str
    content_type: str | None = None # <-- ADD THIS LINE
    snippet: str
    score: float

@app.get("/files")
async def get_files(user: dict = Depends(verify_token)):
    """Lists all documents for the authenticated user from the database."""
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=400, detail="User ID missing in token")
    
    try:
        files = list_user_documents(uid)
        return {"files": files}
    except Exception as e:
        logger.error(f"Failed to get files for user {uid}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not retrieve files.")

@app.post("/query", response_model=List[SearchResult])
def query_index(request: QueryRequest, user: dict = Depends(verify_token)):
    """Performs a semantic search for the authenticated user."""
    uid = user.get("uid")
    if not request.query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    # This is the "safety net" for this endpoint
    try:
        matches = query_vector_store(user_id=uid, query_text=request.query)
        validated_results = [SearchResult(**match) for match in matches]
        return validated_results
    except Exception as e:
        logger.error(f"Query failed for user {uid} with query '{request.query}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred during search.")

@app.post("/check-duplicate")
async def check_duplicate_file(request: DuplicateCheckRequest, user: dict = Depends(verify_token)):
    uid = user.get("uid")
    
    # This is the "safety net" for this endpoint
    try:
        is_duplicate = check_for_duplicate(user_id=uid, file_hash=request.file_hash)
        return {"is_duplicate": is_duplicate}
    except Exception as e:
        logger.error(f"Duplicate check failed for user {uid}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not perform duplicate check.")


@app.get("/generate-upload-url")
async def generate_upload_url(filename: str, filetype: str, user: dict = Depends(verify_token)):
    uid = user.get("uid")
    
    # This is the "safety net" for this endpoint
    try:
        url, gcs_path = generateUploadUrl(filename, uid, filetype)
        return {"upload_url": url, "gcs_path": gcs_path}
    except Exception as e:
        logger.error(f"Failed to generate upload URL for user {uid}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not generate upload URL.")

@app.get("/generate-preview-url")
async def generate_preview_url(gcs_path: str, user: dict = Depends(verify_token)):
    uid = user.get("uid")
    if gcs_path.split('/')[0] != uid:
        raise HTTPException(status_code=403, detail="Unauthorized access to file")
    
    # This is the "safety net" for this endpoint
    try:
        url = generatePreviewUrl(gcs_path)
        return {"preview_url": url}
    except Exception as e:
        logger.error(f"Failed to generate preview URL for user {uid} and path {gcs_path}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not generate preview URL.")