# GCP-based Express Application with Pub/Sub Integration

A boilerplate for building Express applications on Google Cloud Platform that can directly process Pub/Sub messages and store data in Firestore. Designed for deployment to Google Cloud Run.

## Features

- TypeScript-based Express application using Node.js 22's built-in TypeScript support
- Google Cloud Platform integration:
  - Pub/Sub subscription listener
  - Firestore database
  - Cloud Storage
  - Cloud Logging
- Docker-based development and deployment
- Continuous Integration and Deployment with Cloud Build
- Environment configuration
- Request logging middleware
- Error handling
- Graceful shutdown handling

## Prerequisites

- Node.js 22 or higher
- Docker and Docker Compose for local development
- Google Cloud SDK (for deployment)
- A Google Cloud Platform project
- A service account with appropriate permissions for:
  - Pub/Sub subscription access
  - Firestore read/write
  - Cloud Storage access
  - Cloud Run deployment

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file from the example:
   ```
   cp .env.example .env
   ```
4. Update the `.env` file with your GCP project settings
5. Download your GCP service account key and place it in the root directory as `gcp-credentials.json` (or update the path in your `.env` file)
6. Create a Pub/Sub subscription in your GCP project and update the `PUBSUB_SUBSCRIPTION_NAME` in your `.env` file

## Local Development

### Option 1: Node.js Directly

Start the development server:

```
npm run dev
```

The server will be available at `http://localhost:8080`. It will also listen for messages on your configured Pub/Sub subscription.

### Option 2: Using Docker

Build and run the Docker container locally:

```
npm run docker:build
npm run docker:run
```

Or using Docker Compose for development with hot reloading:

```
npm run docker:dev
```

## Building for Production

```
npm run build
```

This compiles TypeScript to JavaScript in the `dist` directory.

## Deploying to Google Cloud Platform

### Option 1: Manual Deployment

Build and deploy the container manually:

```
npm run deploy:manual
```

### Option 2: Cloud Build (CI/CD)

Submit a build to Cloud Build, which will build and deploy to Cloud Run:

```
npm run deploy:cloud-run
```

You can also set up Cloud Build Triggers to automatically build and deploy when you push to a specific branch in your repository.

## Cloud Run Configuration

The application is deployed to Google Cloud Run with the following configuration:

- Memory: 512Mi
- CPU: 1
- Min instances: 0
- Max instances: 10
- Environment variables: NODE_ENV=production, NODE_OPTIONS=--import=tsx
- Secrets: GOOGLE_APPLICATION_CREDENTIALS (from Secret Manager)

## Project Structure

```
.
├── src/
│   ├── index.ts                  # Application entry point
│   ├── routes/                   # API routes
│   │   └── index.ts              # Route definitions
│   ├── controllers/              # Business logic controllers
│   │   └── messageProcessor.ts   # Pub/Sub message processing logic
│   └── services/                 # External service integrations
│       ├── pubsub.ts             # Google Cloud Pub/Sub service
│       ├── firestore.ts          # Google Cloud Firestore service
│       └── storage.ts            # Google Cloud Storage service
├── Dockerfile                    # Production Docker configuration
├── Dockerfile.dev                # Development Docker configuration
├── docker-compose.yml           # Docker Compose for local development
├── cloudbuild.yaml              # Cloud Build configuration for CI/CD
├── .env.example                  # Example environment variables
├── package.json                  # Project dependencies
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # Project documentation
```

## API Endpoints

- `GET /` - Health check endpoint
- `GET /api/hello` - Example API endpoint
- `GET /api/messages/:id` - Retrieve a processed message by ID

## Pub/Sub Message Processing

The application automatically listens for messages on the configured Pub/Sub subscription. When a message arrives:

1. The message is parsed and logged
2. The message is processed according to your business logic
3. The results are stored in Firestore
4. If the message contains file content, it's uploaded to Cloud Storage
5. The Firestore document is updated with the file URL

## License

ISC 


test 2