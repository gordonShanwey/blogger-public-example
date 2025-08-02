### Version: 0.1.0

# Blogger Template Infrastructure (Template Repository)

This is a **template repository** containing infrastructure-as-code (IaC) configuration for a serverless blog generation application on Google Cloud Platform (GCP). The infrastructure is managed by Terraform and deployed automatically using Google Cloud Build pipelines.

The application consists of an event-driven architecture where a Cloud Function ingests data, places it on a Pub/Sub topic, and a Cloud Run service processes it using AI to generate blog posts.

## Getting Started with this Template

Follow these steps to customize this template for your own use:

### 1. Fork or Clone this Repository

Create your own copy of this template repository.

### 2. Configure Your Project Settings

⚠️ **Important:** This template contains placeholder values that must be replaced with your actual project configuration. See `CONFIGURATION_PLACEHOLDERS.md` for a complete list of required replacements.

Update the following files to match your project:

#### A. Update Resource Prefix in Terraform

Edit `terraform/variables.tf` and change the `resource_prefix` default value:

```hcl
variable "resource_prefix" {
  description = "A prefix to be added to resource names to ensure uniqueness and identify the deployment."
  type        = string
  default     = "your-resource-prefix" # Change this to your desired prefix
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{0,22}[a-z0-9]$", var.resource_prefix)) && length(var.resource_prefix) <= 24
    error_message = "The resource_prefix must be 1-24 characters, start and end with a lowercase letter or number, and contain only lowercase letters, numbers, or hyphens."
  }
}
```

#### B. Update Cloud Build Files

Update the `resource_prefix` variable in all Cloud Build configuration files:
- `cloudbuild.yaml`
- `cloudbuild-destroy.yaml`  
- `cloudbuild-tf-report.yaml`

Change the `_RESOURCE_PREFIX` substitution value to match your chosen prefix.

### 3. Configure GCP Project

Set up your Google Cloud Platform project:

```bash
# Set your project ID
gcloud config set project [YOUR_GCP_PROJECT_ID]

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable firestore.googleapis.com
```

### 4. Set Up Cloud Build Triggers

Create a Cloud Build trigger to automatically deploy your infrastructure:

1. Go to the [Cloud Build Triggers page](https://console.cloud.google.com/cloud-build/triggers) in the Google Cloud Console
2. Click "Create Trigger"
3. Connect your repository
4. Configure the trigger to use `cloudbuild.yaml`
5. Set up any additional trigger conditions as needed

### 5. Customize AI Prompts

Edit the prompts in `services/processor-service/src/services/openai.ts` to match your blog generation requirements and style preferences.

### 6. Configure Security Settings

#### A. Cloud Function Access
By default, the Cloud Function is set to be publicly accessible. Review and adjust the IAM settings in `terraform/cloud_function.tf` based on your security requirements.

#### B. Firestore Rules
The Firestore security rules are configured to be publicly accessible for development purposes. Review and update `terraform/firestore.rules` for production use:

```javascript
// Example: More restrictive rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null; // Require authentication
    }
  }
}
```



## Prerequisites

Before you begin, ensure you have the following tools installed and configured:

*   **Google Cloud SDK:** [Installation Guide](https://cloud.google.com/sdk/docs/install)
*   **gcloud CLI:** Initialized and authenticated to your GCP account.
    ```bash
    gcloud auth login
    gcloud config set project [YOUR_GCP_PROJECT_ID]
    ```

## Core Workflows

This repository is designed to be managed primarily through automated Cloud Build pipelines. The following scripts and files are provided to trigger these workflows.

### Deploying Infrastructure

To build the container images, provision all the necessary GCP resources, and deploy the application, run the main Cloud Build pipeline:

```bash
gcloud builds submit --config cloudbuild.yaml .
```

This command executes the steps defined in `cloudbuild.yaml` to create the entire infrastructure stack.

### Checking for Drift (Report)

To check for any configuration drift between your Terraform code and the deployed infrastructure, run the report script. This script triggers a `terraform plan` to provide a snapshot of the current state.

```bash
./run-report.sh
```

### Destroying Infrastructure

To tear down all the resources managed by Terraform in this project, use the destroy script. This is a destructive operation and includes a confirmation prompt to prevent accidents.

```bash
./run-destroy.sh
```

**Note:** For the destroy workflow to succeed, the Cloud Build service account may require elevated permissions to delete service accounts.

## Infrastructure Overview

The `terraform/` directory defines the following GCP resources:

*   **Cloud Run:** A serverless service (`processor-service`) to process events.
*   **Cloud Functions:** An event-triggered function (`addFormPayloadEvent`) to receive incoming data.
*   **Pub/Sub:** A topic (`main`) and a subscription to link the function and the Cloud Run service.
*   **Artifact Registry:** A Docker repository to store the container image for the `processor-service`.
*   **Firestore:** A serverless NoSQL database for data storage.
*   **IAM & Service Accounts:** Dedicated service accounts with fine-grained permissions for the Cloud Run service and Cloud Function.
*   **Cloud Storage:** A bucket to store the Cloud Function's source code.

## Service Details

### `functions/addFormPayloadEvent`

This is a simple, HTTP-triggered Cloud Function that serves as the entry point for the data processing pipeline.

*   **Trigger:** Receives HTTPS POST requests.
*   **Action:** It expects a JSON payload containing a `message` key. The value of this key is extracted and published as a message to a configured Pub/Sub topic.
*   **Purpose:** To decouple the initial data ingestion from the main processing logic, allowing for a scalable, event-driven architecture.

### `services/processor-service`

This is a more complex Cloud Run service that acts as the primary data processor for the application.

*   **Trigger:** It is subscribed to the Pub/Sub topic via a push subscription. When a message is published by the Cloud Function, this service receives it.
*   **Action:** Upon receiving a message, the service performs several steps:
    1.  **Parses** the incoming message, which is expected to contain details for a blog post (title, content, keywords, etc.).
    2.  **Generates** a new blog post, likely using a generative AI service, based on the input data.
    3.  **Saves** the generated content and metadata to a Firestore database.
    4.  **Uploads** a file (presumably the generated post) to a Cloud Storage bucket.
*   **Purpose:** To handle the core business logic of generating and storing content in an asynchronous, scalable manner.

### `frontend/`

This directory contains a modern, client-side React application built with Vite. It serves as the user interface for managing and generating blog posts.

*   **Framework:** React 19 with TypeScript.
*   **UI:** Styled with Tailwind CSS and the Shadcn/ui component library.
*   **Features:**
    *   User authentication to access a protected dashboard.
    *   A dashboard to view and manage posts.
    *   A form for submitting new blog post generation requests.
    *   Detail views for both pending and accepted posts.
*   **Note on GCP SDKs:** The application currently includes the `@google-cloud/pubsub` and `@google-cloud/storage` SDKs as direct dependencies. Using these server-side SDKs in a front-end application is a security risk and is not recommended. The standard practice is to have the front end communicate with a secure, server-side API endpoint (like the `addFormPayloadEvent` Cloud Function) which then interacts with GCP services on the user's behalf.

## File & Directory Structure

```
.
├── functions/
│   └── addFormPayloadEvent/  # Source for the Cloud Function
├── services/
│   └── processor-service/    # Source for the Cloud Run service
├── frontend/                 # Source for the React front-end application
├── terraform/
│   ├── *.tf                  # Terraform configuration files
│   └── backend.tf            # Backend configuration for Terraform state
├── .gcloudignore             # Files to exclude from Cloud Build uploads
├── cloudbuild.yaml           # Main deployment pipeline
├── cloudbuild-destroy.yaml   # Pipeline to destroy infrastructure
├── cloudbuild-tf-report.yaml # Pipeline for drift detection
├── run-destroy.sh            # Helper script to run the destroy pipeline
├── run-report.sh             # Helper script to run the report pipeline
└── README.md                 # This file
```

