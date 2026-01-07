# 🚀 DevConnect Production Deployment Guide

## 📋 Pre-Deployment Checklist

### Environment Variables (Required)
Make sure these are set in your production environment:

```bash
# Database
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/devconnect
DATABASE_NAME=devconnect

# Authentication (CRITICAL - Generate new secret!)
NEXTAUTH_SECRET=<your-32-char-secret-here>
NEXTAUTH_URL=https://your-domain.com

# OAuth (Get from respective providers)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Socket.IO
NEXT_PUBLIC_SOCKET_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com
```

### Generate Secure Secret
```bash
# Linux/Mac
openssl rand -base64 32

# PowerShell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

---

## 🐳 Docker Deployment (Recommended)

### Quick Start
```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Edit with your production values
nano .env.local

# 3. Build and run
docker-compose up -d --build

# 4. Check status
docker-compose ps
docker-compose logs -f app
```

### With External MongoDB
```bash
# Set DATABASE_URL to your MongoDB Atlas/external MongoDB
docker-compose up -d app
```

### Full Stack with Nginx
```bash
docker-compose --profile production up -d
```

---

## 🖥️ Manual Deployment

### Requirements
- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB (local or Atlas)

### Steps
```bash
# 1. Install dependencies
npm ci --production=false

# 2. Build the application
npm run build

# 3. Start production server
npm start
```

---

## ☁️ Cloud Platform Deployment

### Vercel (Recommended for Next.js)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Note: Custom server features (Socket.IO) won't work on Vercel
# Use separate Socket.IO server or Railway/Render for full features
```

### Railway
```bash
# Connect your GitHub repo to Railway
# Set environment variables in Railway dashboard
# Railway will auto-detect and deploy
```

### Render
```yaml
# render.yaml
services:
  - type: web
    name: devconnect
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

---

## 🔐 Security Checklist

- [ ] Generate new `NEXTAUTH_SECRET` (32+ characters)
- [ ] Enable HTTPS (SSL/TLS certificate)
- [ ] Set `ALLOWED_ORIGINS` to your domain only
- [ ] Configure MongoDB authentication
- [ ] Enable rate limiting (configured in nginx)
- [ ] Set up monitoring and alerting
- [ ] Regular security updates

---

## 📊 Monitoring

### Health Check
```bash
# Check server health
curl https://your-domain.com/api/health
```

### Expected Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "uptime": 12345,
  "services": {
    "database": { "status": "connected", "latency": 5 },
    "server": { "status": "running", "memory": { "used": 150, "total": 512 } }
  }
}
```

### Docker Logs
```bash
docker-compose logs -f app
docker-compose logs -f mongodb
```

---

## 🔄 Updates & Maintenance

### Zero-Downtime Deployment
```bash
# Build new image
docker-compose build app

# Rolling update
docker-compose up -d --no-deps app
```

### Database Backup (MongoDB)
```bash
# Backup
docker exec devconnect-mongodb mongodump --out /backup

# Restore
docker exec devconnect-mongodb mongorestore /backup
```

---

## 🆘 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check MongoDB is running
docker-compose ps mongodb

# Check connection string
echo $DATABASE_URL
```

**Socket.IO Not Connecting**
```bash
# Verify CORS settings
# Check ALLOWED_ORIGINS includes your domain
# Ensure WebSocket upgrade is allowed in reverse proxy
```

**Build Failures**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm ci
npm run build
```

---

## 📞 Support

For issues and questions:
- GitHub Issues: [Create Issue](https://github.com/your-repo/issues)
- Documentation: [Docs](https://your-docs-url.com)


