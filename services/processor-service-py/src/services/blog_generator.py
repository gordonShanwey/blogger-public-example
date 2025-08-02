from datetime import datetime, timezone
from typing import Dict, Any, Optional, Literal, List
from pydantic import BaseModel, Field
import json

from ..config import settings
from ..services.ai.base import AIAdapter
from ..services.ai.google_genai_adapter import GoogleGenAIAdapter
from ..services.ai.openai_adapter import OpenAIAdapter
from ..services.firestore import save_document
from ..services.logger import logger


class BlogPostSection(BaseModel):
    """Interface for a blog post section"""
    subtitle: str
    content: str

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True


class GeneratedPost(BaseModel):
    """Interface for a generated blog post stored in Firestore"""
    id: str = Field(alias='original_post_id')  # Map original_post_id to id for frontend compatibility
    title: str
    original_content: str = Field(default="", alias='originalContent')
    keywords: List[str] = []
    focus: str = ""
    generated_content: Optional[str] = Field(default=None, alias='generatedContent')
    sections: Optional[List[BlogPostSection]] = None
    generated_at: str = Field(alias='generatedAt')
    status: Literal['generated', 'error'] = 'generated'
    previous_generation: Optional[Dict[str, str]] = Field(None, alias='previousGeneration')

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True


class BlogGenerationInput(BaseModel):
    """Interface for the input to the blog generation service"""
    post_id: str
    data: Dict[str, Any]
    additional_context: Optional[str] = None


class BlogGenerationOutput(BaseModel):
    """Interface for the output of the blog generation service"""
    original_post_id: str
    title: str
    original_content: str = ""  # Made optional with default empty string
    generated_content: str
    generated_at: str
    generated_post_id: str
    status: Literal['generated', 'error']
    error: Optional[str] = None


def get_ai_adapter() -> AIAdapter:
    """Get the configured AI adapter based on settings"""
    if settings.AI_PROVIDER == "OPENAI":
        return OpenAIAdapter(settings.OPENAI_API_KEY_SECRET)
    else:
        return GoogleGenAIAdapter()


async def generate_blog_post(input_data: BlogGenerationInput) -> BlogGenerationOutput:
    """
    Service to generate a blog post using AI and store it in the database
    
    Args:
        input_data: The blog post data and context
        
    Returns:
        The generated blog post data
    """
    post_id = input_data.post_id
    data = input_data.data
    additional_context = input_data.additional_context
    
    try:
        logger.info(f'Generating blog post content with AI... postId: {post_id}, title: {data.get("title", "[No title provided]")}, isRegeneration: {"previousGeneration" in data}')

        # Ensure we have a title before proceeding
        if not data.get('title'):
            data['title'] = f"Generated content for {post_id} at {datetime.now(timezone.utc).isoformat()}"
            logger.warn(f'No title provided for generation, using fallback title: "{data["title"]}"')

        # Get AI adapter and generate content
        ai_adapter = get_ai_adapter()
        generated_content = ai_adapter.generate_content(data)
        
        # Parse the generated content to extract sections if it's JSON
        sections = None
        try:
            content_json = json.loads(generated_content)
            if isinstance(content_json, dict) and 'sections' in content_json:
                sections = [BlogPostSection(**section) for section in content_json['sections']]
                # Keep the raw content as well - no need to re-serialize since it's already JSON
        except json.JSONDecodeError:
            # If not JSON, keep as is
            logger.warning(f"Generated content is not valid JSON: {generated_content[:100]}...")
            pass

        # Create the generated post object
        generated_post = GeneratedPost(
            original_post_id=post_id,  # This will be mapped to 'id' in the output
            title=data.get('title', ''),
            originalContent=data.get('originalContent', ''),
            keywords=data.get('keywords', []),
            focus=data.get('focus', ''),
            generatedContent=generated_content,
            sections=sections,
            generatedAt=datetime.now(timezone.utc).isoformat(),
            status='generated'
        )

        # If this is a regeneration, include information about the previous version
        if 'previousGeneration' in data:
            generated_post.previous_generation = {
                'content': data['previousGeneration'].get('content', ''),
                'generated_at': data['previousGeneration'].get('generatedAt', '')
            }
            logger.info('Including previous generation information in the generated post')
        
        # Use the original postId as the document ID
        logger.info(f'Using postId as document ID: {post_id} (type: {type(post_id)})')
        logger.info(f'Collection name: {settings.FIRESTORE_GENERATED_POSTS_COLLECTION}')
        logger.info(f'Generated post data: {generated_post.model_dump(by_alias=True)}')
        
        # Save the generated post to Firestore
        await save_document(
            settings.FIRESTORE_GENERATED_POSTS_COLLECTION,
            post_id,
            generated_post.model_dump(by_alias=True)  # Use by_alias to get frontend-compatible field names
        )
        
        logger.info(f'Saved generated post to Firestore with ID: {post_id}')
        
        # Return the output with the generated content and metadata
        return BlogGenerationOutput(
            original_post_id=post_id,
            title=data.get('title', ''),
            original_content=data.get('originalContent', ''),  # Use the correct field name and provide default
            generated_content=generated_content,
            generated_at=datetime.now(timezone.utc).isoformat(),
            generated_post_id=post_id,  # Use the same postId here
            status='generated'
        )
        
    except Exception as error:
        logger.error('Error during blog post generation:', exc_info=True)
        
        # Return error information
        return BlogGenerationOutput(
            original_post_id=post_id,
            title=data.get('title', f'Error generating content for {post_id}'),
            original_content='',  # Provide empty string as default
            generated_content='',
            generated_at=datetime.now(timezone.utc).isoformat(),
            generated_post_id='',
            status='error',
            error=str(error)
        ) 