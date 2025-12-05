# Deployment Guide

This guide explains how to deploy the **Real Estate Leads Finder** suite, including the **Twenty CRM** integration, on your local machine or server using Docker.

## Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

## Quick Start

1.  **Configure Environment**
    Copy the example environment file:
    ```bash
    cp .env.docker.example .env
    ```
    Open `.env` and fill in your API keys (Gemini, Twilio, Stripe).

2.  **Start the System**
    Run the following command to download and start all services:
    ```bash
    docker-compose up -d
    ```
    *Note: The first run may take a few minutes to download images and build the app.*

3.  **Access the Applications**
    - **Real Estate App**: [http://localhost:8080](http://localhost:8080)
    - **Twenty CRM**: [http://localhost:3000](http://localhost:3000)

4.  **Final Setup (Connect CRM)**
    1.  Go to [http://localhost:3000](http://localhost:3000) and create your admin account.
    2.  Go to **Settings > Developers > API Keys**.
    3.  Create a new API Key.
    4.  Paste this key into your `.env` file as `TWENTY_API_KEY`.
    5.  Restart the app:
        ```bash
        docker-compose restart app
        ```

## Architecture
The system consists of 5 containers running together:
1.  `real-estate-app`: The main Node.js application.
2.  `twenty-server`: The CRM backend.
3.  `twenty-worker`: Background job processor for CRM.
4.  `shared-db`: PostgreSQL database (stores data for both apps).
5.  `redis`: Cache/Queue for the CRM.

## Troubleshooting
- **Database Connection Errors**: Ensure the `shared-db` container is healthy (`docker ps`).
## Option 2: Cloud VM (Recommended for Production)

This method runs the entire suite on a single Google Compute Engine instance (Ubuntu).

### 1. Create a VM Instance
1.  Go to **Google Cloud Console > Compute Engine**.
2.  Click **Create Instance**.
3.  **Machine Type**: `e2-medium` (2 vCPU, 4GB RAM) or larger.
4.  **Boot Disk**: Ubuntu 22.04 LTS (Standard Persistent Disk, 20GB+).
5.  **Firewall**: Check "Allow HTTP traffic" and "Allow HTTPS traffic".
6.  **Create**.

### 2. Open Ports
By default, Google Cloud blocks port 8080 and 3000. You need to allow them.
1.  Go to **VPC Network > Firewall**.
2.  Create Firewall Rule:
    *   **Name**: `allow-app-ports`
    *   **Targets**: All instances in the network
    *   **Source ranges**: `0.0.0.0/0`
    *   **Protocols and ports**: `tcp:8080`, `tcp:3000`

### 3. Deploy Code
1.  SSH into your new VM (click "SSH" in the console).
2.  Clone your repository:
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git app
    cd app
    ```
3.  Run the setup script:
    ```bash
    chmod +x setup-vm.sh
    ./setup-vm.sh
    ```
4.  Edit your `.env` file with your real keys:
    ```bash
    nano .env
    ```
5.  Restart to apply keys:
    ```bash
    sudo docker compose restart
    ```

### 4. Access
Your app is now live at `http://YOUR_VM_IP:8080`.

## 6. Updating the Production VM

To update the application on your Google Cloud VM with the latest changes (including the new Frontend and Ingestion Engine):

1.  **SSH into the VM:**
    ```bash
    gcloud compute ssh "your-vm-name" --zone "us-central1-a"
    ```

2.  **Navigate to the Project Directory:**
    ```bash
    cd ~/realestate-leads-finder
    ```

3.  **Pull the Latest Code:**
    ```bash
    git pull origin main
    ```

4.  **Rebuild and Restart Containers:**
    ```bash
    docker-compose down
    docker-compose up -d --build
    ```

5.  **Verify the Update:**
    *   Check logs: `docker-compose logs -f app`
    *   Visit the site: `https://your-domain.com`

### Troubleshooting Updates
*   If you see "Permission denied" errors, ensure you are running docker commands with `sudo` if your user isn't in the docker group.
*   If the database schema changed (e.g., new columns), the migrations should run automatically on startup. Check the logs to confirm.
