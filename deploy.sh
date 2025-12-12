#!/bin/bash

# Quick deploy script for Cloud Run
echo "🚀 Deploying to Cloud Run..."

# Build and deploy
gcloud run deploy real-estate-leads-api \
  --project real-estate-leads-478814 \
  --source . \
  --region us-east1 \
  --platform managed \
  --allow-unauthenticated \
  --vpc-connector real-estate-connector \
  --set-env-vars "DATABASE_URL=postgresql://api_user:E5%22j%2FFq%7C%40oqY%3B%2B%23e@172.27.64.3:5432/real_estate_leads?sslmode=no-verify" \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY}" \
  --set-env-vars "TWILIO_ACCOUNT_SID=AC95a9e3ad0bfed7ba932dcf64e5b98b62" \
  --set-env-vars "TWILIO_AUTH_TOKEN=2696a443a0e9f3e4b3edd4e41a6d45d5" \
  --set-env-vars "SENDGRID_API_KEY=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" \
  --set-env-vars "STRIPE_SECRET_KEY=sk_test_51QOoA0RuXQ7K68hGvzKc7zHx7X8eXCXZK9KWsNGZvl1Ww5WoXUNu1vVbI6sZ4qA1HGNEjQ8tqKM43d9qBRsAHpDJ00iR6NyNKGS" \
  --set-env-vars "STRIPE_WEBHOOK_SECRET=whsec_b1f8d5e3c8a4f2e9d6c3b0a7f4e1d8c5" \
  --set-env-vars "NODE_ENV=production"

echo "✅ Deployment complete!"