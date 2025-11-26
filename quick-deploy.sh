#!/bin/bash

echo "🔧 Quick Deploy Workflow for Cloud Run"
echo "======================================"

# Check if we have changes to deploy
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Committing local changes..."
    git add .
    git commit -m "Quick deploy: $(date)"
else
    echo "✅ No local changes to commit"
fi

echo "🚀 Deploying to Cloud Run..."
./deploy.sh

echo "📊 Starting log monitoring..."
echo "Press Ctrl+C to stop logs, then run './quick-deploy.sh' again for next iteration"
echo "=================================================="

./logs.sh