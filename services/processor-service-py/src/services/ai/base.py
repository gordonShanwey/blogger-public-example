from abc import ABC, abstractmethod

class AIAdapter(ABC):
    """
    Abstract base class for AI content generation services.
    
    This class defines the interface that all AI adapters must implement,
    ensuring that they provide a consistent method for content generation.
    """
    @abstractmethod
    def generate_content(self, data: dict, additional_context: str | None = None) -> str:
        """
        Generates content based on the provided data and context.

        Args:
            data: A dictionary containing the primary data for content generation,
                  such as title, keywords, and focus.
            additional_context: Optional string for any additional context or
                                instructions for the generation process.

        Returns:
            A string containing the generated content.
        """
        pass 