# Highseat - Docker Deployment Guide

This guide covers how to deploy Highseat using Docker and Docker Compose.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

1. **Clone the repository and navigate to the project directory**

```bash
cd homelab-dash
```

2. **Create environment file**

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and set at least the `JWT_SECRET`:

```bash
# Generate a secure JWT secret
openssl rand -base64 32

# Add it to your .env file
nano .env
```

3. **Build and start the application**

```bash
docker-compose up -d
```

4. **Access the application**

Open your browser and navigate to:
- http://localhost:3350

The application will be ready once the health check passes.

## Configuration

### Required Environment Variables

- `JWT_SECRET` - **REQUIRED** - A secure random string for JWT token signing (minimum 32 characters)

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3350` | Port to expose the application on |
| `NODE_ENV` | `production` | Node environment |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3350` | Comma-separated list of allowed CORS origins |
| `UPLOAD_MAX_SIZE` | `10485760` | Maximum upload size in bytes (10MB default) |
| `MONITOR_DOCKER_HOST` | `false` | Monitor Docker host system instead of container |

### Example .env file

```env
JWT_SECRET=your-secure-random-jwt-secret-generated-with-openssl
PORT=3350
CORS_ALLOWED_ORIGINS=http://192.168.1.100:3350,http://highseat.local:3350
UPLOAD_MAX_SIZE=10485760
MONITOR_DOCKER_HOST=false
```

## Docker Compose Commands

### Start the application

```bash
# Start in detached mode
docker-compose up -d

# Start with logs visible
docker-compose up
```

### Stop the application

```bash
docker-compose down
```

### View logs

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View last 100 lines
docker-compose logs --tail=100
```

### Rebuild after code changes

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Restart the application

```bash
docker-compose restart
```

## Data Persistence

Highseat uses Docker volumes to persist data:

- **highseat-db** - SQLite database (user accounts, boards, cards, etc.)
- **highseat-uploads** - Uploaded files (avatars, custom icons, etc.)

### Backup Data

```bash
# Backup database
docker run --rm -v highseat-db:/data -v $(pwd):/backup alpine tar czf /backup/highseat-db-backup.tar.gz -C /data .

# Backup uploads
docker run --rm -v highseat-uploads:/data -v $(pwd):/backup alpine tar czf /backup/highseat-uploads-backup.tar.gz -C /data .
```

### Restore Data

```bash
# Restore database
docker run --rm -v highseat-db:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/highseat-db-backup.tar.gz"

# Restore uploads
docker run --rm -v highseat-uploads:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/highseat-uploads-backup.tar.gz"
```

### Delete Volumes (Reset Data)

```bash
# Stop the application first
docker-compose down

# Remove volumes
docker volume rm highseat-db highseat-uploads

# Start fresh
docker-compose up -d
```

## System Monitoring

By default, the container monitors its own resource usage. To monitor the Docker **host** system:

1. **Update docker-compose.yml** to mount host system directories:

```yaml
volumes:
  - highseat-db:/app/db
  - highseat-uploads:/app/uploads
  - /proc:/host/proc:ro
  - /sys:/host/sys:ro
```

2. **Set environment variable in .env**:

```env
MONITOR_DOCKER_HOST=true
```

3. **Restart the container**:

```bash
docker-compose restart
```

## Networking

### Custom Port

To run on a different port, update the `PORT` variable in `.env`:

```env
PORT=8080
```

Then update the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "8080:3350"
```

### Reverse Proxy (Nginx, Traefik, etc.)

If using a reverse proxy, update `CORS_ALLOWED_ORIGINS` to include your domain:

```env
CORS_ALLOWED_ORIGINS=https://highseat.example.com,http://192.168.1.100:3350
```

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name highseat.example.com;

    location / {
        proxy_pass http://localhost:3350;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3350/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

## Health Checks

The container includes a health check that runs every 30 seconds:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' highseat

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' highseat
```

Health check endpoint: `http://localhost:3350/health`

## Troubleshooting

### Container won't start

1. Check logs:
```bash
docker-compose logs
```

2. Verify JWT_SECRET is set:
```bash
docker-compose config | grep JWT_SECRET
```

3. Check if port is already in use:
```bash
lsof -i :3350
```

### Database is empty after update

Data persists in Docker volumes. Check if volumes still exist:

```bash
docker volume ls | grep highseat
```

### Can't access from other devices

1. Update `CORS_ALLOWED_ORIGINS` in `.env` to include your server's IP
2. Ensure firewall allows connections on the port
3. Restart the container:
```bash
docker-compose restart
```

### WebSocket connection fails

1. Verify WebSocket endpoint is accessible:
```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:3350/ws
```

2. If using a reverse proxy, ensure WebSocket upgrade headers are passed through (see Nginx example above)

## Building from Source

If you want to modify the code:

1. Make your changes
2. Rebuild the image:
```bash
docker-compose build --no-cache
```
3. Start the updated container:
```bash
docker-compose up -d
```

## Architecture

The Docker deployment uses a multi-stage build:

1. **Frontend Build Stage** - Builds the Angular application with all assets
2. **Backend Dependencies Stage** - Installs backend dependencies with Bun
3. **Production Stage** - Combines frontend build with backend runtime

This results in a single container that serves both the frontend and backend.

## Security Considerations

- Always use a strong, randomly-generated `JWT_SECRET`
- Keep Docker and Docker Compose updated
- Use HTTPS in production (via reverse proxy)
- Regularly backup database and uploads
- Review and limit `CORS_ALLOWED_ORIGINS` to trusted domains
- Consider using Docker secrets for sensitive environment variables in production

## Support

For issues and questions:
- Check the logs: `docker-compose logs -f`
- Health check: `curl http://localhost:3350/health`
- GitHub Issues: https://github.com/yourusername/highseat/issues
