#!/bin/bash

# ==========================================
# REAL ESTATE LEADS FINDER - VM SETUP SCRIPT
# Run this on your fresh Ubuntu 22.04 Server
# ==========================================

echo "🚀 Starting Setup..."

# 1. Update System
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Docker & Docker Compose
echo "🐳 Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 3. Clone Repository (You will need to provide your Repo URL)
# echo "📥 Cloning repository..."
# git clone <YOUR_REPO_URL> app
# cd app

# ALTERNATIVE: If copying files manually, assume we are in the app directory
# cd /path/to/app

# 4. Setup Environment
if [ ! -f .env ]; then
    echo "⚠️ .env file not found! Copying example..."
    cp .env.docker.example .env
    echo "❗ PLEASE EDIT .env WITH YOUR REAL KEYS!"
fi

# 5. Start Application
echo "🚀 Starting Docker Containers..."
sudo docker compose up -d

echo "✅ Deployment Complete!"
echo "------------------------------------------------"
echo "App is running at: http://$(curl -s ifconfig.me):8080"
echo "CRM is running at: http://$(curl -s ifconfig.me):3000"
echo "------------------------------------------------"
