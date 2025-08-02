from fastapi import FastAPI, Request, HTTPException, status
from .controllers.message_processor import process_message
from .services.logger import logger
from pydantic import BaseModel

# TODO: Add a health check endpoint

app = FastAPI(
    title="Processor Service",
    description="A service to process messages and generate blog posts using AI.",
    version="1.0.0"
)

# Pydantic model for the Pub/Sub push request body
class PubSubMessage(BaseModel):
    message: dict
    subscription: str

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup...")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutdown...")

@app.get("/", summary="Health check endpoint", description="Returns a simple hello world message.")
def read_root():
    return {"Hello": "World"}

@app.post("/pubsub/push", status_code=status.HTTP_204_NO_CONTENT, summary="Process Pub/Sub messages")
async def pubsub_push(body: PubSubMessage):
    """
    Endpoint to receive push notifications from Google Cloud Pub/Sub.
    """
    try:
        logger.info(f"Received Pub/Sub message: {body.message}")
        await process_message(body.message)
    except Exception as e:
        logger.error(f"Failed to process Pub/Sub message: {e}")
        # Return a 500 error to indicate failure. Pub/Sub will retry.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process message: {e}"
        )
    
    return 