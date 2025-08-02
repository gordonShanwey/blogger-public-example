resource "google_cloudfunctions2_function" "add_form_payload_event_fn" {
  name        = "${var.resource_prefix}-add-form-event-fn"
  location    = var.gcp_region
  project     = var.gcp_project_id
  description = "Cloud Function to add a form payload event to Pub/Sub."

  build_config {
    runtime     = "nodejs22" # Based on your function's package.json/dependencies
    entry_point = "publishToPubSub" # The exported function name in your index.js
    environment_variables = {
      "PUBSUB_TOPIC" = google_pubsub_topic.main.name, # Topic name from pubsub.tf
      "GCP_PROJECT"  = var.gcp_project_id
    }
    source {
      storage_source {
        bucket = google_storage_bucket.functions_source.name
        object = "addFormPayloadEvent.zip" # The name of the ZIP file in GCS
      }
    }
  }

  service_config {
    max_instance_count = 1 # Keep it small for this type of function
    min_instance_count = 0
    available_memory   = "256Mi"
    timeout_seconds    = 60
    ingress_settings               = "ALLOW_ALL" # Allows public HTTPS access
    all_traffic_on_latest_revision = true
    service_account_email          = google_service_account.function_sa.email
    environment_variables = { # <<<< MOST IMPORTANT FOR RUNTIME ACCESS
              "PUBSUB_TOPIC" = google_pubsub_topic.main.name,
              "GCP_PROJECT"  = var.gcp_project_id
            }
  }
}

# Output the function's HTTPS trigger URL
output "cloud_function_https_trigger_url" {
  description = "The HTTPS URL to trigger the addFormPayloadEvent function."
  value       = google_cloudfunctions2_function.add_form_payload_event_fn.service_config[0].uri
} 