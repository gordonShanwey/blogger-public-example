#!/bin/bash
#
# This script triggers a Google Cloud Build job to generate a Terraform plan,
# which serves as a drift detection report for the infrastructure.

set -e

echo "Submitting Terraform report build to Google Cloud Build..."

gcloud builds submit --config cloudbuild-tf-report.yaml --service-account="projects/your-project-id/serviceAccounts/your-cloud-build-sa@your-project-id.iam.gserviceaccount.com" .

echo "Report build submitted successfully." 