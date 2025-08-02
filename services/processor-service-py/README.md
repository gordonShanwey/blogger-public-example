# Processor Service (Python)

This service is responsible for processing Pub/Sub messages to generate blog posts using AI models.

This is a Python-based implementation migrated from an original Node.js/TypeScript service.

## Features

-   Receives messages from Google Cloud Pub/Sub.
-   Processes blog post creation and regeneration requests.
-   Generates content using AI providers (OpenAI, Google GenAI).
-   Stores results in Google Cloud Firestore.
-   Uploads generated content to Google Cloud Storage.

## Getting Started

### Prerequisites

-   Python 3.11+
-   Poetry for dependency management
-   Google Cloud SDK

### Installation

1.  Clone the repository.
2.  Navigate to `services/processor-service-py`.
3.  Install dependencies:

    ```bash
    poetry install
    ```

### Running the Service

```bash
poetry run uvicorn src.main:app --reload
``` 