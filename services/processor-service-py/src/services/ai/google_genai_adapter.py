from typing import Optional
import json
from google import genai
from google.genai import types

from ...config import settings
from ..logger import logger
from .base import AIAdapter
from ...models import GeneratedBlogPost

class GoogleGenAIAdapter(AIAdapter):
    """
    Adapter for the Google Generative AI API, using the Vertex AI backend.
    """
    def __init__(self):
        """
        Initializes the Google GenAI adapter for Vertex AI.
        Authentication is handled by Application Default Credentials (ADC).
        """
        if not settings.GCP_PROJECT_ID or not settings.GCP_REGION:
            raise ValueError("GCP_PROJECT_ID and GCP_REGION must be set in the environment for Vertex AI.")

        try:
            self.client = genai.Client(
                vertexai=True,
                project=settings.GCP_PROJECT_ID,
                location=settings.GCP_REGION
            )
            logger.info(f"Google GenAI adapter initialized for Vertex AI in project '{settings.GCP_PROJECT_ID}' and location '{settings.GCP_REGION}'.")
        except Exception as e:
            logger.error(f"Failed to initialize Vertex AI client: {e}")
            raise

    def _build_prompt(self, data: dict, additional_context: Optional[str] = None) -> str:
        """
        Constructs the prompt for the Google GenAI API call.
        """
        title = data.get('title', 'Untitled')
        keywords = ", ".join(data.get('keywords', []))
        focus = data.get('focus', '')
        feedback = data.get('feedback', '')
        
        system_prompt = """Jesteś doświadczonym copywriterem EzC, specjalizującym się w tworzeniu angażujących artykułów o cyfrowej transformacji, automatyzacji procesów i AI dla małych i średnich firm. Tworzysz eksperckie, angażujące i dobrze ustrukturyzowane treści w języku polskim, uwzględniające zasady SEO, strategie konwersji oraz E-E-A-T (Doświadczenie, Ekspertyza, Autorytet, Wiarygodność).

**Zadanie:**
Wygeneruj kompletny, dobrze ustrukturyzowany artykuł na bloga, który będzie zgodny z podanymi wytycznymi i zwrócony w formacie JSON.

**Wymogi dotyczące treści i struktury:**
- Artykuł musi zawierać minimum 4000 znaków.
- Każda sekcja (podtytuł wraz z treścią) musi zawierać od 500 do 800 znaków.
- Artykuł powinien zawierać:
  - Wyraźnie zdefiniowany tytuł,
  - Logiczną strukturę z podtytułami,
  - Wplecione kluczowe frazy,
  - Elementy angażujące czytelnika (np. listy, porady),
  - Wezwanie do działania (CTA).

**Format wyjściowy:**
Odpowiedź musi być sformatowana jako pojedynczy obiekt JSON zgodny z podanym schematem:
{
  "title": "Tytuł artykułu",
  "sections": [
    {
      "subtitle": "Podtytuł sekcji",
      "content": "Treść sekcji..."
    }
  ]
}

**Dodatkowe instrukcje:**
- Tekst niepowinien zawierać elementów markdown.
"""

        prompt_parts = [
            system_prompt,
            "---",
            "**Szczegóły do wygenerowania artykułu:**"
        ]
        if title:
            prompt_parts.append(f"- Tytuł: {title}")
        if keywords:
            prompt_parts.append(f"- Słowa kluczowe: {keywords}")
        if focus:
            prompt_parts.append(f"- Główny temat: {focus}")
        if data.get('originalContent'):
            prompt_parts.append(f"\n- Użyj tej treści jako podstawy:\n{data['originalContent']}")
        if feedback:
            prompt_parts.append(f"\n- Feedback do uwzględnienia:\n{feedback}")
        if additional_context:
            prompt_parts.append(f"\n- Dodatkowe instrukcje: {additional_context}")

        return "\n".join(prompt_parts)

    def generate_content(self, data: dict, additional_context: str | None = None) -> str:
        """
        Generates blog post content using the Google GenAI API via Vertex AI.

        Args:
            data: A dictionary containing blog post data.
            additional_context: Optional string for additional instructions.

        Returns:
            A valid JSON string of the generated content.
        """
        logger.info(f"Generating content with Vertex AI for title: {data.get('title')}")

        prompt = self._build_prompt(data, additional_context)
        
        try:
            # Configure the generation parameters with structured output
            config = types.GenerateContentConfig(
                temperature=0.7,
                top_p=0.95,
                top_k=20,
                max_output_tokens=16000,
                response_mime_type='application/json',
                response_schema=GeneratedBlogPost,
            )

            # Make the API call
            response = self.client.models.generate_content(
                model='gemini-2.5-pro',
                contents=prompt,
                config=config,
            )

            # Get the response text and clean it up
            response_text = response.text.strip()
            
            # Since we're using response_schema, the response should already be valid JSON
            try:
                # Parse to validate it's proper JSON
                json_content = json.loads(response_text)
                # Return the formatted JSON
                final_json = json.dumps(json_content, indent=2, ensure_ascii=False)
                logger.info("Successfully received structured JSON response from Vertex AI.")
                return final_json
            except json.JSONDecodeError:
                # Fallback: try to find JSON within markdown code blocks
                import re
                json_match = re.search(r'```(?:json)?\s*({\s*".*})\s*```', response_text, re.DOTALL)
                if json_match:
                    try:
                        json_content = json.loads(json_match.group(1))
                        final_json = json.dumps(json_content, indent=2, ensure_ascii=False)
                        logger.info("Successfully parsed JSON from code block (fallback).")
                        return final_json
                    except json.JSONDecodeError:
                        raise ValueError("Could not parse JSON from code block")
                else:
                    raise ValueError("No valid JSON found in response")

        except Exception as e:
            logger.error(f"Error generating content with Vertex AI: {e}", exc_info=True)
            raise 