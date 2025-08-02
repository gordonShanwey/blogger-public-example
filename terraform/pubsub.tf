resource "google_pubsub_topic" "main" {
  name    = "${var.resource_prefix}-topic"
  project = var.gcp_project_id
}

resource "google_pubsub_subscription" "main" {
  name  = "${var.resource_prefix}-sub"
  topic = google_pubsub_topic.main.id
  project = var.gcp_project_id

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.processor_service.uri}/pubsub/push"
    oidc_token {
      service_account_email = google_service_account.pubsub_invoker_sa.email
      audience             = google_cloud_run_v2_service.processor_service.uri
    }
  }

  ack_deadline_seconds = 60
} 