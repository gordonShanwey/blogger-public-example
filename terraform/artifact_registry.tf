# Creates an Artifact Registry repository for Docker images.
resource "google_artifact_registry_repository" "docker_repo" {
  project       = var.gcp_project_id
  location      = var.gcp_region # Artifact Registry repositories are regional
  repository_id = "${var.resource_prefix}-images" # Name for the repository
  description   = "Docker image repository for the ${var.resource_prefix} deployment"
  format        = "DOCKER"      # Specifies the format of the repository

  # Optional: KMS key for encryption, lifecycle policies, etc.
  # For a template, keeping it simple initially is fine.

  # Optional: Set an immutable tags policy.
  # This prevents tags like "latest" from being overwritten, which can be good practice.
  # For a template, this might be too restrictive initially, so it's commented out.
  # docker_config {
  #   immutable_tags = true
  # }

  # Optional: Cleanup policies can be defined here to automatically delete old images.
  # cleanup_policies {
  #   id     = "delete-untagged-images-after-30-days"
  #   action = "DELETE"
  #   condition {
  #     tag_state    = "UNTAGGED"
  #     older_than   = "2592000s" # 30 days in seconds
  #   }
  # }
  # cleanup_policy_dry_run = false # Set to true to test policies without deleting
}

# Output the repository URL, which might be useful for CI/CD pipelines.
output "artifact_registry_repository_url" {
  description = "The URL of the Artifact Registry Docker repository."
  value       = "${google_artifact_registry_repository.docker_repo.location}-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"
} 