# Terraform Deployment Plan: Blogger Processor Service

This document outlines the step-by-step plan to provision the necessary Google Cloud Platform (GCP) infrastructure for the Blogger Processor service using Terraform.

## Prerequisites

*   An existing GCP Project.
*   Secrets (e.g., API keys, database credentials) are created manually in GCP Secret Manager.
*   Terraform installed locally.
*   `gcloud` CLI authenticated and configured with appropriate permissions to apply Terraform changes.

## Terraform File Structure (Initial Suggestion)

*   `versions.tf`: Terraform and provider version constraints.
*   `variables.tf`: Input variables (project ID, region, etc.).
*   `providers.tf`: GCP provider configuration.
*   `apis.tf`: Manages enabling necessary GCP service APIs.
*   `service_accounts.tf`: Defines service accounts.
*   `firestore.tf`: Configures Firestore.
*   `artifact_registry.tf`: Configures Artifact Registry.
*   `cloud_run.tf`: Defines the Cloud Run service.
*   `pubsub.tf`: Defines Pub/Sub topics and subscriptions.
*   `iam.tf`: Manages IAM permissions and bindings.
*   `outputs.tf`: (Optional) Defines outputs, like the Cloud Run service URL.

## Deployment Phases and Steps

### Phase 1: Core Setup & Identities

1.  **Terraform Provider & Variables (`versions.tf`, `variables.tf`, `providers.tf`)**:
    *   Specify required Terraform and Google provider versions.
    *   Define input variables for `project_id` and `region`.
    *   Configure the Google Cloud provider.
2.  **Enable GCP APIs (`apis.tf`)**:
    *   Ensure the following GCP service APIs are enabled:
        *   Cloud Run API (`run.googleapis.com`)
        *   Pub/Sub API (`pubsub.googleapis.com`)
        *   IAM API (`iam.googleapis.com`)
        *   Artifact Registry API (`artifactregistry.googleapis.com`)
        *   Firestore API (`firestore.googleapis.com`)
        *   Secret Manager API (`secretmanager.googleapis.com`)
        *   Cloud Resource Manager API (`cloudresourcemanager.googleapis.com`) (often needed for project-level IAM)
        *   Service Usage API (`serviceusage.googleapis.com`) (to manage other APIs)
3.  **Create Service Accounts (`service_accounts.tf`)**:
    *   **Cloud Run Runtime Service Account**: The identity the Cloud Run service will use to execute and access other GCP services.
    *   **Pub/Sub Invoker Service Account**: The identity Pub/Sub will use to authenticate its push requests to the Cloud Run service.

### Phase 2: Data Store & Application Platform

4.  **Firestore (`firestore.tf`)**:
    *   Ensure Firestore is provisioned in the desired mode (Native or Datastore) and location. This might involve using `google_firestore_database` or relying on prior project setup.
5.  **Artifact Registry Repository (`artifact_registry.tf`)**:
    *   Create an Artifact Registry repository (Docker format) to store the `blogger-processor` container images.
6.  **Cloud Run Service (`cloud_run.tf`)**:
    *   Define and deploy the `blogger-processor` Cloud Run service.
    *   Configure it to use the "Cloud Run Runtime Service Account".
    *   The container image will be sourced from the Artifact Registry repository.
    *   Define an output for the deployed service's URL.

### Phase 3: Messaging Setup & Connection

7.  **Pub/Sub Topic (`pubsub.tf`)**:
    *   Create the Pub/Sub topic for `blogger-processor` messages.
8.  **IAM: Grant Pub/Sub Invoker Access to Cloud Run (`iam.tf`)**:
    *   Grant the "Pub/Sub Invoker Service Account" the `roles/run.invoker` IAM permission on the deployed Cloud Run service.
9.  **Pub/Sub Subscription (`pubsub.tf`)**:
    *   Create a Pub/Sub push subscription:
        *   Associated with the created topic.
        *   Push endpoint configured to the Cloud Run service's URL.
        *   Authentication method set to OIDC, using the "Pub/Sub Invoker Service Account".

### Phase 4: Granting Necessary Permissions to the Application

10. **IAM: Grant Cloud Run Access to Firestore (`iam.tf`)**:
    *   Grant the "Cloud Run Runtime Service Account" the necessary IAM roles (e.g., `roles/datastore.user`) to interact with the Firestore database.
11. **IAM: Grant Cloud Run Access to Secrets (`iam.tf`)**:
    *   Grant the "Cloud Run Runtime Service Account" the `roles/secretmanager.secretAccessor` IAM permission for each manually created secret that the application needs.
    *   Update the Cloud Run service configuration (in `cloud_run.tf`) to mount these secrets as environment variables.

## Next Steps

Proceed with implementing Phase 1, starting with `versions.tf`, `variables.tf`, and `providers.tf`. 