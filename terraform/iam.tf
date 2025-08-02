resource "google_cloud_run_v2_service_iam_member" "allow_pubsub_invoker" {
  project        = var.gcp_project_id
  location       = var.gcp_region
  name           = google_cloud_run_v2_service.processor_service.name
  role           = "roles/run.invoker"
  member         = "serviceAccount:${google_service_account.pubsub_invoker_sa.email}"
}

# Allow Cloud Run runtime SA to access Firestore
resource "google_project_iam_member" "cloud_run_firestore" {
  project = var.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run_runtime_sa.email}"
}

# Allow Cloud Run runtime SA to access Secret Manager
resource "google_project_iam_member" "cloud_run_secretmanager" {
  project = var.gcp_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_runtime_sa.email}"
}

# Allow Cloud Run runtime SA to access Vertex AI
resource "google_project_iam_member" "cloud_run_vertex_ai" {
  project = var.gcp_project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.cloud_run_runtime_sa.email}"
}

# (Optional) Allow Cloud Run runtime SA to publish to Pub/Sub
resource "google_project_iam_member" "cloud_run_pubsub_publisher" {
  project = var.gcp_project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.cloud_run_runtime_sa.email}"
}

resource "google_project_iam_member" "function_pubsub_publisher" {
  project = var.gcp_project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.function_sa.email}"
}

resource "google_storage_bucket_iam_member" "function_sa_object_viewer" {
  bucket = google_storage_bucket.functions_source.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.function_sa.email}"
}

# Allow Cloud Run runtime SA to write logs to Cloud Logging
resource "google_project_iam_member" "cloud_run_logs_writer" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter" # Grants permission to write log entries
  member  = "serviceAccount:${google_service_account.cloud_run_runtime_sa.email}"
}

