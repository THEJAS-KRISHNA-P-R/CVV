#!/bin/bash

# Nirman Docker Setup Script
# This script sets up the complete development environment with Docker

set -e

echo "========================================="
echo "Nirman Docker Setup"
echo "========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "Please update .env.local with your Supabase and Groq credentials"
fi

# Function to run development environment
dev() {
    echo "Starting development environment..."
    docker-compose -f docker-compose.dev.yml up -d
    echo "✓ Development environment is running"
    echo "App: http://localhost:3000"
    echo "Database: localhost:5432"
    echo "Redis: localhost:6379"
}

# Function to run production environment
prod() {
    echo "Building production image..."
    docker build -t nirman:latest .
    echo "✓ Production image built"
    echo "Starting production environment..."
    docker-compose -f docker-compose.yml up -d
    echo "✓ Production environment is running on http://localhost:3000"
}

# Function to stop all containers
stop() {
    echo "Stopping all containers..."
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    docker-compose -f docker-compose.yml down 2>/dev/null || true
    echo "✓ All containers stopped"
}

# Function to clean up
clean() {
    echo "Cleaning up volumes and containers..."
    docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true
    docker-compose -f docker-compose.yml down -v 2>/dev/null || true
    echo "✓ Cleanup complete"
}

# Function to show logs
logs() {
    docker-compose -f docker-compose.dev.yml logs -f
}

# Function to show database schema
db-init() {
    echo "Initializing database schema..."
    docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d nirman -f /docker-entrypoint-initdb.d/01-init.sql || true
    echo "✓ Database schema initialized"
}

# Function to show help
help() {
    echo ""
    echo "Usage: ./scripts/docker-setup.sh [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev              Start development environment"
    echo "  prod             Start production environment"
    echo "  stop             Stop all containers"
    echo "  clean            Clean up all containers and volumes"
    echo "  logs             Show container logs"
    echo "  db-init          Initialize database schema"
    echo "  help             Show this help message"
    echo ""
}

# Main script logic
case "$1" in
    dev)
        dev
        ;;
    prod)
        prod
        ;;
    stop)
        stop
        ;;
    clean)
        clean
        ;;
    logs)
        logs
        ;;
    db-init)
        db-init
        ;;
    *)
        help
        ;;
esac
