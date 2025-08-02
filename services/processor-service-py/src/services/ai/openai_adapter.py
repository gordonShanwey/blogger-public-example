from .base import AIAdapter
import openai
from ...config import settings
from ..logger import logger

class OpenAIAdapter(AIAdapter):
    """
    Adapter for the OpenAI API to generate content.
    """
    def __init__(self, api_key: str):
        """
        Initializes the OpenAI adapter with the provided API key.
        
        Args:
            api_key: The API key for accessing the OpenAI service.
        """
        if not api_key:
            raise ValueError("OpenAI API key is required.")
        openai.api_key = api_key
        logger.info("OpenAI adapter initialized.")

    def generate_content(self, data: dict, additional_context: str | None = None) -> str:
        """
        Generates blog post content using the OpenAI API.

        Args:
            data: A dictionary containing blog post data like title, keywords, and focus.
            additional_context: Optional string for additional instructions.

        Returns:
            The generated content as a string.
        """
        logger.info(f"Generating content with OpenAI for title: {data.get('title')}")

        prompt = self._build_prompt(data, additional_context)

        try:
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that writes blog posts."},
                    {"role": "user", "content": prompt}
                ]
            )
            generated_text = response.choices[0].message.content
            if not generated_text:
                raise ValueError("Received empty content from OpenAI.")
            
            logger.info(f"Successfully generated content for title: {data.get('title')}")
            return generated_text.strip()

        except Exception as e:
            logger.error(f"Error generating content with OpenAI: {e}")
            raise

    def _build_prompt(self, data: dict, additional_context: str | None) -> str:
        """
        Constructs the prompt for the OpenAI API call.
        """
        title = data.get('title', 'Untitled')
        keywords = ", ".join(data.get('keywords', []))
        focus = data.get('focus', '')
        
        prompt_parts = [
            f"Please write a blog post with the following details:",
            f"Title: {title}",
        ]
        if keywords:
            prompt_parts.append(f"Keywords: {keywords}")
        if focus:
            prompt_parts.append(f"Focus: {focus}")
        if data.get('originalContent'):
            prompt_parts.append(f"\nHere is the original content to use as a base:\n{data['originalContent']}")
        if additional_context:
            prompt_parts.append(f"\nAdditional Instructions: {additional_context}")

        return "\n".join(prompt_parts) 