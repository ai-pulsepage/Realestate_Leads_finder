#!/bin/bash

# Real-time logs monitoring for Cloud Run
echo "📊 Monitoring Cloud Run logs (real-estate-leads-api-00037-pcc)..."
echo "Press Ctrl+C to stop monitoring"
echo "=================================================="

gcloud run services logs read real-estate-leads-api-00037-pcc \
  --region us-east1 \
  --follow \
  --format "table(timestamp,severity,textPayload)"