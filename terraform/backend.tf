terraform {
  backend "gcs" {
    // The 'bucket' attribute is intentionally NOT specified here.
    // It will be configured by the '-backend-config="bucket=..."'
    // flag during 'terraform init' in your cloudbuild.yaml.
    // You only need to specify the backend type and the prefix.
    prefix = "terraform/state" // This should match the -backend-config in cloudbuild.yaml
  }
} 