# 🔧 Troubleshooting: TURN Server Deployment on DigitalOcean

## Problem: Directory Not Found

If you see `-bash: cd: mashklanta/turn-server: No such file or directory`, follow these steps:

---

## ✅ Step 1: Check Where You Are

```bash
# Check current directory
pwd
# Should show: /home/mashklanta

# List what's in current directory
ls -la
```

**Expected output:** You should see if `mashklanta` folder exists

---

## ✅ Step 2: Check If Repository Was Cloned

```bash
# Check if mashklanta folder exists
ls -la | grep mashklanta

# If you see mashklanta folder, check its contents
ls -la mashklanta/
```

---

## ✅ Step 3: Clone Repository (If Not Already Cloned)

If you don't see the `mashklanta` folder, clone it:

```bash
# Make sure you're in home directory
cd ~

# Clone the repository
git clone https://github.com/klim111/mashklanta.git

# Wait for clone to complete (takes 30-60 seconds)
# You should see: "Cloning into 'mashklanta'..."

# Verify it was cloned
ls -la mashklanta/
```

---

## ✅ Step 4: Navigate to TURN Server Directory

```bash
# First, go to home directory
cd ~

# Navigate to turn-server directory
cd mashklanta/turn-server

# Verify you're in the right place
pwd
# Should show: /home/mashklanta/mashklanta/turn-server

# List files to confirm
ls -la
```

**Expected files:**
- `coturn.conf`
- `deploy.sh`
- `docker-compose.yml`
- `README.md`
- etc.

---

## ✅ Step 5: If Repository Structure is Different

If the repository was cloned but `turn-server` folder doesn't exist, check:

```bash
# Check repository structure
cd ~
cd mashklanta
ls -la

# Look for turn-server directory
find . -name "turn-server" -type d

# Check if files are in root directory
ls -la | grep -E "coturn|deploy|docker"
```

---

## ✅ Step 6: Alternative - Create TURN Server Directory Manually

If the repository doesn't have the turn-server folder, you can create it manually:

```bash
# Go to repository root
cd ~/mashklanta

# Create turn-server directory
mkdir -p turn-server
cd turn-server

# Download files directly from GitHub
wget https://raw.githubusercontent.com/klim111/mashklanta/video-calling-system/turn-server/coturn.conf
wget https://raw.githubusercontent.com/klim111/mashklanta/video-calling-system/turn-server/deploy.sh
wget https://raw.githubusercontent.com/klim111/mashklanta/video-calling-system/turn-server/docker-compose.yml
wget https://raw.githubusercontent.com/klim111/mashklanta/video-calling-system/turn-server/install.sh
wget https://raw.githubusercontent.com/klim111/mashklanta/video-calling-system/turn-server/test-connectivity.js

# Make deploy script executable
chmod +x deploy.sh
chmod +x install.sh
```

---

## ✅ Step 7: Verify Branch is Correct

If you cloned but don't see turn-server, check which branch you're on:

```bash
# Check current branch
cd ~/mashklanta
git branch

# Switch to video-calling-system branch
git checkout video-calling-system

# Pull latest changes
git pull origin video-calling-system

# Check if turn-server folder exists now
ls -la | grep turn-server
```

---

## 🚀 Quick Fix Commands (Run These in Order)

Copy and paste these commands one by one:

```bash
# 1. Go to home directory
cd ~

# 2. Check if mashklanta folder exists
ls -la | grep mashklanta

# 3. If it exists, check its contents
ls -la mashklanta/

# 4. If turn-server folder exists, navigate to it
cd mashklanta/turn-server

# 5. If it doesn't exist, clone repository fresh
cd ~
rm -rf mashklanta  # Remove old clone if exists
git clone https://github.com/klim111/mashklanta.git
cd mashklanta
git checkout video-calling-system
cd turn-server
ls -la  # Should show all TURN server files
```

---

## 🆘 Common Issues and Solutions

### Issue 1: "Repository not found"
**Solution:** Make sure repository is public or you have access:
```bash
git clone https://github.com/klim111/mashklanta.git
```

### Issue 2: "Permission denied"
**Solution:** Check permissions:
```bash
ls -la mashklanta/
# If you see permission denied, try:
sudo chown -R mashklanta:mashklanta mashklanta/
```

### Issue 3: Files exist but in wrong location
**Solution:** Find where files are:
```bash
find ~ -name "deploy.sh" -type f
find ~ -name "coturn.conf" -type f
```

---

## ✅ Verification Checklist

Before running `./deploy.sh`, verify:

- [ ] You're in `/home/mashklanta/mashklanta/turn-server`
- [ ] You see `deploy.sh` file: `ls -la deploy.sh`
- [ ] You see `coturn.conf` file: `ls -la coturn.conf`
- [ ] `deploy.sh` is executable: `ls -la deploy.sh` shows `-rwxr-xr-x`
- [ ] You're on the correct branch: `git branch` shows `video-calling-system`

---

## 🎯 Once You're in the Right Directory

After navigating to `turn-server`, continue with deployment:

```bash
# Make sure script is executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

---

## 📞 Still Stuck?

Run these diagnostic commands and share the output:

```bash
# System info
pwd
whoami
ls -la ~

# Git info
cd ~
git --version
ls -la | grep mashklanta

# If mashklanta exists
cd mashklanta
git branch
git remote -v
ls -la
```

This will help identify exactly where the issue is!

