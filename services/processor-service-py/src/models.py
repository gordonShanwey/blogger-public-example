from pydantic import BaseModel, Field
from typing import List

class BlogPostSection(BaseModel):
    """
    Represents a single section of a blog post with a subtitle and content.
    """
    subtitle: str = Field(..., description="The subtitle of the blog post section.")
    content: str = Field(..., description="The main content of the blog post section.")

class GeneratedBlogPost(BaseModel):
    """
    Represents a fully generated blog post, consisting of a title and a list of sections.
    This schema is used to request structured JSON output from the generative model.
    """
    title: str = Field(..., description="The main title of the generated blog post.")
    sections: List[BlogPostSection] = Field(..., description="A list of the blog post's sections.") 