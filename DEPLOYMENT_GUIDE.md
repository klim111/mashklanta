# 🚀 Video Call System - Deployment Guide

## Environment Variables Required

### Development (.env.local)
```bash
# WebSocket Server
NEXT_PUBLIC_WEBSOCKET_URL="http://localhost:3001"
WEBSOCKET_PORT=3001

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

### Production Environment Variables
```bash
# WebSocket Server
NEXT_PUBLIC_WEBSOCKET_URL="wss://yourdomain.com"
WEBSOCKET_PORT=3001

# Frontend URLs for CORS
FRONTEND_URL="https://yourdomain.com"
FRONTEND_URL_WWW="https://www.yourdomain.com"

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-production-secret-key"
```

## Deployment Steps

### 1. **WebSocket Server Deployment**

The WebSocket server (`websocket-server.js`) needs to run on a separate port (3001) in production.

#### Option A: Same Server (Recommended for small deployments)
```bash
# Install dependencies
npm install express socket.io cors

# Start WebSocket server
node websocket-server.js
```

#### Option B: Separate Server (Recommended for production)
```bash
# On your WebSocket server
npm install express socket.io cors
node websocket-server.js
```

#### Option C: PM2 Process Manager
```bash
# Install PM2
npm install -g pm2

# Start WebSocket server with PM2
pm2 start websocket-server.js --name websocket-server
pm2 save
pm2 startup
```

### 2. **Frontend Deployment**

The Next.js application will automatically use the environment variables:

```bash
# Build the application
npm run build

# Start the application
npm start
```

### 3. **Production Configuration**

#### Nginx Configuration (if using Nginx)
```nginx
# WebSocket proxy for video calls
location /socket.io/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

#### Docker Configuration
```dockerfile
# Dockerfile for WebSocket server
FROM node:18-alpine
WORKDIR /app
COPY websocket-package.json package.json
RUN npm install
COPY websocket-server.js .
EXPOSE 3001
CMD ["node", "websocket-server.js"]
```

### 4. **Environment-Specific URLs**

The code automatically handles different environments:

#### Development
- WebSocket: `http://localhost:3001`
- Frontend: `http://localhost:3000`

#### Production
- WebSocket: `wss://yourdomain.com` (or separate server)
- Frontend: `https://yourdomain.com`

### 5. **Security Considerations**

1. **CORS Configuration**: The WebSocket server is configured to only accept connections from your domain
2. **Environment Variables**: All URLs are configurable via environment variables
3. **HTTPS**: Use HTTPS in production for secure WebSocket connections (WSS)

### 6. **Testing Deployment**

1. **Check WebSocket Server**: `curl https://yourdomain.com:3001/health`
2. **Test Connection**: Open browser console and check for WebSocket connection
3. **Test Video Call**: Try the video call feature between advisor and client

## Code Changes Made for Production

### ✅ **Fixed Hardcoded URLs**
- Replaced `localhost:3001` with environment variables
- Added `NEXT_PUBLIC_WEBSOCKET_URL` support
- Made CORS configuration environment-aware

### ✅ **Environment-Aware Configuration**
- Development: Uses localhost URLs
- Production: Uses environment variables or domain-based URLs
- Automatic fallbacks for missing environment variables

### ✅ **Production-Ready Features**
- WebSocket server can run on separate server
- CORS properly configured for production domains
- Environment variables for all URLs
- PM2 support for process management

## Troubleshooting

### WebSocket Connection Issues
1. Check if WebSocket server is running: `netstat -an | grep 3001`
2. Verify environment variables are set correctly
3. Check CORS configuration matches your domain
4. Ensure firewall allows port 3001

### Video Call Issues
1. Check browser console for WebSocket connection errors
2. Verify STUN servers are accessible
3. Check if HTTPS is required for WebRTC in production
4. Test with different browsers

## Monitoring

### Health Check Endpoints
- WebSocket Server: `GET /health`
- Call Info: `GET /call/:callId`

### Logs
The WebSocket server logs all connections, messages, and errors to console.

## Scaling Considerations

For high-traffic deployments:
1. Use Redis for session storage
2. Implement load balancing for WebSocket server
3. Consider using Socket.IO Redis adapter
4. Monitor connection limits and performance
