# Python Migration Plan for Processor Service

This document outlines the plan to migrate the `processor-service` from Node.js/TypeScript to Python. The migration will also include the addition of a new adapter for Google's Generative AI in addition to the existing OpenAI adapter.

## 1. Project Setup

The new Python service will be structured as a standard Python project.

### 1.1. Directory Structure

A new directory structure will be created for the Python service.

```
services/processor-service-py/
├── Dockerfile
├── README.md
├── pyproject.toml
├── src/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── controllers/
│   │   ├── __init__.py
│   │   └── message_processor.py
│   └── services/
│       ├── __init__.py
│       ├── firestore.py
│       ├── pubsub.py
│       ├── storage.py
│       ├── logger.py
│       └── ai/
│           ├── __init__.py
│           ├── base.py
│           ├── openai_adapter.py
│           └── google_genai_adapter.py
└── tests/
    ├── __init__.py
    └── ...
```

### 1.2. Dependency Management

We will use `pyproject.toml` to manage dependencies. Key libraries will include:

-   **Web Framework**: `FastAPI` 
-   **Google Cloud**: `google-cloud-firestore`, `google-cloud-pubsub`, `google-cloud-storage`.
-   **AI SDKs**: `openai`, `google-genai`.
-   **Data Validation**: `pydantic` for data validation and settings management (similar to Zod).
-   **Logging**: Standard Python `logging` module.

## 2. Code Migration

The existing TypeScript code will be translated to Python, maintaining the original logic and structure.

### 2.1. Configuration (`src/config.py`)

The `config.ts` will be migrated to `src/config.py`. It will use Pydantic's `BaseSettings` to load configuration from environment variables.

### 2.2. Logging (`src/services/logger.py`)

The `logger.ts` will be migrated to `src/services/logger.py`. It will configure a standard Python logger.

### 2.3. Google Cloud Services

-   `firestore.ts` -> `src/services/firestore.py`
-   `pubsub.ts` -> `src/services/pubsub.py`
-   `storage.ts` -> `src/services/storage.py`

These modules will be rewritten in Python using the official Google Cloud libraries.

### 2.4. AI Service Abstraction

To support both OpenAI and Google GenAI, we will use an adapter pattern.

#### `src/services/ai/base.py`

This file will define an abstract base class (ABC) for the AI content generation service.

```python
from abc import ABC, abstractmethod

class AIAdapter(ABC):
    @abstractmethod
    def generate_content(self, data: dict, additional_context: str | None = None) -> str:
        pass
```

#### `src/services/ai/openai_adapter.py`

This will be the Python equivalent of `openai.ts`.

```python
from .base import AIAdapter
import openai

class OpenAIAdapter(AIAdapter):
    def __init__(self, api_key: str):
        openai.api_key = api_key

    def generate_content(self, data: dict, additional_context: str | None = None) -> str:
        # Implementation of content generation using OpenAI
        # ...
        return "Generated content from OpenAI"
```

#### `src/services/ai/google_genai_adapter.py`

This will be the new adapter for Google's Generative AI.

```python
from .base import AIAdapter
import google.generativeai as genai

class GoogleGenAIAdapter(AIAdapter):
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')

    def generate_content(self, data: dict, additional_context: str | None = None) -> str:
        # Implementation of content generation using Google GenAI
        # ...
        return "Generated content from Google GenAI"
```

### 2.5. Blog Generator

The `blogGenerator.ts` will be migrated to a factory function or class in the `message_processor.py` that selects the AI adapter based on configuration.

```python
# In src/controllers/message_processor.py

from ..services.ai.base import AIAdapter
from ..services.ai.openai_adapter import OpenAIAdapter
from ..services.ai.google_genai_adapter import GoogleGenAIAdapter
from .. import config

def get_ai_adapter() -> AIAdapter:
    if config.AI_PROVIDER == "GOOGLE":
        return GoogleGenAIAdapter(api_key=config.GOOGLE_API_KEY)
    elif config.AI_PROVIDER == "OPENAI":
        return OpenAIAdapter(api_key=config.OPENAI_API_KEY)
    else:
        raise ValueError(f"Unknown AI provider: {config.AI_PROVIDER}")

# ... a function that uses the adapter
async def generate_blog_post(...):
    ai_adapter = get_ai_adapter()
    generated_content = await ai_adapter.generate_content(...)
    # ...
```

### 2.6. Controller (`src/controllers/message_processor.py`)

`messageProcessor.ts` will be migrated to `src/controllers/message_processor.py`. This will contain the logic for handling Pub/Sub messages. The web framework (e.g., FastAPI) will route messages to this controller. Pydantic models will be used for data validation, similar to the TypeScript interfaces.

### 2.7. Main Application (`src/main.py`)

This file will be the entry point of the application. It will initialize the web framework (e.g., FastAPI), set up routes, and start the server. One of the routes will be a POST endpoint that receives Pub/Sub messages.

## 3. Containerization

The existing `Dockerfile` will be replaced with a new one tailored for a Python application. It will:

1.  Use a Python base image (e.g., `python:3.11-slim`).
2.  Install dependencies from `pyproject.toml` (using Poetry or another build backend).
3.  Copy the `src` directory.
4.  Define the `CMD` to run the application using an ASGI server like `uvicorn`.

## 4. Testing

A `tests/` directory will be created for unit and integration tests. `pytest` will be used as the testing framework.

## 5. Potential Challenges

-   **Dependency Versions**: Ensuring compatibility between Python, Google Cloud libraries, and AI SDKs.
-   **Async Handling**: Correctly implementing asynchronous operations, especially with the web framework and I/O-bound tasks (Firestore, Pub/Sub, AI APIs).
-   **Configuration Management**: Securely handling API keys and other sensitive information.
-   **Feature Parity**: Ensuring the Python implementation has full feature parity with the existing TypeScript service. 