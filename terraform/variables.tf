variable "gcp_project_id" {
  description = "The GCP Project ID to deploy resources into."
  type        = string
  default     = "your-project-id"
}

variable "gcp_region" {
  description = "The GCP Region to deploy resources into."
  type        = string
  default     = "your-region"
}

variable "resource_prefix" {
  description = "A prefix to be added to resource names to ensure uniqueness and identify the deployment."
  type        = string
  default     = "your-resource-prefix" # A sensible default, can be overridden
  validation {
    # Ensure it's a valid prefix for many GCP resources (alphanumeric, hyphens)
    # and not too long for service account IDs.
    condition     = can(regex("^[a-z0-9][a-z0-9-]{0,22}[a-z0-9]$", var.resource_prefix)) && length(var.resource_prefix) <= 24
    error_message = "The resource_prefix must be 1-24 characters, start and end with a lowercase letter or number, and contain only lowercase letters, numbers, or hyphens."
  }
}

variable "image_tag" {
  description = "The Docker image tag for the processor service."
  type        = string
  default     = "latest"
}

variable "openai_api_key_value" {
  description = "The OpenAI API key value to store in Secret Manager. Should be provided via terraform.tfvars or environment variable."
  type        = string
  sensitive   = true
  # No default value for security - must be provided
} 