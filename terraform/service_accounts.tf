# Cloud Run Runtime Service Account
# This service account will be used by the Cloud Run service as its identity.
resource "google_service_account" "cloud_run_runtime_sa" {
  project      = var.gcp_project_id
  account_id   = "${var.resource_prefix}-cr-sa" # Using the prefix, shortened suffix
  display_name = title("${replace(var.resource_prefix, "-", " ")} Cloud Run SA") # Adjusted display name
  description  = "Service account for the ${var.resource_prefix} Cloud Run service to run as."
}

# Pub/Sub Invoker Service Account
# This service account will be used by Pub/Sub to invoke the Cloud Run service.
resource "google_service_account" "pubsub_invoker_sa" {
  project      = var.gcp_project_id
  account_id   = "${var.resource_prefix}-ps-sa" # Using the prefix, shortened suffix
  display_name = title("${replace(var.resource_prefix, "-", " ")} Pub/Sub Invoker SA") # Display name consistent
  description  = "Service account for ${var.resource_prefix} Pub/Sub push to Cloud Run."
}

resource "google_service_account" "function_sa" {
  project      = var.gcp_project_id
  account_id   = "${var.resource_prefix}-fn-sa"
  display_name = title("${replace(var.resource_prefix, "-", " ")} Function SA")
  description  = "Service account for ${var.resource_prefix} Cloud Function to publish to Pub/Sub."
} 