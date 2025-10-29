# Step-by-Step TURN Server Deployment Guide
## From Vercel Deployment to Complete Video Call System

This guide walks you through deploying your TURN server and connecting it to your existing Vercel project.

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:
- ✅ Vercel project already deployed (you have this!)
- ✅ GitHub account with access to your repository
- ✅ Credit card/debit card for VPS provider
- ✅ 30-45 minutes of time

---

## 🚀 Phase 1: Create Your VPS Account & Server

### Step 1.1: Sign Up for DigitalOcean (Recommended)

1. Go to **https://digitalocean.com**
2. Click **"Sign Up"** in the top right
3. Create account with email or GitHub
4. Add payment method (credit/debit card)
   - They may authorize $1 temporarily to verify the card

### Step 1.2: Create Your Droplet (Server)

1. Once logged in, click **"Create"** → **"Droplets"**
2. Configure your server:

   **Choose an image:**
   - Select **"Ubuntu"**
   - Choose **"Ubuntu 22.04 LTS x64"** (latest stable)

   **Choose a plan:**
   - Select **"Basic"** tab
   - Choose **"Regular Intel with SSD"**
   - Pick **"$10/month"** plan (2GB RAM / 1 vCPU / 50GB SSD)
   - This supports ~50 concurrent video calls

   **Choose a datacenter region:**
   - **Important**: Select closest to your users!
   - For Israel/Europe: **Frankfurt** or **London**
   - For US: **New York** or **San Francisco**
   - For Asia: **Singapore** or **Bangalore**

   **Authentication:**
   - Select **"SSH keys"**
   - If you don't have SSH keys:
     - Click **"New SSH Key"**
     - On Windows, open PowerShell and run:
       ```powershell
       ssh-keygen -t rsa -b 4096
       ```
     - Press Enter to accept default location
     - Press Enter twice (no passphrase needed)
     - Copy the content of `C:\Users\igorl\.ssh\id_rsa.pub`
     - Paste into DigitalOcean SSH key field
     - Give it a name like "My Laptop"

   **Finalize and create:**
   - **Hostname**: `mashklanta-turn-server`
   - **Backups**: Leave unchecked (optional, costs extra)
   - Click **"Create Droplet"**

3. **Wait 1-2 minutes** for the server to be created
4. **Note your server IP address** (shown on the dashboard)
   - Example: `157.245.123.45`
   - You'll need this!

---

## 🔧 Phase 2: Connect to Your Server

### Step 2.1: Connect via SSH

**On Windows (PowerShell):**

```powershell
# Replace YOUR_SERVER_IP with your actual IP
ssh root@YOUR_SERVER_IP

# Example:
# ssh root@157.245.123.45
```

**First time connection:**
- Type `yes` when asked "Are you sure you want to continue connecting?"
- You should see: `Welcome to Ubuntu 22.04 LTS`

### Step 2.2: Create a Non-Root User (Security Best Practice)

```bash
# Create a new user
adduser mashklanta

# When prompted:
# - Enter a password (remember it!)
# - Press Enter for other fields (optional)

# Add user to sudo group (for admin access)
usermod -aG sudo mashklanta

# Switch to the new user
su - mashklanta

# Verify you're the new user
whoami
# Should show: mashklanta
```

---

## 📥 Phase 3: Get Your Code on the Server

### Step 3.1: Install Git (if not already installed)

```bash
# Update package list
sudo apt update

# Install git
sudo apt install git -y

# Verify installation
git --version
# Should show: git version 2.x.x
```

### Step 3.2: Clone Your Repository

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone https://github.com/klim111/mashklanta.git

# Navigate to TURN server directory
cd mashklanta/turn-server

# List files to verify
ls -la
# You should see: coturn.conf, deploy.sh, docker-compose.yml, etc.
```

---

## 🚀 Phase 4: Deploy the TURN Server

### Step 4.1: Run the Deployment Script

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment (takes 5-10 minutes)
./deploy.sh
```

**What happens during deployment:**
1. Installs Docker and Docker Compose
2. Configures firewall (UFW)
3. Sets up security (fail2ban)
4. Optimizes system settings
5. Deploys Coturn TURN server
6. Generates secure credentials

### Step 4.2: Save the Output!

**Look for output like this:**

```
✅ TURN Server installation completed!

📊 Service Status:
● coturn.service - TURN Server
   Active: active (running)

🔧 Configuration Summary:
   External IP: 157.245.123.45
   TURN Secret: abc123def456ghi789...
   TURN URL: turn:157.245.123.45:3478
   TLS TURN URL: turns:157.245.123.45:5349

🌐 Add these environment variables to your Vercel deployment:
   NEXT_PUBLIC_TURN_URL=turn:157.245.123.45:3478
   NEXT_PUBLIC_TURN_USERNAME=mashklanta-1234567890
   NEXT_PUBLIC_TURN_CREDENTIAL=abc123def456ghi789...
```

**⚠️ IMPORTANT: Copy these values!**
- Create a text file or note them down
- You'll need them for Vercel configuration

### Step 4.3: Verify Installation

```bash
# Check if TURN server is running
docker-compose ps

# Should show:
# NAME                STATUS
# mashklanta-turn...  Up X minutes

# Check server status
./turn-status.sh

# Check logs (optional)
docker-compose logs coturn | tail -20
```

**If you see errors**, check the troubleshooting section at the end.

---

## 🌐 Phase 5: Connect to Your Vercel Project

### Step 5.1: Access Vercel Dashboard

1. Go to **https://vercel.com**
2. Log in with your GitHub account
3. Find your project: **mashklanta** (or your project name)
4. Click on it to open the project dashboard

### Step 5.2: Navigate to Environment Variables

1. Click **"Settings"** tab (top menu)
2. Click **"Environment Variables"** (left sidebar)
3. You'll see a list of existing variables

### Step 5.3: Add TURN Server Variables

Click **"Add New"** and add these **three variables**:

**Variable 1:**
```
Name: NEXT_PUBLIC_TURN_URL
Value: turn:YOUR_SERVER_IP:3478
      (Replace YOUR_SERVER_IP with your actual IP)
Environment: Production, Preview, Development (check all)
```

**Variable 2:**
```
Name: NEXT_PUBLIC_TURN_USERNAME
Value: mashklanta-1234567890
      (Use the username from deploy.sh output)
Environment: Production, Preview, Development (check all)
```

**Variable 3:**
```
Name: NEXT_PUBLIC_TURN_CREDENTIAL
Value: abc123def456ghi789...
      (Use the credential from deploy.sh output)
Environment: Production, Preview, Development (check all)
```

**After adding each variable:**
- Click **"Save"**
- Verify it appears in the list

### Step 5.4: Redeploy Your Application

1. Go to **"Deployments"** tab (top menu)
2. Find your latest deployment
3. Click the **"..."** (three dots) menu
4. Select **"Redeploy"**
5. Confirm redeployment

**OR** push a new commit:

```bash
# On your local machine
git commit --allow-empty -m "Trigger deployment with TURN server config"
git push origin main
```

**Wait 2-3 minutes** for deployment to complete.

---

## ✅ Phase 6: Test the Connection

### Step 6.1: Test Video Call

1. Open your Vercel app URL (e.g., `https://your-app.vercel.app`)
2. Navigate to video call page:
   - URL: `https://your-app.vercel.app/video-call/test-call-123`
3. Grant camera/microphone permissions when prompted
4. Click **"Join Call"** or similar button

### Step 6.2: Check Debug Console

1. In the video call interface, look for a **WiFi icon** or **Settings icon**
2. Click it to open the debug console
3. Look for messages like:
   - ✅ "Custom TURN server configured"
   - ✅ "ICE candidate gathered: relay" (this means TURN is working!)
   - ✅ "Connection state: connected"

### Step 6.3: Test from Different Networks

**Test Scenarios:**
- ✅ Same network (two devices on same WiFi)
- ✅ Different networks (one on WiFi, one on mobile data)
- ✅ Corporate network (if possible)

**Expected Results:**
- Video/audio should work in all scenarios
- Debug console should show TURN relay candidates

---

## 🔍 Phase 7: Verify Everything Works

### Step 7.1: Check Browser Console

1. Open browser Developer Tools (F12)
2. Go to **"Console"** tab
3. Look for:
   ```
   Custom TURN server configured: {
     turnUrl: "turn:***@157.245.123.45:3478",
     hasCredentials: true,
     totalServers: 5
   }
   ```

### Step 7.2: Test TURN Server Directly

**On your server** (SSH):
```bash
# Test STUN connectivity
turnutils_stunclient YOUR_SERVER_IP

# Should show:
# Local candidate: ...
# Remote candidate: ...
# Success!
```

**On your local machine** (to test from outside):
```bash
# Install Node.js if needed
# Then run:
cd turn-server
node test-connectivity.js
```

---

## 🛠️ Troubleshooting

### Problem: "Cannot connect to server" when SSH

**Solution:**
- Make sure you're using the correct IP address
- Check DigitalOcean dashboard → your droplet → Networking
- Verify firewall allows SSH (port 22)

### Problem: "Permission denied" when running deploy.sh

**Solution:**
```bash
# Make sure script is executable
chmod +x deploy.sh

# Or run with explicit bash
bash deploy.sh
```

### Problem: "Docker not found" error

**Solution:**
```bash
# Install Docker manually
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# Log out and log back in
```

### Problem: "Port already in use" error

**Solution:**
```bash
# Check what's using the port
sudo netstat -tulpn | grep 3478

# Stop existing service
docker-compose down

# Restart
docker-compose up -d
```

### Problem: Video calls still not working after Vercel deployment

**Solution:**
1. Verify environment variables in Vercel:
   - Go to Settings → Environment Variables
   - Check all three variables are there
   - Check values match what deploy.sh output

2. Hard refresh browser:
   - Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear browser cache

3. Check Vercel logs:
   - Vercel Dashboard → Your Project → Deployments
   - Click on deployment → View Function Logs
   - Look for errors

4. Test TURN server directly:
   ```bash
   # On server
   docker-compose logs coturn | tail -50
   ```

### Problem: "TURN server not responding" in browser console

**Solution:**
```bash
# On server, check if service is running
docker-compose ps

# If not running, restart
docker-compose restart coturn

# Check firewall
sudo ufw status
# Should show: 3478/udp ALLOW

# If firewall blocks, allow it
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
```

---

## 📊 Monitoring Your TURN Server

### Daily Checks (Optional)

```bash
# SSH to server
ssh mashklanta@YOUR_SERVER_IP

# Check status
./turn-status.sh

# View logs
docker-compose logs -f coturn
# Press Ctrl+C to exit
```

### Weekly Maintenance

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d

# Check disk space
df -h
```

---

## 🎉 Success Checklist

You've successfully deployed when:

- ✅ TURN server is running (`docker-compose ps` shows "Up")
- ✅ Environment variables added to Vercel
- ✅ Vercel app redeployed
- ✅ Video calls work from different networks
- ✅ Debug console shows TURN relay candidates
- ✅ No connection errors in browser console

---

## 📞 Need Help?

1. **Check logs first:**
   - Server: `docker-compose logs coturn`
   - Vercel: Deployment → Function Logs
   - Browser: Developer Tools → Console

2. **Verify configuration:**
   - Environment variables match deploy.sh output
   - Server IP is correct in Vercel variables
   - Firewall allows ports 3478 (UDP/TCP)

3. **Test connectivity:**
   - Use `turnutils_stunclient` on server
   - Use browser test page (`turn-test.html`)
   - Check network connectivity from your location

---

## 🚀 Next Steps After Deployment

1. **Monitor usage** for first week
2. **Test from various locations** and networks
3. **Set up alerts** (optional - DigitalOcean provides monitoring)
4. **Document your setup** for your team
5. **Consider backups** (DigitalOcean offers snapshots)

---

## 💰 Cost Summary

**Monthly Costs:**
- DigitalOcean Droplet: $10/month
- Vercel Pro: $20/month (you likely already have this)
- **Total: ~$10/month** (just for TURN server)

**Bandwidth:**
- First 1TB included with DigitalOcean
- Video calls use ~1MB per minute per user
- 1000 call-hours/month ≈ ~60GB bandwidth

---

**Congratulations!** Your video call system is now production-ready with reliable connectivity through any network! 🎥✨
