# 🚀 Quick Reference: TURN Server Deployment

## ⚡ Quick Start (5 Steps)

### 1️⃣ Create DigitalOcean Account
- Go to: https://digitalocean.com
- Sign up → Add payment method
- Create Droplet: Ubuntu 22.04 LTS, $10/month, closest region

### 2️⃣ Connect & Clone
```bash
ssh root@YOUR_SERVER_IP
adduser mashklanta && usermod -aG sudo mashklanta && su - mashklanta
git clone https://github.com/klim111/mashklanta.git
cd mashklanta/turn-server
```

### 3️⃣ Deploy
```bash
chmod +x deploy.sh
./deploy.sh
# ⚠️ SAVE THE OUTPUT! You'll need it for Vercel
```

### 4️⃣ Add to Vercel
- Vercel Dashboard → Your Project → Settings → Environment Variables
- Add these 3 variables (from deploy.sh output):
  - `NEXT_PUBLIC_TURN_URL=turn:IP:3478`
  - `NEXT_PUBLIC_TURN_USERNAME=mashklanta-XXX`
  - `NEXT_PUBLIC_TURN_CREDENTIAL=SECRET`

### 5️⃣ Redeploy
- Vercel Dashboard → Deployments → Redeploy
- Test: `https://your-app.vercel.app/video-call/test-123`

---

## 🔑 Key Information to Save

After running `./deploy.sh`, save these:

```
Server IP: ___________
TURN URL: turn:___:3478
Username: ___________
Credential: ___________
```

---

## ✅ Quick Verification

```bash
# On server
docker-compose ps          # Should show "Up"
./turn-status.sh           # Check status
docker-compose logs coturn # View logs

# In browser
# Open video call → Check debug console (WiFi icon)
# Should see: "Custom TURN server configured"
```

---

## 🆘 Quick Troubleshooting

**Server not starting?**
```bash
docker-compose restart coturn
docker-compose logs coturn
```

**Video calls not working?**
- Check Vercel environment variables
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for errors

**Connection refused?**
```bash
sudo ufw status
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
```

---

## 📞 Full Guide
See `TURN_SERVER_DEPLOYMENT_STEP_BY_STEP.md` for detailed instructions.
