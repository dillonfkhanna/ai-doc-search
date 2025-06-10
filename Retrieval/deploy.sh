#!/bin/bash

# Exit immediately if a command fails or a variable is unset
set -eu

# Load environment variables from your local .env file
set -a
source .env
set +a

# --- Configuration ---
SERVICE_NAME="query-api"
REGION="us-central1"
GCP_PROJECT_ID=$(gcloud config get-value project) # Automatically get project ID

echo "Deploying service: $SERVICE_NAME to $REGION..."

# This single command builds and deploys your service to Cloud Run
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region="$REGION" \
  --memory=1Gi \
  --timeout=300 \
  --allow-unauthenticated \
  --set-env-vars="NEON_DATABASE_URL=$NEON_DATABASE_URL,GCP_PROJECT_ID=$GCP_PROJECT_ID,GCP_REGION=$REGION,GCP_BUCKET_NAME=$GCP_BUCKET_NAME" \
  --set-secrets="/secrets/firebase-key/sa.json=firebase-auth-connection-key:latest,/secrets/gcs-key/sa.json=gcs-signer-key:latest"

# Output the deployed URL
URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format "value(status.url)")
echo "✅ Deployment successful. Service URL: $URL"