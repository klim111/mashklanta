# 🚀 Production Deployment Guide - Video Calling System

## 📋 Overview

This guide covers deploying the video calling system to production:
- **Vercel**: Next.js application
- **DigitalOcean**: TURN server (Coturn)
- **Upstash Redis**: Signaling persistence (optional but recommended)

---

## ✅ Pre-Deployment Checklist

### 1. Environment Variables Setup

#### Vercel Environment Variables

Add these environment variables in Vercel dashboard → Settings → Environment Variables:

**Required:**
```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_SECRET=<generate-32-char-secret>
NEXTAUTH_URL=https://your-domain.vercel.app

# TURN Server Configuration
TURN_REALM=mashklanta.com
TURN_STATIC_AUTH_SECRET=<shared-secret-with-turn-server>
TURN_URL=turn:your-turn-server-ip:3478
TURN_TTL_SECONDS=86400

# Redis (Recommended)
REDIS_URL=redis://default:password@upstash-redis-url:port
```

**Optional:**
```bash
TURN_FORCE_RELAY=false
```

#### Generate Secrets

```bash
# NEXTAUTH_SECRET (32+ characters)
openssl rand -base64 32

# TURN_STATIC_AUTH_SECRET (shared with TURN server)
openssl rand -hex 32
```

### 2. TURN Server Setup (DigitalOcean)

#### Deploy TURN Server

1. SSH into your DigitalOcean droplet
2. Navigate to turn-server directory
3. Run deployment script:

```bash
cd turn-server
chmod +x deploy.sh
./deploy.sh
```

4. Update `coturn.conf` with:
   - `static-auth-secret=<same-as-TURN_STATIC_AUTH_SECRET>`
   - `realm=mashklanta.com`
   - `external-ip=<your-droplet-ip>`

5. Start TURN server:
```bash
docker-compose up -d
```

6. Verify TURN server is running:
```bash
docker-compose ps
./turn-status.sh
```

### 3. Redis Setup (Upstash - Recommended)

1. Create Upstash Redis instance: https://upstash.com/
2. Get connection URL
3. Add to Vercel environment variables as `REDIS_URL`

**Without Redis:** System will fallback to in-memory store (not production-ready for scaling)

---

## 🔧 Deployment Steps

### Step 1: Deploy to Vercel

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Deploy
vercel --prod
```

Or push to GitHub and enable auto-deploy in Vercel dashboard.

### Step 2: Verify Environment Variables

After deployment, verify all environment variables are set:
- Go to Vercel dashboard → Settings → Environment Variables
- Check that all required variables are present

### Step 3: Test TURN Server Connectivity

```bash
# From your local machine or server
curl https://your-domain.vercel.app/api/turn/health
```

Expected response:
```json
{
  "status": "ok",
  "config": {
    "realm": true,
    "secret": true,
    "urls": true,
    "allConfigured": true
  },
  "credentialTest": {
    "username": "...",
    "credential": "...",
    "valid": true
  }
}
```

### Step 4: Test Video Call Flow

1. Open advisor dashboard: `https://your-domain.vercel.app/advisor-dashboard`
2. Create a call link for a client
3. Open client link: `https://your-domain.vercel.app/video-call/[callId]`
4. Verify WebRTC connection establishes
5. Check browser console for TURN relay candidates

---

## 🔍 Verification Checklist

### ✅ Application Health

- [ ] App loads at production URL
- [ ] Environment variables validated: `/api/turn/health`
- [ ] Database connection working
- [ ] Authentication working

### ✅ TURN Server Health

- [ ] TURN server running on DigitalOcean
- [ ] Ports 3478/5349 open (UDP/TCP)
- [ ] TURN credentials generation working
- [ ] Health check endpoint returns success

### ✅ Video Calling

- [ ] Signaling connects (check browser console)
- [ ] WebRTC peer connection establishes
- [ ] TURN relay candidates appear in logs
- [ ] Video/audio streams work
- [ ] Chat messages work
- [ ] Screen sharing works (if implemented)

### ✅ Production Readiness

- [ ] Redis configured (no in-memory fallback warnings)
- [ ] Error recovery working (exponential backoff)
- [ ] No race conditions (check logs)
- [ ] Connection monitoring working

---

## 🐛 Troubleshooting

### Issue: "TURN server not configured"

**Solution:**
1. Check `TURN_STATIC_AUTH_SECRET` is set in Vercel
2. Check `TURN_URL` format: `turn:ip:3478`
3. Verify TURN server is running on DigitalOcean
4. Check firewall allows port 3478 (UDP/TCP)

### Issue: "Redis connection error"

**Solution:**
1. Verify `REDIS_URL` is correct format: `redis://...`
2. Check Upstash Redis instance is active
3. Verify network access from Vercel
4. System will fallback to in-memory (check logs)

### Issue: "Video connection fails"

**Solution:**
1. Check browser console for ICE candidate errors
2. Verify TURN server is reachable
3. Check TURN credentials are valid (24h expiry)
4. Test TURN server directly: `turnutils_stunclient <ip>`

### Issue: "Signaling messages not received"

**Solution:**
1. Check Redis is connected (no fallback warnings)
2. Verify polling is working (check network tab)
3. Check `/api/websocket` endpoints return 200
4. Verify `callId` is consistent between client/advisor

---

## 📊 Monitoring

### Key Metrics to Monitor

1. **TURN Server:**
   - Connection count
   - Bandwidth usage
   - Error rate

2. **Redis:**
   - Connection pool
   - Memory usage
   - Commands per second

3. **Vercel:**
   - Function execution time
   - Error rate
   - Request count

### Logs to Watch

```bash
# Vercel logs
vercel logs

# TURN server logs (on DigitalOcean)
docker-compose logs -f coturn

# Application logs (check browser console)
- "Redis connected" ✅
- "TURN server configured" ✅
- "WebRTC connection established" ✅
```

---

## 🔐 Security Checklist

- [ ] `NEXTAUTH_SECRET` is 32+ characters
- [ ] `TURN_STATIC_AUTH_SECRET` is strong random value
- [ ] Secrets not exposed in client-side code
- [ ] TURN server firewall configured
- [ ] HTTPS enabled for production
- [ ] CORS configured properly
- [ ] Redis connection uses TLS if available

---

## 📝 Post-Deployment

### 1. Set Up Monitoring

- Enable Vercel Analytics
- Set up error tracking (Sentry recommended)
- Monitor TURN server metrics

### 2. Configure Auto-scaling

- Vercel: Auto-scales by default
- Upstash Redis: Configure if needed
- TURN server: Monitor capacity

### 3. Set Up Alerts

- Vercel: Function errors
- TURN server: Uptime monitoring
- Redis: Connection failures

---

## 🎯 Quick Reference

### Environment Variables Summary

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | Database connection |
| `NEXTAUTH_SECRET` | ✅ | Auth secret (32+ chars) |
| `NEXTAUTH_URL` | ✅ | App URL |
| `TURN_REALM` | ✅ | TURN realm |
| `TURN_STATIC_AUTH_SECRET` | ✅ | TURN auth secret |
| `TURN_URL` | ✅ | TURN server URL |
| `REDIS_URL` | ⚠️ | Redis connection (recommended) |

### API Endpoints

- Health: `GET /api/health`
- TURN Health: `GET /api/turn/health`
- TURN Credentials: `GET /api/turn/credentials`
- Signaling: `GET/POST /api/websocket`

### Testing Commands

```bash
# Health check
curl https://your-domain.vercel.app/api/health

# TURN health check
curl https://your-domain.vercel.app/api/turn/health

# Test TURN server (from server)
turnutils_stunclient <turn-server-ip>
```

---

## ✅ Success Criteria

Your deployment is successful when:

1. ✅ All environment variables validated
2. ✅ TURN server responding
3. ✅ Redis connected (or fallback working)
4. ✅ Video calls establish WebRTC connection
5. ✅ TURN relay candidates appear
6. ✅ No race condition errors in logs
7. ✅ Error recovery working (exponential backoff)

---

## 📞 Support

If you encounter issues:

1. Check logs in Vercel dashboard
2. Verify TURN server logs on DigitalOcean
3. Test endpoints individually
4. Review browser console for errors
5. Check `PRODUCTION_DEPLOYMENT_GUIDE.md` for common issues

