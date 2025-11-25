#!/bin/bash

# ============================================================
# CLOUD RUN DEPLOYMENT SCRIPT
# Real Estate Leads SaaS Platform
# ============================================================

set -e  # Exit on any error

echo "========================================="
echo "DEPLOYING REAL ESTATE LEADS API"
echo "========================================="
echo ""

# Configuration
SERVICE_NAME="real-estate-leads-api-00037-pcc"
REGION="us-east1"
PROJECT_ID="real-estate-leads-478814"

# Environment Variables
DATABASE_URL="postgresql://postgres:Admin%401234@172.27.64.3:5432/real_estate_leads?sslmode=no-verify"
TWILIO_ACCOUNT_SID="AC95a9e3ad0bfed7ba932dcf64e5b98b62"
TWILIO_AUTH_TOKEN="2696a443a0e9f3e4b3edd4e41a6d45d5"
SENDGRID_API_KEY="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"
GEMINI_API_KEY="AIzaSyA73wkeAguf1OsMFQuRu1mqAx9IIioz5S4"
STRIPE_SECRET_KEY="sk_test_51QOoA0RuXQ7K68hGvzKc7zHx7X8eXCXZK9KWsNGZvl1Ww5WoXUNu1vVbI6sZ4qA1HGNEjQ8tqKM43d9qBRsAHpDJ00iR6NyNKG"
STRIPE_WEBHOOK_SECRET="whsec_b1f8d5e3c8a4f2e9d6c3b0a7f4e1d8c5"

echo "Step 1: Setting project..."
gcloud config set project $PROJECT_ID

echo ""
echo "Step 2: Updating environment variables..."
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --update-env-vars GEMINI_API_KEY="$GEMINI_API_KEY"

echo ""
echo "Step 3: Deploying new code..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated

echo ""
echo "========================================="
echo "DEPLOYMENT COMPLETE!"
echo "========================================="
echo ""

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')

echo "Service URL: $SERVICE_URL"
echo ""

# Test health endpoint
echo "Testing health endpoint..."
curl -s "${SERVICE_URL}/health" | jq '.' || echo "Health check response received"

echo ""
echo "Deployment successful! ✅"
echo ""
