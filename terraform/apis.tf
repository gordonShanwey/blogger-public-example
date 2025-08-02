resource "google_project_service" "run_api" {
  project = var.gcp_project_id
  service = "run.googleapis.com"
  # Retain the API even if Terraform is destroyed, as it's a foundational service.
  # Set to false if you want Terraform to attempt to disable it on destroy.
  disable_on_destroy = false
}

resource "google_project_service" "pubsub_api" {
  project            = var.gcp_project_id
  service            = "pubsub.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iam_api" {
  project            = var.gcp_project_id
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifactregistry_api" {
  project            = var.gcp_project_id
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "firestore_api" {
  project            = var.gcp_project_id
  service            = "firestore.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "secretmanager_api" {
  project            = var.gcp_project_id
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudresourcemanager_api" {
  project            = var.gcp_project_id
  service            = "cloudresourcemanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "serviceusage_api" {
  project            = var.gcp_project_id
  service            = "serviceusage.googleapis.com"
  disable_on_destroy = false
} 