from google.cloud import firestore
from ..config import settings
from .logger import logger

db = firestore.AsyncClient(
    project=settings.GCP_PROJECT_ID,
    database="your-resource-prefix-db" 
)

async def save_document(collection: str, document_id: str, data: dict):
    """
    Saves a document to a Firestore collection.
    """
    try:
        doc_ref = db.collection(collection).document(document_id)
        await doc_ref.set(data)
        logger.info(f"Document {document_id} saved to collection {collection}.")
    except Exception as e:
        logger.error(f"Error saving document {document_id} to {collection}: {e}")
        raise

async def update_document(collection: str, document_id: str, data: dict):
    """
    Updates a document in a Firestore collection.
    """
    try:
        doc_ref = db.collection(collection).document(document_id)
        await doc_ref.update(data)
        logger.info(f"Document {document_id} updated in collection {collection}.")
    except Exception as e:
        logger.error(f"Error updating document {document_id} in {collection}: {e}")
        raise

async def get_document(collection: str, document_id: str) -> dict | None:
    """
    Retrieves a document from a Firestore collection.
    """
    try:
        doc_ref = db.collection(collection).document(document_id)
        doc = await doc_ref.get()
        if doc.exists:
            logger.info(f"Document {document_id} retrieved from collection {collection}.")
            return doc.to_dict()
        else:
            logger.warning(f"Document {document_id} not found in collection {collection}.")
            return None
    except Exception as e:
        logger.error(f"Error retrieving document {document_id} from {collection}: {e}")
        raise 