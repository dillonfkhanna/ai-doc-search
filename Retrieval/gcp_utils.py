from google.cloud import storage
import os
from datetime import timedelta
from google.oauth2 import service_account
import logging

storage_client = storage.Client()

logger = logging.getLogger(__name__)
BUCKET_NAME = os.getenv("GCP_BUCKET_NAME")
GCS_SA_KEY_PATH = "/secrets/gcs-key/sa.json"

if os.path.exists(GCS_SA_KEY_PATH):
    gcs_credentials = service_account.Credentials.from_service_account_file(GCS_SA_KEY_PATH)
    storage_client = storage.Client(credentials=gcs_credentials)
else:
    storage_client = storage.Client()

def generateUploadUrl(gcs_path: str, content_type: str, doc_id: int) -> str:
    bucket = storage_client.bucket(BUCKET_NAME)
    blob = bucket.blob(gcs_path)
    
    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=15),
        method="PUT",
        content_type=content_type,
        headers={"x-goog-meta-document-id": str(doc_id)}
    )
    return url

def generatePreviewUrl(gcs_path):
    bucket = storage_client.bucket(BUCKET_NAME)
    blob = bucket.blob(gcs_path)
    url = blob.generate_signed_url(
        version="v4", expiration=timedelta(minutes=60), method="GET", response_disposition="inline"
    )
    return url

def delete_gcs_object(gcs_path: str):
    logger.info(f"Attempting to delete GCS object: {gcs_path}")
    try:
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(gcs_path)
        blob.delete()
        logger.info(f"Successfully deleted GCS object: {gcs_path}")
    except Exception as e:
        logger.error(
            f"Failed to delete GCS object {gcs_path}. This may require "
            f"manual cleanup in the GCS bucket.", 
            exc_info=True
        )
