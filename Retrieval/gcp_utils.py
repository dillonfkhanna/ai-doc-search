from google.cloud import storage
import os
from datetime import timedelta
from google.oauth2 import service_account

storage_client = storage.Client()

BUCKET_NAME = os.getenv("GCP_BUCKET_NAME")
GCS_SA_KEY_PATH = "/secrets/gcs-key/sa.json"

if os.path.exists(GCS_SA_KEY_PATH):
    gcs_credentials = service_account.Credentials.from_service_account_file(GCS_SA_KEY_PATH)
    storage_client = storage.Client(credentials=gcs_credentials)
else:
    storage_client = storage.Client()

def generateUploadUrl(filename, uid, content_type):
    bucket = storage_client.bucket(BUCKET_NAME)
    gcs_path = f"{uid}/{filename}"
    blob = bucket.blob(gcs_path)
    url = blob.generate_signed_url(
        version="v4", expiration=timedelta(minutes=15),
        method="PUT", content_type=content_type
    )
    return url, gcs_path

def generatePreviewUrl(gcs_path):
    bucket = storage_client.bucket(BUCKET_NAME)
    blob = bucket.blob(gcs_path)
    url = blob.generate_signed_url(
        version="v4", expiration=timedelta(minutes=60), method="GET"
    )
    return url

