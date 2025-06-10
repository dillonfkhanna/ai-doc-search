#!/bin/bash

set -euo pipefail

set -a
source .env
set +a

echo "Deploying function: $FUNCTION_NAME to $REGION..."

gcloud functions deploy "$FUNCTION_NAME" \
  --entry-point=gcs_trigger \
  --runtime=python311 \
  --trigger-event=google.storage.object.finalize \
  --trigger-resource="$BUCKET_NAME" \
  --set-env-vars GCP_PROJECT_ID="$GCP_PROJECT_ID",PUBSUB_TOPIC_ID="$PUBSUB_TOPIC_ID",ENV=GCP \
  --source=. \
  --region="$REGION"

echo "Deployment of $FUNCTION_NAME successful."