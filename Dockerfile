# Use Node.js 18 LTS (matches Cloud Run runtime)
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user for security (commented out for testing)
# RUN useradd --create-home --shell /bin/bash appuser && chown -R appuser:appuser /app
# USER appuser

# Expose port
EXPOSE 8080

# Health check (disabled for testing)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD curl -f http://localhost:8080/health || exit 1

# Start the application (use minimal version for testing)
CMD ["node", "server-minimal.js"]