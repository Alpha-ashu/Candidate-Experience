#!/bin/bash

# First Round AI - Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up First Round AI development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
fi

# Create backend .env.local if it doesn't exist
if [ ! -f backend/.env.local ]; then
    echo "📝 Creating backend/.env.local file..."
    cp backend/.env.local backend/.env.local
    echo "✅ Backend .env.local file created."
fi

# Function to display Docker Compose command
show_docker_command() {
    echo ""
    echo "🐳 To start the application, run:"
    echo ""
    if docker compose version &> /dev/null; then
        echo "   docker compose up -d"
    else
        echo "   docker-compose up -d"
    fi
    echo ""
    echo "🌐 Once started, you can access:"
    echo "   • Frontend: http://localhost:3000"
    echo "   • Backend API: http://localhost:8000"
    echo "   • API Docs: http://localhost:8000/docs"
    echo "   • Health Check: http://localhost:8000/healthz"
    echo ""
    echo "🛑 To stop the application:"
    if docker compose version &> /dev/null; then
        echo "   docker compose down"
    else
        echo "   docker-compose down"
    fi
    echo ""
    echo "📊 To view logs:"
    if docker compose version &> /dev/null; then
        echo "   docker compose logs -f"
    else
        echo "   docker-compose logs -f"
    fi
    echo ""
}

# Ask user if they want to start the services
echo "🤔 Would you like to start the services now? (y/N)"
read -r response
case "$response" in
    [yY][eE][sS]|[yY])
        echo "🚀 Starting services..."
        if docker compose version &> /dev/null; then
            docker compose up -d --build
        else
            docker-compose up -d --build
        fi

        echo "⏳ Waiting for services to be ready..."
        sleep 10

        # Check if services are running
        if docker compose version &> /dev/null; then
            if docker compose ps | grep -q "Up"; then
                echo "✅ Services are running!"
            else
                echo "❌ Some services failed to start. Check logs with:"
                if docker compose version &> /dev/null; then
                    echo "   docker compose logs"
                else
                    echo "   docker-compose logs"
                fi
            fi
        else
            if docker-compose ps | grep -q "Up"; then
                echo "✅ Services are running!"
            else
                echo "❌ Some services failed to start. Check logs with:"
                echo "   docker-compose logs"
            fi
        fi

        show_docker_command
        ;;
    *)
        echo "✅ Setup complete!"
        show_docker_command
        ;;
esac

echo ""
echo "🎉 First Round AI development environment is ready!"
echo ""
echo "📚 Next steps:"
echo "1. Edit .env file with your API keys (OpenAI, Google AI)"
echo "2. Start the services with the command shown above"
echo "3. Open http://localhost:3000 in your browser"
echo "4. Create an account and start using the platform!"
echo ""
echo "🐛 For development:"
echo "• Backend code: ./backend/"
echo "• Frontend code: ./src/"
echo "• Hot reload is enabled for both services"
echo ""
echo "📖 For more information, see the README.md file"