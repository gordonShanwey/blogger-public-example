# 1. Base Image
FROM python:3.11-slim

# 2. Set Environment Variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

# 3. Set Work Directory
WORKDIR /app

# 4. Install Poetry
RUN pip install poetry

# 5. Copy Dependency Files
COPY pyproject.toml poetry.lock ./

# 6. Install Dependencies
RUN poetry install --only main

# 7. Copy Application Code
COPY src/ ./src/

# 8. Expose Port
EXPOSE 8080

# 9. Command to Run Application
CMD ["poetry", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"] 
