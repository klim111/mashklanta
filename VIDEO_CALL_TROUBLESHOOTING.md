# Video Call System Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Issue 1: Video streams not showing between advisor and client

**Symptoms:**
- Chat messages work fine
- Both sides can see their own camera
- Remote video shows black screen or "waiting" state
- Console shows WebRTC connection established

**Root Causes & Solutions:**

#### A. Environment Variables Not Set
Check your Vercel environment variables:
```bash
NEXT_PUBLIC_TURN_URL=turn:YOUR_SERVER_IP:3478
NEXT_PUBLIC_TURN_USERNAME=your_turn_username  
NEXT_PUBLIC_TURN_CREDENTIAL=your_turn_password
```

**How to verify:**
1. Open browser console on video call page
2. Look for: `✅ Custom TURN server configured` or `⚠️ Custom TURN server not fully configured`
3. If you see the warning, your environment variables are missing

#### B. TURN Server Not Running
**How to check:**
```bash
ssh root@YOUR_SERVER_IP
cd mashklanta/turn-server
docker-compose ps
```

**If not running:**
```bash
docker-compose up -d
```

#### C. Firewall Blocking TURN Ports
**Required ports:**
- 3478 (TURN UDP/TCP)
- 5349 (TURNS TCP)
- 49152-65535 (TURN relay ports)

**Check firewall:**
```bash
sudo ufw status
# Should show ports 3478 and 5349 as ALLOW
```

### Issue 2: WebRTC Connection Fails

**Symptoms:**
- Console shows ICE connection state: "failed" or "disconnected"
- Video call never establishes

**Solutions:**

#### A. Test TURN Server Connectivity
```bash
# From your local machine
telnet YOUR_SERVER_IP 3478
# Should connect successfully
```

#### B. Check TURN Server Logs
```bash
ssh root@YOUR_SERVER_IP
cd mashklanta/turn-server  
docker-compose logs -f coturn
```

Look for authentication errors or connection issues.

#### C. Verify Network Connectivity
```bash
# Test from different networks
# - Home WiFi
# - Mobile data
# - Corporate network
```

### Issue 3: One-Way Video (Only One Side Sees Video)

**Symptoms:**
- Advisor sees client video, but client doesn't see advisor (or vice versa)
- WebRTC connection shows as "connected"

**Solutions:**

#### A. Check Media Permissions
1. Ensure both sides granted camera/microphone permissions
2. Check browser settings for the domain
3. Try refreshing and re-granting permissions

#### B. Check Video Element Configuration
Look in console for errors related to video playback:
- `NotAllowedError`: User interaction required
- `NotSupportedError`: Codec issues
- `AbortError`: Hardware issues

### Issue 4: Connection Works Locally But Fails in Production

**Symptoms:**
- Video calls work on localhost
- Fail when deployed to Vercel

**Solutions:**

#### A. HTTPS Required for WebRTC
- Ensure your domain has valid SSL certificate
- WebRTC requires HTTPS in production (except localhost)

#### B. Check Vercel Environment Variables
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify all `NEXT_PUBLIC_*` variables are set
3. Redeploy after adding variables

## 🔧 Debug Tools

### Browser Console Commands

```javascript
// Check WebRTC configuration
console.log('TURN URL:', process.env.NEXT_PUBLIC_TURN_URL);
console.log('TURN User:', process.env.NEXT_PUBLIC_TURN_USERNAME);

// Check peer connection state
if (window.peerConnection) {
  console.log('Connection State:', window.peerConnection.connectionState);
  console.log('ICE State:', window.peerConnection.iceConnectionState);
  console.log('Signaling State:', window.peerConnection.signalingState);
}

// Check media streams
if (navigator.mediaDevices) {
  navigator.mediaDevices.enumerateDevices().then(devices => {
    console.log('Available devices:', devices);
  });
}
```

### Enable Debug Console
1. Click the WiFi icon in the video call interface
2. Monitor real-time connection statistics
3. Use "Restart Connection" button if needed

## 🚀 Quick Fixes

### 1. Restart Everything
```bash
# On TURN server
docker-compose restart

# In browser
# Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### 2. Test TURN Server
```bash
# Install TURN testing tools
sudo apt-get install coturn-utils

# Test STUN
turnutils_stunclient YOUR_SERVER_IP

# Test TURN  
turnutils_uclient -t -u USERNAME -w PASSWORD YOUR_SERVER_IP
```

### 3. Check Network Path
```bash
# Trace route to TURN server
traceroute YOUR_SERVER_IP

# Check if ports are reachable
nmap -p 3478,5349 YOUR_SERVER_IP
```

## 📞 Still Having Issues?

### Collect Debug Information

1. **Browser Console Logs**
   - Open Developer Tools → Console
   - Copy all WebRTC-related messages
   - Include both advisor and client logs

2. **TURN Server Logs**
   ```bash
   docker-compose logs coturn > turn-logs.txt
   ```

3. **Network Information**
   - Test from different networks
   - Note which combinations work/fail
   - Include ISP information if relevant

4. **Environment Check**
   - Verify all environment variables are set
   - Test TURN server connectivity from multiple locations

### Common Working Configurations

**Environment Variables (Vercel):**
```
NEXT_PUBLIC_TURN_URL=turn:1.2.3.4:3478
NEXT_PUBLIC_TURN_USERNAME=mashklanta
NEXT_PUBLIC_TURN_CREDENTIAL=your_secure_password
```

**Firewall Rules (DigitalOcean):**
```bash
sudo ufw allow 3478
sudo ufw allow 5349  
sudo ufw allow 49152:65535/udp
```

**Docker Compose Status:**
```bash
$ docker-compose ps
    Name               Command          State                    Ports                  
coturn_1   /bin/sh -c dockerize ...   Up      0.0.0.0:3478->3478/tcp,:::3478->3478/tcp,
                                              0.0.0.0:3478->3478/udp,:::3478->3478/udp,
                                              0.0.0.0:5349->5349/tcp,:::5349->5349/tcp
```

## ✅ Success Indicators

When everything is working correctly, you should see:

1. **Console Messages:**
   ```
   ✅ Custom TURN server configured
   ✅ Client remote video playing successfully  
   ✅ Advisor remote video playing successfully
   Client ICE connection state: connected
   Advisor ICE connection state: connected
   ```

2. **Video Call Interface:**
   - Both local and remote videos showing
   - Green connection indicator
   - Chat messages flowing both ways
   - Audio/video controls responsive

3. **Debug Console (WiFi icon):**
   - Connection State: "connected"
   - ICE State: "connected"  
   - Bitrate > 0
   - Packet loss < 1%

Remember: WebRTC can be finicky with network conditions. Most issues are related to TURN server configuration or firewall rules.
