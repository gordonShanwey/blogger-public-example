#!/bin/bash
#
# WARNING: This is a destructive script.
# It triggers a Google Cloud Build job to destroy all Terraform-managed
# infrastructure in the target GCP project.

set -e

echo "#####################################################################"
echo "# WARNING: This script will destroy all Terraform-managed           #"
echo "#          infrastructure in the project.                           #"
echo "#####################################################################"
echo ""

# Prompt for user confirmation
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Destroy operation cancelled."
    exit 1
fi

echo ""
echo "Submitting Terraform destroy build to Google Cloud Build..."

gcloud builds submit --config cloudbuild-destroy.yaml --service-account="projects/your-project-id/serviceAccounts/your-cloud-build-sa@your-project-id.iam.gserviceaccount.com" .

echo "Destroy build submitted successfully." 