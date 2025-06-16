#!/bin/bash

set -eu

set -a
source .env
set +a

GCP_PROJECT_ID=$(gcloud config get-value project)
REGION=us-central1
SERVICE_NAME=doc-processor


# Deploy to Cloud Run
echo "Deploying service: $SERVICE_NAME to $REGION..."

# This single command builds your code using the Dockerfile and deploys it to Cloud Run.
# It's a simpler alternative to 'gcloud builds submit'.
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region="$REGION" \
  --no-allow-unauthenticated \
  --set-env-vars="GCP_PROJECT_ID=$GCP_PROJECT_ID,GCP_REGION=$REGION,NEON_DATABASE_URL=$NEON_DATABASE_URL" \
  --memory=2Gi \
  --cpu=2 \
  --timeout=600

echo "✅ Deployment of $SERVICE_NAME successful."

# Get service URL
CLOUD_RUN_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format 'value(status.url)')