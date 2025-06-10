import base64
import json
from google.cloud import pubsub_v1
from dotenv import load_dotenv
import os
import logging

if os.getenv("ENV") != "GCP":
    load_dotenv()

logger = logging.getLogger(); 
logger.setLevel(logging.INFO)

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
TOPIC_ID = os.getenv("PUBSUB_TOPIC_ID")

publisher = pubsub_v1.PublisherClient()

def gcs_trigger(event, context):
    """Triggered by a change to a Cloud Storage bucket.
    Args:
        event (dict): Event payload.
        context (google.cloud.functions.Context): Metadata for the event.
    """
    
    logger.info(f"Processing file: {event['name']} from bucket: {event['bucket']}")

    # Prepare the message
    message = {
        "bucket": event['bucket'],
        "name": event['name'],
        "contentType": event.get('contentType', ""),
        "size": event.get('size', 0)
    }
    
    # Publish the message to Pub/Sub
    try:
        topic_path = publisher.topic_path(PROJECT_ID, TOPIC_ID)
        data = json.dumps(message).encode("utf-8")
        future = publisher.publish(topic_path, data)
        logger.info(f"Message published with ID: {future.result()}")
    except Exception as e:
        logger.error(f"Error publishing message: {e}", exc_info=True)
        raise
        
