# 🎥 Video Calling System - Comprehensive Troubleshooting Guide

## 📋 Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Logging Infrastructure](#logging-infrastructure)
3. [Troubleshooting Steps](#troubleshooting-steps)
4. [Common Issues and Solutions](#common-issues-and-solutions)
5. [Monitoring and Debugging Tools](#monitoring-and-debugging-tools)
6. [Network Diagnostics](#network-diagnostics)

---

## 🏗️ System Architecture Overview

### Components
1. **Vercel (Next.js App)** - Hosts the web application and signaling API
2. **Digital Ocean Droplet** - Runs TURN server (coturn) for NAT traversal
3. **Client Browser** - End user connecting via `/video-call/[id]` page
4. **Advisor Browser** - Advisor connecting via VideoCallModal component

### Communication Flow
```
Client Browser ←→ Vercel API (/api/websocket) ←→ Advisor Browser
       ↓                                              ↓
   WebRTC Media                                  WebRTC Media
       ↓                                              ↓
   TURN Server (Digital Ocean) ←→ TURN Server ←→ TURN Server
```

### Signaling Methods
- **Advisor**: Uses HTTP polling via `HTTPSignaling` class (polls `/api/websocket` every 300ms)
- **Client**: Uses Socket.IO WebSocket connection (connects to WebSocket server)

---

## 📊 Logging Infrastructure

### Vercel Logs

All logs are automatically sent to Vercel's logging system. Access them via:

1. **Vercel Dashboard** → Your Project → Logs
2. **Vercel CLI**: `vercel logs [deployment-url]`

#### Log Format
```
[YYYY-MM-DDTHH:mm:ss.sssZ] [Component] [LEVEL] Message | Data: {...}
```

#### Log Sources

**1. WebSocket API (`/api/websocket`)**
- Logs all GET/POST requests
- Tracks call joins, leaves, polls
- Records WebRTC signal storage
- Monitors participant activity

**Key Log Messages:**
- `GET request received` - Every polling request
- `User joined call` - Participant joins
- `WebRTC signal stored` - Offer/answer/ICE candidate stored
- `Poll response` - Response to polling request

**2. TURN Credentials API (`/api/turn/credentials`)**
- Logs credential generation requests
- Tracks configuration status
- Records credential expiry times

**Key Log Messages:**
- `TURN credentials request` - Client requesting credentials
- `TURN credentials generated` - Successful generation
- `TURN server not configured` - Missing environment variables

**3. Client-Side Logging**

**HTTPSignaling (Advisor):**
- `[HTTPSignaling] Connecting to call` - Initial connection
- `[HTTPSignaling] Joined call successfully` - Join confirmation
- `[HTTPSignaling] Sending offer/answer/ICE candidate` - Signal transmission
- `[HTTPSignaling] Polling error` - Poll failures

**SocketIOSignaling (Client):**
- `[SocketIOSignaling] Attempting to connect` - Connection attempt
- `[SocketIOSignaling] Connected successfully` - Connection established
- `[SocketIOSignaling] Received WebRTC signal` - Signal received
- `[SocketIOSignaling] Connection error` - Connection failures

### Digital Ocean TURN Server Logs

#### Accessing Logs

**If using Docker:**
```bash
# SSH into Digital Ocean droplet
ssh root@your-droplet-ip

# View coturn logs
docker logs coturn-container-name

# Follow logs in real-time
docker logs -f coturn-container-name
```

**If running directly:**
```bash
# View system logs
journalctl -u coturn -f

# Or if logging to file
tail -f /var/log/coturn.log
```

#### TURN Server Log Messages

**Connection Logs:**
- `session` - New TURN session established
- `allocate` - Relay allocation request
- `create permission` - Permission created for peer
- `refresh` - Session refresh

**Authentication Logs:**
- `auth success` - Successful authentication
- `auth failure` - Authentication failed (check secret mismatch)

**Traffic Logs:**
- `relay` - Data relayed through TURN server
- `peer` - Peer connection established

#### Enable Verbose Logging

Edit `turn-server/coturn.conf`:
```conf
verbose
log-file=/var/log/coturn.log
```

Restart coturn:
```bash
docker restart coturn-container-name
# OR
systemctl restart coturn
```

---

## 🔍 Troubleshooting Steps

### Step 1: Verify Environment Variables

**Vercel Environment Variables:**
```bash
# Required for TURN credentials
TURN_REALM=mashklanta.com
TURN_STATIC_AUTH_SECRET=your_secret_here
TURN_URL=turn:your-turn-server.com:3478
TURN_TTL_SECONDS=86400

# Optional
TURN_FORCE_RELAY=false
REDIS_URL=your_redis_url (for signaling persistence)
```

**Digital Ocean TURN Server:**
```bash
# In coturn.conf
static-auth-secret=your_secret_here  # Must match Vercel secret
realm=mashklanta.com                  # Must match Vercel realm
external-ip=your_droplet_ip
```

**Verify in Vercel:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Check all required variables are set
3. Ensure secrets match between Vercel and Digital Ocean

### Step 2: Check Vercel Logs

**Access Vercel Logs:**
1. Open Vercel Dashboard
2. Select your project
3. Go to "Logs" tab
4. Filter by:
   - `[WebSocket API]` - Signaling logs
   - `[TURN Credentials API]` - TURN credential logs
   - `[HTTPSignaling]` - Advisor signaling logs
   - `[SocketIOSignaling]` - Client signaling logs

**What to Look For:**
- ✅ `User joined call` - Both advisor and client should appear
- ✅ `WebRTC signal stored` - Offers/answers should be stored
- ✅ `Poll response` - Polling should return signals
- ❌ `Connection error` - Check network/firewall issues
- ❌ `TURN server not configured` - Check environment variables

### Step 3: Check TURN Server Logs

**SSH into Digital Ocean:**
```bash
ssh root@your-droplet-ip
```

**View TURN Server Status:**
```bash
# Check if coturn is running
docker ps | grep coturn
# OR
systemctl status coturn
```

**View Recent Logs:**
```bash
# Last 100 lines
docker logs --tail 100 coturn-container-name

# Follow in real-time
docker logs -f coturn-container-name
```

**What to Look For:**
- ✅ `session` - New sessions being created
- ✅ `allocate` - Relay allocations
- ✅ `relay` - Data being relayed
- ❌ `auth failure` - Secret mismatch
- ❌ No logs - TURN server not receiving traffic

### Step 4: Test TURN Server Connectivity

**From Vercel (Server-side test):**
```bash
# Create test endpoint: /api/turn/test
# This will test connectivity to TURN server
```

**From Browser Console:**
```javascript
// Test TURN credentials endpoint
fetch('/api/turn/credentials')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Test WebSocket API
fetch('/api/websocket?action=join&callId=test&userId=test&userType=client')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**From Digital Ocean Droplet:**
```bash
# Test TURN server locally
turnutils_stunclient your-turn-server.com

# Test TURN allocation
turnutils_peer -u username -w credential your-turn-server.com
```

### Step 5: Check Browser Console

**Open Browser DevTools (F12) → Console**

**Advisor Browser:**
- Look for `[HTTPSignaling]` logs
- Check for connection errors
- Verify polling is working (should see regular poll logs)

**Client Browser:**
- Look for `[SocketIOSignaling]` logs
- Check WebSocket connection status
- Verify signals are being sent/received

**WebRTC Debug Info:**
- Open browser DevTools → Network tab
- Filter by "WebSocket" or "websocket"
- Check connection status codes
- Look for failed requests

### Step 6: Network Diagnostics

**Check Firewall Rules:**

**Digital Ocean:**
```bash
# Check UFW status
ufw status

# Ensure ports are open
ufw allow 3478/udp  # TURN/STUN
ufw allow 3478/tcp  # TURN/STUN
ufw allow 49152:65535/udp  # Relay ports
```

**Vercel:**
- Vercel automatically handles outbound connections
- No firewall configuration needed

**Test Port Connectivity:**
```bash
# From your local machine
nc -zv your-turn-server.com 3478

# From Digital Ocean droplet
netstat -tuln | grep 3478
```

---

## 🐛 Common Issues and Solutions

### Issue 1: "TURN server not configured"

**Symptoms:**
- Error in Vercel logs: `TURN server not configured`
- Clients cannot establish WebRTC connection

**Solution:**
1. Check Vercel environment variables:
   - `TURN_STATIC_AUTH_SECRET` must be set
   - `TURN_URL` must be set
2. Verify secret matches Digital Ocean coturn.conf
3. Redeploy Vercel application after setting variables

### Issue 2: "Authentication failed" in TURN logs

**Symptoms:**
- TURN server logs show `auth failure`
- No relay allocations succeed

**Solution:**
1. Verify `TURN_STATIC_AUTH_SECRET` in Vercel matches `static-auth-secret` in coturn.conf
2. Verify `TURN_REALM` in Vercel matches `realm` in coturn.conf
3. Restart coturn after changing config:
   ```bash
   docker restart coturn-container-name
   ```

### Issue 3: "No ICE candidates" or "ICE connection failed"

**Symptoms:**
- WebRTC connection stuck in "checking" state
- No video/audio despite signaling working

**Solution:**
1. Check TURN server is accessible:
   ```bash
   # From browser console
   fetch('/api/turn/credentials').then(r => r.json()).then(console.log)
   ```
2. Verify TURN server ports are open (3478 UDP/TCP)
3. Check firewall rules on Digital Ocean droplet
4. Verify `external-ip` in coturn.conf matches droplet IP

### Issue 4: "Signaling connection failed"

**Symptoms:**
- Advisor: `[HTTPSignaling] Connection failed`
- Client: `[SocketIOSignaling] Connection error`

**Solution:**
1. **For Advisor (HTTP Polling):**
   - Check `/api/websocket` endpoint is accessible
   - Verify Redis is configured (if using Redis)
   - Check Vercel logs for API errors

2. **For Client (Socket.IO):**
   - Verify `NEXT_PUBLIC_WEBSOCKET_URL` is set correctly
   - Check WebSocket server is running
   - Verify WebSocket server is accessible from client browser

### Issue 5: "Signals not being received"

**Symptoms:**
- Offers/answers sent but not received
- ICE candidates not exchanged

**Solution:**
1. Check Vercel logs for `WebRTC signal stored` messages
2. Verify polling is working (check `Poll response` logs)
3. Check for duplicate message filtering (processedKeys)
4. Verify both participants are in the same callId

### Issue 6: "Video/audio not working"

**Symptoms:**
- Signaling works but no media
- WebRTC connection established but no video

**Solution:**
1. Check browser console for media permission errors
2. Verify `getUserMedia()` is called and succeeds
3. Check WebRTC stats:
   ```javascript
   // In browser console
   const pc = peerConnectionRef.current;
   pc.getStats().then(stats => {
     stats.forEach(report => console.log(report));
   });
   ```
4. Verify TURN relay is being used (check candidate types)

---

## 🔧 Monitoring and Debugging Tools

### 1. Vercel Logs Dashboard

**Access:**
- Vercel Dashboard → Project → Logs

**Filters:**
- `[WebSocket API]` - Signaling API logs
- `[TURN Credentials API]` - TURN credential logs
- `[HTTPSignaling]` - Advisor signaling
- `[SocketIOSignaling]` - Client signaling

### 2. Browser DevTools

**Network Tab:**
- Filter by "websocket" or "api/websocket"
- Check request/response status
- View WebSocket frames

**Console Tab:**
- All client-side logs prefixed with component name
- Filter by `[HTTPSignaling]` or `[SocketIOSignaling]`

**WebRTC Stats:**
```javascript
// Get connection stats
const pc = peerConnectionRef.current;
const stats = await pc.getStats();
stats.forEach(report => {
  if (report.type === 'candidate-pair' && report.state === 'succeeded') {
    console.log('Active connection:', report);
  }
});
```

### 3. TURN Server Monitoring

**Check Active Sessions:**
```bash
# SSH into Digital Ocean
ssh root@your-droplet-ip

# View active TURN sessions
docker exec coturn-container-name turnutils_admin -n
```

**Monitor Traffic:**
```bash
# Watch TURN server logs in real-time
docker logs -f coturn-container-name | grep -E "session|allocate|relay"
```

### 4. Network Testing Tools

**STUN Test:**
```bash
# Test STUN connectivity
turnutils_stunclient stun:stun.l.google.com:19302
```

**TURN Test:**
```bash
# Test TURN allocation (requires credentials)
turnutils_peer -u username -w credential turn:your-turn-server.com:3478
```

**Port Connectivity:**
```bash
# Test if TURN port is accessible
nc -zv your-turn-server.com 3478
```

---

## 📡 Network Diagnostics

### Check TURN Server Accessibility

**From Browser:**
```javascript
// Test TURN credentials endpoint
async function testTURN() {
  try {
    const res = await fetch('/api/turn/credentials');
    const data = await res.json();
    console.log('TURN Credentials:', data);
    
    // Test TURN server connectivity
    const pc = new RTCPeerConnection({
      iceServers: [{
        urls: data.urls,
        username: data.username,
        credential: data.credential
      }]
    });
    
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log('ICE Candidate:', e.candidate);
      }
    };
    
    // Create a data channel to trigger ICE gathering
    pc.createDataChannel('test');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
  } catch (error) {
    console.error('TURN Test Failed:', error);
  }
}

testTURN();
```

### Check Signaling Connectivity

**Advisor (HTTP Polling):**
```javascript
// Test signaling endpoint
async function testSignaling() {
  const callId = 'test-call';
  const userId = 'test-user';
  
  // Test join
  const joinRes = await fetch(
    `/api/websocket?action=join&callId=${callId}&userId=${userId}&userType=advisor`
  );
  console.log('Join Response:', await joinRes.json());
  
  // Test poll
  const pollRes = await fetch(
    `/api/websocket?action=poll&callId=${callId}&userId=${userId}&since=0`
  );
  console.log('Poll Response:', await pollRes.json());
}

testSignaling();
```

**Client (Socket.IO):**
```javascript
// Test Socket.IO connection
import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3002');

socket.on('connect', () => {
  console.log('Socket.IO Connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Socket.IO Error:', error);
});
```

---

## 📝 Logging Checklist

### Before Starting a Call

- [ ] Check Vercel environment variables are set
- [ ] Verify TURN server is running on Digital Ocean
- [ ] Test TURN credentials endpoint: `/api/turn/credentials`
- [ ] Check browser console for errors

### During a Call

- [ ] Monitor Vercel logs for signaling activity
- [ ] Check TURN server logs for relay activity
- [ ] Verify both participants appear in logs
- [ ] Check for ICE candidate exchange in logs

### After a Failed Call

- [ ] Review Vercel logs for errors
- [ ] Check TURN server logs for authentication failures
- [ ] Verify network connectivity
- [ ] Check browser console for WebRTC errors

---

## 🚨 Emergency Debugging

### Quick Health Check Script

Create `/api/debug/health` endpoint:

```typescript
export async function GET() {
  const health = {
    timestamp: new Date().toISOString(),
    turn: {
      configured: !!(process.env.TURN_STATIC_AUTH_SECRET && process.env.TURN_URL),
      realm: process.env.TURN_REALM,
      url: process.env.TURN_URL,
    },
    redis: {
      configured: !!process.env.REDIS_URL,
      connected: false, // Check Redis connection
    },
    websocket: {
      url: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
    }
  };
  
  return Response.json(health);
}
```

**Access:** `https://your-app.vercel.app/api/debug/health`

---

## 📞 Support

If issues persist after following this guide:

1. **Collect Logs:**
   - Vercel logs (last 1000 lines)
   - TURN server logs (last 100 lines)
   - Browser console logs
   - Network tab screenshots

2. **Environment Info:**
   - Browser type and version
   - Operating system
   - Network type (home/office/mobile)

3. **Reproduction Steps:**
   - Exact steps to reproduce
   - Call IDs that failed
   - Timestamps of failures

---

## 🔄 Next Steps

1. **Set up log aggregation** (e.g., Datadog, LogRocket)
2. **Add metrics dashboard** for call quality
3. **Implement automated alerts** for connection failures
4. **Create health check endpoints** for monitoring

---

*Last Updated: [Current Date]*

