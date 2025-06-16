#!/bin/bash

# Exit immediately if a command fails
set -e

# Load variables from .env.local into the current shell's environment
set -a
source .env.local
set +a

# --- Configuration ---
SERVICE_NAME="frontend-service"
REGION="us-central1"
PROJECT_ID=$(gcloud config get-value project)
IMAGE_NAME="us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/$SERVICE_NAME"

# --- THIS IS THE FIX ---
# Generate a unique tag based on the current date and time.
# This guarantees we always have a valid tag.
TAG=$(date +%Y%m%d-%H%M%S)

echo "Submitting build to Google Cloud Build with tag: $TAG"

# --- STEP 1: BUILD THE IMAGE ---
# We pass our generated TAG into the build as a substitution variable.
gcloud builds submit . \
  --config=cloudbuild.yaml \
  --substitutions=_SERVICE_NAME=$SERVICE_NAME,_TAG=$TAG,_NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY,_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,_NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID,_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,_NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID,_NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

echo "Build complete. Deploying image: ${IMAGE_NAME}:${TAG}"

# --- STEP 2: DEPLOY THE IMAGE ---
# We deploy the specific image that was just built, using the exact same tag.
gcloud run deploy "$SERVICE_NAME" \
  --image="${IMAGE_NAME}:${TAG}" \
  --region="$REGION" \
  --allow-unauthenticated

echo "✅ Deployment successful!"
URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format "value(status.url)")
echo "✅ Service URL: $URL"