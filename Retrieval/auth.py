import os  # <-- Add this import
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Request, HTTPException, Depends

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
FIREBASE_SA_KEY_PATH = "/secrets/firebase-key/sa.json"

if not firebase_admin._apps:
    if os.path.exists(FIREBASE_SA_KEY_PATH):
        cred = credentials.Certificate(FIREBASE_SA_KEY_PATH)
        firebase_admin.initialize_app(cred)

async def verify_token(request: Request):
    """Verifies a Firebase ID token from the Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
    try:
        id_token = auth_header.split(" ")[1]
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired Firebase ID token")