# Dockerfile for Goat Sales App
# Node 20 Alpine with Doppler CLI and Supabase CLI

FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    bash \
    postgresql-client \
    openssl

# Install Doppler CLI
RUN curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/public/install/unix.sh | sh

# Install Supabase CLI
RUN curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz -C /usr/local/bin

# Make Supabase CLI executable
RUN chmod +x /usr/local/bin/supabase

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application files
COPY . .

# Expose Next.js port
EXPOSE 3000

# Default command (can be overridden in docker-compose.yml)
CMD ["npm", "run", "dev"]
