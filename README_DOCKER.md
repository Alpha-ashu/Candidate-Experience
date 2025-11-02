# First Round AI - Docker Setup Guide

## 🐳 Docker Quick Start

This guide will help you set up and run the First Round AI platform using Docker.

## 📋 Prerequisites

- Docker Desktop (Docker Engine + Docker Compose)
- At least 4GB RAM
- 2GB free disk space

## 🚀 Quick Setup (5 Minutes)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd Candidate-Experience
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The setup script will:
- ✅ Check for Docker installation
- ✅ Create necessary environment files
- ✅ Ask if you want to start services immediately

### 2. Configure API Keys (Optional)

Edit the `.env` file to add your AI provider keys:

```bash
nano .env
```

Add your API keys:
```bash
OPENAI_API_KEY=your-openai-api-key
GOOGLE_API_KEY=your-google-api-key
```

*Note: The app will work without API keys but will use mock responses.*

### 3. Start Services

```bash
docker compose up -d
```

### 4. Access the Application

- 🌐 **Frontend**: http://localhost:3000
- 🔧 **Backend API**: http://localhost:8000
- 📚 **API Docs**: http://localhost:8000/docs
- ❤️ **Health Check**: http://localhost:8000/healthz

## 🐋 Docker Services

### Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Nginx +      │◄──►│   (FastAPI)     │◄──►│   (MongoDB)     │
│    React)       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │    Cache        │
                       │   (Redis)       │
                       └─────────────────┘
```

### Services Overview

| Service | Image | Port | Purpose |
|---------|--------|------|---------|
| `mongodb` | mongo:7.0 | 27017 | Primary database |
| `redis` | redis:7.2-alpine | 6379 | Caching & sessions |
| `backend` | Custom Python | 8000 | FastAPI application |
| `frontend` | Custom Nginx | 3000 | React application |

## 🔧 Configuration Files

### Environment Variables

**Root `.env`:**
```bash
# Database connection
MONGODB_URI=mongodb://admin:password@localhost:27017/cx?authSource=admin

# API keys (add yours)
OPENAI_API_KEY=
GOOGLE_API_KEY=

# Feature flags
ENABLE_LIVE_INTERVIEW=true
ENABLE_CAREER_TOOLS=true
```

**Backend `backend/.env.local`:**
```bash
# Backend specific config
mongodb_uri=mongodb://admin:password@mongodb:27017/cx?authSource=admin
ai_provider=openai
enable_mfa=false
```

### Docker Compose Configuration

The `docker-compose.yml` includes:
- ✅ All services with proper networking
- ✅ Volume persistence for data
- ✅ Health checks
- ✅ Environment variables
- ✅ Proper dependencies

## 🛠️ Docker Commands

### Basic Commands

```bash
# Start all services
docker compose up -d

# Start with rebuild
docker compose up -d --build

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Development Commands

```bash
# Rebuild backend only
docker compose up -d --build backend

# Access backend container
docker compose exec backend bash

# Access frontend container
docker compose exec frontend sh

# View running containers
docker compose ps

# View resource usage
docker stats
```

### Database Management

```bash
# Access MongoDB shell
docker compose exec mongodb mongosh --username admin --password password

# Access Redis CLI
docker compose exec redis redis-cli

# Backup database
docker compose exec mongodb mongodump --username admin --password password --out /backup

# Restore database
docker compose exec mongodb mongorestore --username admin --password password /backup
```

## 🔍 Troubleshooting

### Common Issues

**1. Port Conflicts**
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :8000
lsof -i :27017
lsof -i :6379

# Stop conflicting services
docker compose down
```

**2. Permission Issues**
```bash
# Fix Docker permissions
sudo chown -R $USER:$USER .

# Reset Docker permissions
sudo docker system prune -a
```

**3. Build Issues**
```bash
# Clean rebuild
docker compose down
docker compose build --no-cache
docker compose up -d
```

**4. Database Connection Issues**
```bash
# Check MongoDB status
docker compose logs mongodb

# Restart database
docker compose restart mongodb

# Check backend logs for connection errors
docker compose logs backend
```

### Health Checks

**Check Service Status:**
```bash
docker compose ps
```

**Check Health Endpoints:**
```bash
# Backend health
curl http://localhost:8000/healthz

# Frontend health
curl http://localhost:3000

# API documentation
curl http://localhost:8000/docs
```

**Check Container Logs:**
```bash
# All services
docker compose logs

# Specific service
docker compose logs backend
```

## 📊 Resource Usage

### Expected Resource Usage

- **RAM**: 2-4GB total
  - Frontend: ~200MB
  - Backend: ~500MB
  - MongoDB: ~500MB
  - Redis: ~100MB

- **Disk**: 2-5GB initial
  - Database data: Variable
  - Logs: ~100MB
  - Images: ~1GB

### Monitoring Resources

```bash
# View resource usage
docker stats

# View disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## 🔄 Development Workflow

### Making Changes

**Backend Changes:**
```bash
# Edit backend files
# Rebuild and restart
docker compose up -d --build backend
```

**Frontend Changes:**
```bash
# Edit frontend files
# Rebuild and restart
docker compose up -d --build frontend
```

**Hot Reload:**
- Backend: FastAPI auto-reloads with `--reload` flag
- Frontend: Rebuild required for changes

### Adding New Dependencies

**Backend:**
1. Add to `backend/requirements.txt`
2. Rebuild: `docker compose up -d --build backend`

**Frontend:**
1. Add to `package.json`
2. Rebuild: `docker compose up -d --build frontend`

## 🚀 Production Considerations

### Security
- ✅ Change default passwords in docker-compose.yml
- ✅ Use environment-specific secrets
- ✅ Enable HTTPS in production
- ✅ Configure proper CORS origins

### Performance
- ✅ Use nginx for static file serving
- ✅ Enable gzip compression
- ✅ Configure proper caching
- ✅ Use load balancer for scaling

### Backup & Recovery
- ✅ Volume persistence for data
- ✅ Regular database backups
- ✅ Log rotation
- ✅ Health monitoring

## 📚 Additional Resources

### Docker Documentation
- [Docker Get Started](https://docs.docker.com/get-started/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Dfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)

### Application Documentation
- [API Documentation](http://localhost:8000/docs)
- [Feature Overview](README.md)
- [Development Guide](README_DEVELOPMENT.md)

---

**🎉 Happy Dockering!**

If you run into any issues, check the troubleshooting section above or create an issue in the repository.