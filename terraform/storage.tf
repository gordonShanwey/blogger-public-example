resource "google_storage_bucket" "functions_source" {
  name     = "${var.resource_prefix}-functions-source-${var.gcp_project_id}"
  location = var.gcp_region

  # Optional: Prevent accidental deletion of the bucket
  force_destroy = true 

  uniform_bucket_level_access = true

  # Optional: Add labels for organization
  labels = {
    environment = "template"
    purpose     = "cloud-functions-source"
  }
} 