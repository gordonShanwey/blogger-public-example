from google.cloud import pubsub_v1
from ..config import settings
from .logger import logger
import json

publisher = pubsub_v1.PublisherClient()
subscriber = pubsub_v1.SubscriberClient()
topic_path = publisher.topic_path(settings.GCP_PROJECT_ID, settings.TOPIC_NAME)
subscription_path = subscriber.subscription_path(settings.GCP_PROJECT_ID, settings.SUBSCRIPTION_NAME)

def publish_message(data: dict):
    """
    Publishes a message to a Pub/Sub topic.
    """
    try:
        future = publisher.publish(topic_path, json.dumps(data).encode("utf-8"))
        message_id = future.result()
        logger.info(f"Published message {message_id} to topic {topic_path}.")
        return message_id
    except Exception as e:
        logger.error(f"Error publishing message to {topic_path}: {e}")
        raise

# The message processing logic will be in the controller, 
# so we don't need a subscribe function here that blocks.
# Instead, the application will have an endpoint that receives push subscriptions. 