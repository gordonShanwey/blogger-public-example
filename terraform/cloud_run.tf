resource "google_cloud_run_v2_service" "processor_service" {
  name     = "${var.resource_prefix}-processor-service"
  location = var.gcp_region
  project  = var.gcp_project_id
  launch_stage = "BETA"
  deletion_protection = false

  template {
    containers {
      image = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/${var.resource_prefix}-images/processor-service:${var.image_tag}"

      env {
        name = "OPENAI_API_KEY_SECRET"
        value_source {
          secret_key_ref {
            secret  = "${var.resource_prefix}-openai-api-key" # Secret ID in Secret Manager
            version = "latest"                               # Use the latest version
          }
        }
      }
      env {
        name  = "TOPIC_NAME"
        value = "${var.resource_prefix}-topic"
      }
      env {
        name  = "SUBSCRIPTION_NAME"
        value = "${var.resource_prefix}-sub"
      }
      env {
        name  = "DB_NAME"
        value = "${var.resource_prefix}-db"
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.gcp_project_id
      }
      env {
        name  = "GCP_REGION"
        value = var.gcp_region
      }
      env {
        name  = "AI_PROVIDER"
        value = "GOOGLE"
      }
    }

    service_account = google_service_account.cloud_run_runtime_sa.email

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }
  }

  # Optional: allow unauthenticated invocations (for testing only; for production, restrict to Pub/Sub invoker SA)
  # ingress = "INGRESS_TRAFFIC_ALL"
}

output "cloud_run_service_url" {
  description = "The URL of the deployed Cloud Run service."
  value       = google_cloud_run_v2_service.processor_service.uri
} 