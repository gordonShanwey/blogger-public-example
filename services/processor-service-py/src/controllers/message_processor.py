import base64
import json
from datetime import datetime, timezone
from typing import List, Optional, Literal

from pydantic import BaseModel, Field

from ..config import settings
from ..services.firestore import get_document, save_document, update_document
from ..services.logger import logger
from ..services.blog_generator import generate_blog_post, BlogGenerationInput, BlogPostSection


# Pydantic Models for Data Validation
class BlogPostData(BaseModel):
    id: str
    title: Optional[str] = None
    content: Optional[str] = None  # Made optional for regeneration
    keywords: Optional[List[str]] = Field(default_factory=list)  # Made optional with default
    focus: Optional[str] = ""  # Made optional with default
    regeneration_instructions: Optional[str] = Field(None, alias='regenerationInstructions')
    selected_sections: Optional[List[BlogPostSection]] = Field(None, alias='selectedSections')
    original_content: Optional[str] = Field(None, alias='originalContent')
    feedback: Optional[str] = None
    
    class Config:
        populate_by_name = True
        allow_population_by_field_name = True

class BlogPostMessage(BaseModel):
    post_id: str = Field(..., alias='postId')
    action: str
    timestamp: int
    data: BlogPostData

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True

# Pydantic model for the Firestore document (Output Contract)
class ProcessedBlogPost(BaseModel):
    id: str = Field(..., alias='postId')  # Map postId to id for frontend compatibility
    action: Literal['created', 'updated', 'deleted', 'regenerate']
    timestamp: int
    status: Literal['processing', 'completed', 'error', 'failed_permanently']
    blog_post: BlogPostData = Field(..., alias='blogPost')
    processed_at: str = Field(alias='processedAt')
    completed_at: Optional[str] = Field(None, alias='completedAt')
    error_at: Optional[str] = Field(None, alias='errorAt')
    generated_content: Optional[str] = Field(None, alias='generatedContent')
    sections: Optional[List[BlogPostSection]] = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 100
    
    class Config:
        populate_by_name = True
        allow_population_by_field_name = True
        use_enum_values = True


# Main Message Processing Logic
async def process_message(message_data: dict):
    """
    Parses and processes a message from Pub/Sub, creating and updating a
    job record in Firestore.
    """
    try:
        # Decode and validate the incoming message
        if "data" in message_data:
            decoded_data = base64.b64decode(message_data["data"]).decode("utf-8")
            payload = json.loads(decoded_data)
        else:
            payload = message_data

        blog_post_message = BlogPostMessage.model_validate(payload)
        post_id = blog_post_message.post_id
        logger.info(f"Processing message for postId: {post_id}, action: {blog_post_message.action}")

        # For regeneration, we need to fetch the original post data
        if blog_post_message.action == 'regenerate':
            original_post = await get_document(settings.FIRESTORE_POSTS_COLLECTION, post_id)
            if original_post:
                # Merge the original post data with the regeneration data
                blog_post_message.data.title = original_post.get('title', blog_post_message.data.title)
                blog_post_message.data.content = original_post.get('content', blog_post_message.data.content)
                blog_post_message.data.keywords = original_post.get('keywords', blog_post_message.data.keywords)
                blog_post_message.data.focus = original_post.get('focus', blog_post_message.data.focus)
                logger.info(f"Merged original post data for regeneration. postId: {post_id}")
            else:
                logger.error(f"Could not find original post for regeneration. postId: {post_id}")
                raise ValueError(f"Original post not found for regeneration: {post_id}")

    except Exception as e:
        logger.error(f"Failed to parse incoming message: {e}")
        # Cannot proceed without a valid message, so we raise to NACK the Pub/Sub message
        raise

    # Check if we already have a record for this post_id
    existing_record = await get_document('posts', post_id)
    
    if existing_record:
        retry_count = existing_record.get('retry_count', 0)
        max_retries = existing_record.get('max_retries', 3)
        current_status = existing_record.get('status', 'processing')
        
        logger.info(f"Found existing record for postId: {post_id}, status: {current_status}, retry_count: {retry_count}")
        
        # If already permanently failed, don't retry
        if current_status == 'failed_permanently':
            logger.warning(f"Post {post_id} is marked as permanently failed, skipping processing")
            return post_id
        
        # If we've exceeded max retries, mark as permanently failed
        if retry_count >= max_retries:
            logger.error(f"Post {post_id} has exceeded max retries ({max_retries}), marking as permanently failed")
            await update_document('posts', post_id, {
                'status': 'failed_permanently',
                'errorAt': datetime.now(timezone.utc).isoformat(),
                'error': f'Exceeded maximum retry attempts ({max_retries})',
                'retry_count': retry_count
            })
            return post_id
        
        # Increment retry count
        retry_count += 1
        logger.info(f"Incrementing retry count for postId: {post_id} to {retry_count}")
        
        # Update the existing record with new retry count and processing status
        await update_document('posts', post_id, {
            'status': 'processing',
            'retry_count': retry_count,
            'processedAt': datetime.now(timezone.utc).isoformat()
        })
    else:
        # Create the initial record in Firestore
        job_record = ProcessedBlogPost(
            postId=post_id,
            action=blog_post_message.action,
            timestamp=blog_post_message.timestamp,
            status='processing',
            blogPost=blog_post_message.data,
            processedAt=datetime.now(timezone.utc).isoformat(),
            retry_count=0,
            max_retries=3
        )

        try:
            # Document ID is the same as the postId
            await save_document('posts', post_id, job_record.model_dump(by_alias=True))
            logger.info(f"Initial job record saved for postId: {post_id}")
        except Exception as e:
            logger.error(f"Failed to save initial Firestore record for postId: {post_id}. Error: {e}")
            # If we can't even save the initial record, we can't proceed.
            raise

    try:
        # Use the blog generation service to generate and store the content
        generation_input = BlogGenerationInput(
            post_id=post_id,
            data=blog_post_message.data.model_dump(),
            additional_context=f"This post was {blog_post_message.action} at {datetime.fromtimestamp(blog_post_message.timestamp / 1000, tz=timezone.utc).isoformat()}."
        )
        
        generation_result = await generate_blog_post(generation_input)
        logger.info(f"Blog generation completed for postId: {post_id}")

        # Parse the generated content to extract sections if it's JSON
        sections = None
        try:
            content_json = json.loads(generation_result.generated_content)
            if isinstance(content_json, dict) and 'sections' in content_json:
                sections = [BlogPostSection(**section) for section in content_json['sections']]
        except json.JSONDecodeError:
            # If not JSON, keep as is
            pass

        # Update the original document based on the generation result
        if generation_result.status == 'generated':
            update_payload = {
                'status': 'completed',
                'completedAt': datetime.now(timezone.utc).isoformat(),
                'generatedPostId': generation_result.generated_post_id,
                'generatedContent': generation_result.generated_content,
                'sections': [section.model_dump() for section in sections] if sections else None
            }
            await update_document('posts', post_id, update_payload)
            logger.info(f"Successfully processed and updated record for postId: {post_id}")
        else:
            # Handle error case
            error_payload = {
                'status': 'error',
                'errorAt': datetime.now(timezone.utc).isoformat(),
                'error': generation_result.error or 'Unknown error during generation'
            }
            await update_document('posts', post_id, error_payload)
            logger.error(f"Error during content generation for postId: {post_id}: {generation_result.error}")
            raise Exception(generation_result.error or 'Unknown error during generation')

    except Exception as e:
        logger.error(f"Error during content generation or final update for postId: {post_id}. Error: {e}")
        
        # Get current retry count
        current_record = await get_document('posts', post_id)
        current_retry_count = current_record.get('retry_count', 0) if current_record else 0
        max_retries = current_record.get('max_retries', 3) if current_record else 3
        
        # Check if we should mark as permanently failed
        if current_retry_count >= max_retries:
            error_payload = {
                'status': 'failed_permanently',
                'errorAt': datetime.now(timezone.utc).isoformat(),
                'error': f'Permanently failed after {max_retries} retries. Last error: {str(e)}',
                'retry_count': current_retry_count
            }
            logger.error(f"Marking post {post_id} as permanently failed after {max_retries} retries")
        else:
            # Prepare the update payload for a failed operation (will be retried)
            error_payload = {
                'status': 'error',
                'errorAt': datetime.now(timezone.utc).isoformat(),
                'error': str(e),
                'retry_count': current_retry_count
            }
        
        try:
            await update_document('posts', post_id, error_payload)
            logger.info(f"Error status updated for postId: {post_id}")
        except Exception as update_e:
            logger.error(f"CRITICAL: Failed to update error status for postId: {post_id}. Final error: {update_e}")
        
        # Only re-raise if we haven't exceeded max retries
        if current_retry_count < max_retries:
            raise e
        else:
            logger.info(f"Not re-raising error for postId: {post_id} as max retries exceeded")
            return post_id 