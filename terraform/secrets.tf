# Secret Manager resources for storing sensitive configuration values

# OpenAI API Key secret
resource "google_secret_manager_secret" "openai_api_key" {
  project   = var.gcp_project_id
  secret_id = "${var.resource_prefix}-openai-api-key"

  labels = {
    environment = "production"
    service     = "processor-service"
  }

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager_api]
}

# Placeholder secret version - this will need to be updated with the actual API key
# Note: In production, this should be managed outside of Terraform for security
resource "google_secret_manager_secret_version" "openai_api_key_version" {
  secret = google_secret_manager_secret.openai_api_key.id
  
  # Placeholder value - replace with actual OpenAI API key
  # In production, consider using:
  # - terraform import to import an existing secret version
  # - gcloud CLI to set the value after terraform apply
  # - Environment variables or secure CI/CD variables
  secret_data = var.openai_api_key_value

  lifecycle {
    ignore_changes = [secret_data]
  }
}

# Output the secret name for reference
output "openai_secret_name" {
  description = "The name of the OpenAI API key secret in Secret Manager"
  value       = google_secret_manager_secret.openai_api_key.name
  sensitive   = false
}