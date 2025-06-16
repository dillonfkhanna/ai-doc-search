from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
import logging
from datetime import datetime

from database_utils import list_user_documents, query_vector_store, check_for_duplicate, get_user_stats, create_upload_record, get_document_status_by_id, get_gcs_path_by_doc_id, delete_document_records
from gcp_utils import generateUploadUrl, generatePreviewUrl, delete_gcs_object
from auth import verify_token

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
app = FastAPI()

allowed_origins = [
    "https://frontend-service-405975889170.us-central1.run.app", 
    "http://localhost:3000"                              
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins, # Use the specific list
    allow_credentials=True,      # This can now be set to True
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.info("--- Query API Service v2 is starting up! ---")

class QueryRequest(BaseModel):
    query: str

class DuplicateCheckRequest(BaseModel):
    file_hash: str

class Document(BaseModel):
    id: int 
    gcs_path: str
    display_name: str
    filename: str
    content_type: Optional[str]
    created_at: datetime
    file_size_bytes: Optional[int]
    snippet: Optional[str] = None 
    score: Optional[float] = None  

class InitiateUploadRequest(BaseModel):
    filename: str
    filetype: str
    file_hash: str
    
class UserStats(BaseModel):
    document_count: int
    total_storage_bytes: int
    
#only changed what it resturns
@app.post("/documents/initiate-upload")
async def initiate_upload(request: InitiateUploadRequest, user: dict = Depends(verify_token)):
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=400, detail="User ID missing in token")

    try:
        doc_id, gcs_path = create_upload_record(
            user_id=uid,
            filename=request.filename,
            filetype=request.filetype,
            file_hash=request.file_hash
        )
        upload_url = generateUploadUrl(gcs_path, request.filetype, doc_id)
        
        return {
            "upload_url": upload_url,
            "doc_id": doc_id
        }

    except Exception as e:
        logger.error(f"Failed to initiate upload for user {uid}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not initiate upload.")
    

@app.get("/files")
async def get_files(user: dict = Depends(verify_token)):
    """Lists all documents for the authenticated user from the database."""
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=400, detail="User ID missing in token")
    
    try:
        files = list_user_documents(uid)
        results = [Document(**file) for file in files]
        return results
    except Exception as e:
        logger.error(f"Failed to get files for user {uid}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not retrieve files.")

@app.post("/query", response_model=List[Document])
def query_index(request: QueryRequest, user: dict = Depends(verify_token)):
    """Performs a semantic search for the authenticated user."""
    uid = user.get("uid")
    if not request.query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    # This is the "safety net" for this endpoint
    try:
        matches = query_vector_store(user_id=uid, query_text=request.query)
        validated_results = [Document(**match) for match in matches]
        return validated_results
    except Exception as e:
        logger.error(f"Query failed for user {uid} with query '{request.query}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred during search.")

#can't really be updated to use doc ID since it needs the file hash
@app.post("/check-duplicate")
async def check_duplicate_file(request: DuplicateCheckRequest, user: dict = Depends(verify_token)):
    uid = user.get("uid")
    try:
        is_duplicate = check_for_duplicate(user_id=uid, file_hash=request.file_hash)
        return {"is_duplicate": is_duplicate}
    except Exception as e:
        logger.error(f"Duplicate check failed for user {uid}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not perform duplicate check.")


#updated to use doc ID
@app.get("/generate-preview-url")
async def generate_preview_url(doc_id: int, user: dict = Depends(verify_token)):
    uid = user.get("uid")
    gcs_path = None
    try:
        gcs_path = get_gcs_path_by_doc_id(uid, doc_id)
        
        if not gcs_path:
            raise HTTPException(status_code=404, detail="Document not found.")
        
        url = generatePreviewUrl(gcs_path)
        return {"preview_url": url}
    except Exception as e:
        logger.error(f"Failed to generate preview URL for user {uid} and path {gcs_path}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not generate preview URL.")
    
#doesn't need updating
@app.get("/user-stats")
async def get_stats(user: dict = Depends(verify_token)):
    """Gets aggregate statistics for the authenticated user."""
    uid = user.get("uid")
    try:
        stats = get_user_stats(uid)
        results = UserStats(**stats)
        return results
    except Exception as e:
        logger.error(f"Failed to get stats for user {uid}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not retrieve user stats.")

#updated to use doc ID
@app.get("/document-status")
async def get_status(doc_id: int, user: dict = Depends(verify_token)):
    uid = user.get("uid")
    status = get_document_status_by_id(user_id=uid, doc_id = doc_id)
    if not status:
        return {"status": "NOT_FOUND"}
    return {"status": status}

@app.delete("/documents/{doc_id}", status_code=200)
async def delete_document(doc_id: int, user: dict = Depends(verify_token)):
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="User ID missing in token")

    try:
        gcs_path_to_delete = get_gcs_path_by_doc_id(uid, doc_id)
        if not gcs_path_to_delete:
            raise HTTPException(status_code=404, detail="Document not found or user does not have permission.")

        delete_document_records(doc_id)

        delete_gcs_object(gcs_path_to_delete)

        return {"status": "success", "message": f"Document ID {doc_id} was successfully deleted."}

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"An unexpected error occurred while deleting document {doc_id} for user {uid}.", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while deleting the document.")
    