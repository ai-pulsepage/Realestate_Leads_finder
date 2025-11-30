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
- **Port Conflicts**: If port 8080 or 3000 is in use, edit `docker-compose.yml` to map to different ports (e.g., `"8081:8080"`).
