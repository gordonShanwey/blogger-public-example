# Terraform Infrastructure Report

This document summarizes the Google Cloud Platform (GCP) infrastructure provisioned using Terraform for the blogger-template project.

## Overall Goal

The primary goal of this Terraform setup is to deploy a scalable, event-driven application consisting of a Cloud Run service that processes messages from a Pub/Sub topic, and a Cloud Function to publish messages to that topic. The infrastructure is designed to be templated using a resource prefix for easy replication (e.g., for different environments like staging, production, or per-developer instances).

## Core Configuration

*   **Terraform & Provider Versions**: Defined in `terraform/versions.tf`.
*   **Variables (`terraform/variables.tf`)**:
    *   `gcp_project_id`: The target GCP project ID (e.g., "your-project-id").
    *   `gcp_region`: The GCP region for deploying resources (e.g., "your-region").
    *   `resource_prefix`: A prefix for all created resources to ensure uniqueness and easy identification (e.g., "your-resource-prefix").
*   **Provider Setup (`terraform/providers.tf`)**: Configured the Google Cloud provider.
*   **API Enablement (`terraform/apis.tf`)**:
    *   Cloud Run API (`run.googleapis.com`)
    *   Pub/Sub API (`pubsub.googleapis.com`)
    *   Identity and Access Management (IAM) API (`iam.googleapis.com`)
    *   Artifact Registry API (`artifactregistry.googleapis.com`)
    *   Firestore API (`firestore.googleapis.com`)
    *   Secret Manager API (`secretmanager.googleapis.com`)
    *   Cloud Resource Manager API (`cloudresourcemanager.googleapis.com`)
    *   Service Usage API (`serviceusage.googleapis.com`)

## Deployed Resources

### 1. Service Accounts (`terraform/service_accounts.tf`)

*   **Cloud Run Runtime SA**: `google_service_account "cloud_run_runtime_sa"`
    *   ID: `"${var.resource_prefix}-cr-sa"`
    *   Purpose: Identity for the main `processor-service` running on Cloud Run.
*   **Pub/Sub Invoker SA**: `google_service_account "pubsub_invoker_sa"`
    *   ID: `"${var.resource_prefix}-ps-sa"`
    *   Purpose: Allows Pub/Sub push subscriptions to securely invoke the Cloud Run service.
*   **Cloud Function SA**: `google_service_account "function_sa"`
    *   ID: `"${var.resource_prefix}-fn-sa"`
    *   Purpose: Identity for the Cloud Function (`addFormPayloadEvent`).

### 2. Data Storage

*   **Firestore Database (`terraform/firestore.tf`)**:
    *   `google_firestore_database "named_db"`
    *   Name: `"${var.resource_prefix}-db"`
    *   Type: `FIRESTORE_NATIVE`
    *   Location: Matches `var.gcp_region`.
    *   Purpose: Dedicated database for the application, separate from the `(default)` database.
*   **Cloud Storage Bucket (`terraform/storage.tf`)**:
    *   `google_storage_bucket "function_source_bucket"`
    *   Name: `"${var.resource_prefix}-functions-source-${var.gcp_project_id}"`
    *   Purpose: Stores the zipped source code for the Cloud Function.

### 3. Application Hosting & Compute

*   **Artifact Registry Repository (`terraform/artifact_registry.tf`)**:
    *   `google_artifact_registry_repository "docker_images"`
    *   Name: `"${var.resource_prefix}-images"`
    *   Format: Docker
    *   Purpose: Stores Docker images for services like the `processor-service`.
*   **Cloud Run Service (`terraform/cloud_run.tf`)**:
    *   `google_cloud_run_v2_service "processor_service"`
    *   Name: `"${var.resource_prefix}-processor-svc"`
    *   Image: Pulled from the Artifact Registry repository (`${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.docker_images.name}/processor-service:latest`).
    *   Service Account: `cloud_run_runtime_sa`.
    *   Environment Variables:
        *   `OPENAI_API_KEY_SECRET`: (Placeholder, intended for Secret Manager integration)
        *   `TOPIC_NAME`: `"${var.resource_prefix}-topic"`
        *   `SUBSCRIPTION_NAME`: `"${var.resource_prefix}-sub"`
        *   `DB_NAME`: `"${var.resource_prefix}-db"`
        *   `GCP_PROJECT`: `var.gcp_project_id`
    *   Scaling: Min 0, Max 2 instances.
    *   Purpose: Hosts the main message processing logic.
*   **Cloud Function (`terraform/cloud_function.tf`)**:
    *   `google_cloudfunctions2_function "add_form_event_function"`
    *   Name: `"${var.resource_prefix}-add-form-event-fn"`
    *   Runtime: `nodejs22`
    *   Entry Point: `publishToPubSub`
    *   Source: Uploaded ZIP from the `function_source_bucket`.
    *   Service Account: `function_sa`.
    *   Environment Variables:
        *   `PUBSUB_TOPIC`: `google_pubsub_topic.primary_topic.name`
        *   `GCP_PROJECT`: `var.gcp_project_id`
    *   Trigger: HTTP (public access managed manually post-deployment, initially tried `allUsers` invoker).
    *   Purpose: Provides an HTTP endpoint to publish messages to the Pub/Sub topic.

### 4. Messaging (`terraform/pubsub.tf`)

*   **Pub/Sub Topic**: `google_pubsub_topic "primary_topic"`
    *   Name: `"${var.resource_prefix}-topic"`
    *   Purpose: Central topic for application events.
*   **Pub/Sub Subscription**: `google_pubsub_subscription "primary_subscription"`
    *   Name: `"${var.resource_prefix}-sub"`
    *   Topic: Links to `primary_topic`.
    *   Push Configuration:
        *   Endpoint: `"${google_cloud_run_v2_service.processor_service.uri}/pubsub/push"`
        *   Authentication: OIDC token using `pubsub_invoker_sa`.
    *   Purpose: Delivers messages from the topic to the `processor-service` via HTTP push.

### 5. IAM Permissions (`terraform/iam.tf`)

*   **Pub/Sub Invoker SA Permissions**:
    *   Granted `roles/run.invoker` on the `processor_service` Cloud Run service.
        *   Allows the `pubsub_invoker_sa` to call the Cloud Run service.
*   **Cloud Run Runtime SA Permissions**:
    *   Granted `roles/datastore.user` on the project.
        *   Allows the `processor-service` to read/write to Firestore databases (including the named one).
    *   Granted `roles/logging.logWriter` on the project.
        *   Allows the `processor-service` to write logs to Cloud Logging.
*   **Cloud Function SA Permissions**:
    *   Granted `roles/pubsub.publisher` on the `primary_topic`.
        *   Allows the `add_form_event_function` to publish messages to the topic.
    *   Granted `roles/storage.objectViewer` on the `function_source_bucket`.
        *   Allows deployment mechanisms (like Terraform or CI/CD acting as the user) to read the function's source code from the bucket.

## Outputs

Terraform implicitly provides outputs for resource attributes, such as:
*   Artifact Registry repository URL.
*   Cloud Run service URL.
*   Cloud Function URL.

## Key Iterations & Decisions During Development

*   **Firestore Database**: Shifted from using the `(default)` Firestore database to a dedicated, named database created and managed by Terraform (`"${var.resource_prefix}-db"`). This required updating the `processor-service` application code to respect the `DB_NAME` environment variable.
*   **Service Account ID Length**: Encountered and resolved issues with service account ID length constraints by shortening suffixes (e.g., `-cr-runtime-sa` to `-cr-sa`) and adjusting the `resource_prefix` length validation.
*   **Cloud Run Image Architecture**: Addressed an `exec format error` by explicitly building the Docker image for `linux/amd64`.
*   **Cloud Run Traffic Block**: Removed an problematic `traffic` block from the Cloud Run resource definition.
*   **Pub/Sub Push Endpoint**: Corrected the Pub/Sub push subscription endpoint from the Cloud Run service root (`/`) to the specific application path (`/pubsub/push`).
*   **Cloud Function Access**: Initially configured public access via IAM (`allUsers` with `roles/cloudfunctions.invoker`), but later reverted to `ingress_settings = "ALLOW_ALL"` with the understanding that true public unauthenticated access for Gen2 functions often still requires the IAM binding, which was then decided to be managed manually in the console for the time being.
*   **Cloud Run Logging**: Added `roles/logging.logWriter` to the Cloud Run runtime service account to resolve permission errors.
*   **Secret Management**: Integration with Secret Manager for secrets like `OPENAI_API_KEY_SECRET` has been implemented. The secret is created via terraform and securely referenced by the Cloud Run service. See `terraform/SECRET_MANAGER_SETUP.md` for configuration details.

This setup provides a robust and replicable foundation for the application. 