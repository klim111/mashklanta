# 🚀 Vercel + TURN Server Setup Guide

## Goal: Get Video Calling Working on Vercel

This guide focuses on getting video calls working between Vercel (Next.js app) and your TURN server (DigitalOcean).

---

## ✅ Step 1: TURN Server Setup (DigitalOcean)

### 1.1 Deploy TURN Server

SSH into your DigitalOcean droplet:

```bash
cd turn-server
chmod +x deploy.sh
./deploy.sh
```

### 1.2 Configure TURN Server

Edit `turn-server/coturn.conf`:

```conf
# Authentication
use-auth-secret
static-auth-secret=YOUR_SHARED_SECRET_HERE  # ⚠️ IMPORTANT: Save this!
realm=mashklanta.com

# External IP
external-ip=YOUR_DROPLET_IP_ADDRESS  # Replace with your actual IP

# Ports
listening-port=3478
```

### 1.3 Restart TURN Server

```bash
cd turn-server
docker-compose restart coturn
docker-compose logs coturn
```

### 1.4 Verify TURN Server is Running

```bash
# Check if ports are listening
sudo netstat -tuln | grep 3478

# Test STUN connectivity
turnutils_stunclient YOUR_DROPLET_IP
```

---

## ✅ Step 2: Vercel Environment Variables

Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

### Required Variables:

```bash
# TURN Server Configuration (CRITICAL)
TURN_REALM=mashklanta.com
TURN_STATIC_AUTH_SECRET=YOUR_SHARED_SECRET_HERE  # ⚠️ Same as coturn.conf!
TURN_URL=turn:YOUR_DROPLET_IP:3478  # ⚠️ Replace YOUR_DROPLET_IP

# Optional but Recommended
TURN_TTL_SECONDS=86400
```

### Important Notes:

1. **`TURN_STATIC_AUTH_SECRET`** must be **EXACTLY the same** as in `coturn.conf`
2. **`TURN_URL`** format: `turn:IP_ADDRESS:3478` (no `https://`, just `turn:`)
3. **Do NOT** include `https://` or `http://` in `TURN_URL`

### Example:

```bash
TURN_REALM=mashklanta.com
TURN_STATIC_AUTH_SECRET=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
TURN_URL=turn:157.245.123.45:3478
```

---

## ✅ Step 3: Verify Configuration

### 3.1 Test TURN Health Endpoint

After deploying to Vercel, test:

```bash
curl https://your-app.vercel.app/api/turn/health
```

**Expected Response:**
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

**If you see errors:**
- ❌ `"secret": false` → Check `TURN_STATIC_AUTH_SECRET` is set
- ❌ `"urls": false` → Check `TURN_URL` is set correctly
- ❌ `"allConfigured": false` → Missing required variables

### 3.2 Test TURN Credentials Endpoint

```bash
curl https://your-app.vercel.app/api/turn/credentials
```

**Expected Response:**
```json
{
  "realm": "mashklanta.com",
  "urls": "turn:157.245.123.45:3478",
  "username": "1734567890",
  "credential": "base64_encoded_credential",
  "forceRelay": false
}
```

---

## ✅ Step 4: Firewall Configuration (DigitalOcean)

Ensure TURN server ports are open:

```bash
# On DigitalOcean droplet
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
sudo ufw allow 49152:65535/udp  # TURN relay range
sudo ufw status
```

**In DigitalOcean Dashboard:**
1. Go to **Networking** → **Firewalls**
2. Create/Edit firewall rules:
   - **Inbound Rules:**
     - TCP port 3478 (Allow)
     - UDP port 3478 (Allow)
     - UDP ports 49152-65535 (Allow - TURN relay range)

---

## ✅ Step 5: Test Video Call Flow

### 5.1 Test Locally First

1. Start local dev server:
   ```bash
   npm run dev
   ```

2. Set local environment variables in `.env.local`:
   ```bash
   TURN_REALM=mashklanta.com
   TURN_STATIC_AUTH_SECRET=YOUR_SHARED_SECRET
   TURN_URL=turn:YOUR_DROPLET_IP:3478
   ```

3. Test video call locally to verify TURN server works

### 5.2 Test on Vercel

1. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

2. Open advisor dashboard:
   ```
   https://your-app.vercel.app/advisor-dashboard
   ```

3. Create a video call link

4. Open client link in another browser/incognito:
   ```
   https://your-app.vercel.app/video-call/[callId]
   ```

5. **Check Browser Console** for:
   - ✅ "TURN server configured"
   - ✅ "Custom TURN server configured"
   - ✅ "ICE candidate gathered: relay" (indicates TURN is working!)

---

## 🐛 Troubleshooting Common Issues

### Issue 1: "TURN server not configured"

**Symptoms:**
- Browser console shows: `⚠️ Custom TURN server not fully configured`
- `/api/turn/health` returns error

**Fix:**
1. Check environment variables are set in Vercel (not just `.env.local`)
2. Redeploy after setting variables:
   ```bash
   vercel --prod
   ```
3. Verify variables format:
   - `TURN_URL=turn:IP:3478` (no `https://`)
   - `TURN_STATIC_AUTH_SECRET` is not empty

---

### Issue 2: "Failed to fetch TURN credentials"

**Symptoms:**
- Browser console: `Failed to fetch TURN REST credentials`
- WebRTC connection fails

**Fix:**
1. Check `/api/turn/credentials` endpoint:
   ```bash
   curl https://your-app.vercel.app/api/turn/credentials
   ```
2. If 500 error, check server logs in Vercel dashboard
3. Verify `TURN_STATIC_AUTH_SECRET` is set correctly

---

### Issue 3: "ICE connection failed"

**Symptoms:**
- WebRTC connects but video/audio doesn't work
- Browser shows: `ICE connection state: failed`

**Fix:**
1. **Verify TURN server is reachable:**
   ```bash
   # From DigitalOcean droplet
   turnutils_stunclient YOUR_DROPLET_IP
   ```

2. **Check TURN server logs:**
   ```bash
   docker-compose logs coturn
   ```

3. **Verify firewall allows UDP 3478:**
   ```bash
   sudo ufw status
   ```

4. **Check credentials match:**
   - Vercel `TURN_STATIC_AUTH_SECRET` = DigitalOcean `static-auth-secret`
   - Both use same `realm`

---

### Issue 4: Works Locally, Fails on Vercel

**Common Causes:**

1. **Environment variables not set in Vercel**
   - Local: Uses `.env.local`
   - Vercel: Must set in dashboard

2. **HTTPS mixed content**
   - Vercel uses HTTPS
   - Ensure TURN server supports TLS or use `turn:` (not `turns:`)

3. **CORS issues**
   - Check browser console for CORS errors
   - Verify API endpoints are accessible

4. **Cold start delays**
   - First request may timeout
   - Retry connection

---

## ✅ Verification Checklist

After setup, verify:

- [ ] TURN server running on DigitalOcean
- [ ] Ports 3478 (UDP/TCP) open in firewall
- [ ] Environment variables set in Vercel dashboard
- [ ] `/api/turn/health` returns `"status": "ok"`
- [ ] `/api/turn/credentials` returns valid credentials
- [ ] Browser console shows "TURN server configured"
- [ ] ICE candidates include "relay" type
- [ ] Video/audio streams work between client and advisor

---

## 🎯 Quick Test Commands

```bash
# 1. Test TURN server (from DigitalOcean)
turnutils_stunclient YOUR_IP

# 2. Test Vercel health endpoint
curl https://your-app.vercel.app/api/turn/health

# 3. Test credentials endpoint
curl https://your-app.vercel.app/api/turn/credentials

# 4. Check TURN server logs
docker-compose logs coturn | tail -50
```

---

## 📝 Environment Variables Summary

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `TURN_REALM` | ✅ | `mashklanta.com` | Must match `realm` in coturn.conf |
| `TURN_STATIC_AUTH_SECRET` | ✅ | `abc123...` | Must match `static-auth-secret` in coturn.conf |
| `TURN_URL` | ✅ | `turn:157.245.123.45:3478` | Format: `turn:IP:PORT` (no https://) |
| `TURN_TTL_SECONDS` | ❌ | `86400` | Default: 24 hours |

---

## 🚀 Next Steps

Once video calls work:

1. ✅ Monitor connection quality
2. ✅ Check browser console for errors
3. ✅ Test with different networks (home, mobile, etc.)
4. ✅ Consider adding Redis for production scaling (later)

---

## ⚠️ Important Notes

1. **Secrets must match exactly** between Vercel and DigitalOcean
2. **TURN_URL format**: `turn:IP:PORT` (not `https://` or `turns://`)
3. **Firewall must allow UDP 3478** (critical for WebRTC)
4. **Redeploy Vercel** after changing environment variables
5. **Test endpoints** before testing full video call flow

---

If you encounter issues, check:
1. Browser console for errors
2. Vercel function logs
3. TURN server logs on DigitalOcean
4. Network connectivity (firewall rules)

