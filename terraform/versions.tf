terraform {
  required_version = ">= 1.0" # Specifies a minimum Terraform version

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.45.0" # Specifies a minimum version constraint for the Google provider
    }
  }
} 