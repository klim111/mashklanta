# TURN Server Hosting Guide for Mashklanta Video Calls

## 🏆 Recommended Hosting Providers

### 1. **DigitalOcean** (Best Overall)
**Why recommended:**
- ✅ Excellent UDP performance
- ✅ Predictable pricing ($5-20/month)
- ✅ Global data centers
- ✅ Simple setup and management
- ✅ Great documentation

**Recommended Droplet:**
- **Basic Plan**: $10/month (2GB RAM, 1 vCPU, 50GB SSD)
- **Production**: $20/month (4GB RAM, 2 vCPU, 80GB SSD)
- **Location**: Choose closest to your users

**Setup Steps:**
```bash
# Create droplet with Ubuntu 22.04 LTS
# Enable monitoring and backups
# Add SSH key during creation

# After creation, run:
git clone [your-repo]
cd turn-server
chmod +x deploy.sh
./deploy.sh
```

### 2. **Vultr** (Best Performance/Price)
**Why recommended:**
- ✅ High-performance network
- ✅ Competitive pricing ($6-12/month)
- ✅ Multiple global locations
- ✅ Good for low-latency applications

**Recommended Instance:**
- **Regular Performance**: $6/month (1GB RAM, 1 vCPU, 25GB SSD)
- **High Frequency**: $12/month (2GB RAM, 1 vCPU, 55GB SSD)

### 3. **Linode** (Most Reliable)
**Why recommended:**
- ✅ Excellent uptime (99.99%+)
- ✅ Consistent performance
- ✅ Good customer support
- ✅ Transparent pricing

**Recommended Plan:**
- **Nanode**: $5/month (1GB RAM, 1 vCPU, 25GB SSD)
- **Linode 4GB**: $20/month (4GB RAM, 2 vCPU, 80GB SSD)

### 4. **AWS EC2** (Enterprise Grade)
**Why recommended:**
- ✅ Global infrastructure
- ✅ Advanced networking features
- ✅ Scalable and reliable
- ❌ More complex pricing

**Recommended Instance:**
- **t3.small**: ~$15/month (2GB RAM, 2 vCPU)
- **t3.medium**: ~$30/month (4GB RAM, 2 vCPU)
- Use Elastic IP for static IP address

### 5. **Google Cloud Platform**
**Why recommended:**
- ✅ Google's network infrastructure
- ✅ Good global presence
- ✅ Integration with other Google services

**Recommended Instance:**
- **e2-small**: ~$13/month (2GB RAM, 2 vCPU)
- **e2-medium**: ~$27/month (4GB RAM, 2 vCPU)

## 🚫 Providers to Avoid

### ❌ **Shared Hosting**
- No UDP support
- No root access
- Performance limitations

### ❌ **Cheap VPS Providers**
- Oversold resources
- Poor network quality
- Unreliable uptime

### ❌ **Cloudflare Workers/Pages**
- No UDP support
- Limited to HTTP/HTTPS

## 📍 Server Location Strategy

### Single Region (Recommended for Start)
**Choose based on your primary user base:**
- **Israel/Middle East**: Frankfurt, Germany or London, UK
- **Europe**: Amsterdam, Netherlands or Frankfurt, Germany
- **North America**: New York or San Francisco
- **Global**: Start with Frankfurt (central location)

### Multi-Region Setup (Advanced)
For high-scale deployments:
1. **Primary**: Frankfurt or New York
2. **Secondary**: Singapore (Asia-Pacific)
3. **Tertiary**: São Paulo (South America)

Use GeoDNS to route users to nearest server.

## 💰 Cost Estimation

### Monthly Costs (USD)

| Provider | Basic (50 users) | Standard (200 users) | Premium (500+ users) |
|----------|------------------|----------------------|----------------------|
| DigitalOcean | $10 | $20 | $40 |
| Vultr | $6 | $12 | $24 |
| Linode | $10 | $20 | $40 |
| AWS EC2 | $15 | $30 | $60 |
| Google Cloud | $13 | $27 | $54 |

### Additional Costs:
- **Bandwidth**: Usually included (1-5TB)
- **Backups**: $2-5/month
- **Monitoring**: Free to $10/month
- **SSL Certificate**: Free (Let's Encrypt)

## ⚡ Performance Requirements

### Minimum Specifications:
- **RAM**: 1GB (supports ~50 concurrent calls)
- **CPU**: 1 vCPU (2.4GHz+)
- **Storage**: 25GB SSD
- **Bandwidth**: 1TB/month
- **Network**: 1Gbps connection

### Recommended Specifications:
- **RAM**: 2-4GB (supports ~200 concurrent calls)
- **CPU**: 2 vCPU (2.4GHz+)
- **Storage**: 50GB SSD
- **Bandwidth**: 2TB/month
- **Network**: 1Gbps+ connection

### Scaling Formula:
- **~1MB per minute per user** for video calls
- **~50-100 concurrent users per GB RAM**
- **~500GB bandwidth per 1000 call-hours**

## 🔧 Quick Setup Instructions

### Step 1: Create Server
1. Choose provider and plan
2. Select Ubuntu 22.04 LTS
3. Add SSH key
4. Enable monitoring/backups
5. Choose data center location

### Step 2: Initial Setup
```bash
# Connect to server
ssh root@your-server-ip

# Create non-root user
adduser mashklanta
usermod -aG sudo mashklanta
su - mashklanta

# Clone repository
git clone https://github.com/your-username/mashklanta.git
cd mashklanta/turn-server
```

### Step 3: Deploy TURN Server
```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment (takes 5-10 minutes)
./deploy.sh

# Note down the environment variables
cat vercel-env.txt
```

### Step 4: Configure Vercel
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add the variables from `vercel-env.txt`
3. Redeploy your application

### Step 5: Test
```bash
# Test connectivity
./turn-status.sh

# Monitor logs
docker-compose logs -f coturn
```

## 🔒 Security Best Practices

### 1. **Firewall Configuration**
```bash
# Only allow necessary ports
ufw allow ssh
ufw allow 3478/udp  # TURN
ufw allow 5349/tcp  # TURN TLS
ufw allow 49152:65535/udp  # Relay range
ufw enable
```

### 2. **SSH Security**
```bash
# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Change SSH port (optional)
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config

# Restart SSH
sudo systemctl restart ssh
```

### 3. **Regular Updates**
```bash
# Set up automatic updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 4. **Monitoring**
```bash
# Set up log monitoring
sudo apt install logwatch
echo "*/15 * * * * /usr/local/bin/turn-monitor.sh" | crontab -
```

## 📊 Monitoring and Maintenance

### Daily Checks:
```bash
# Check server status
./turn-status.sh

# Check system resources
htop
iotop
df -h
```

### Weekly Tasks:
- Review logs for errors
- Check disk space usage
- Monitor bandwidth usage
- Update system packages

### Monthly Tasks:
- Rotate credentials (optional)
- Review firewall logs
- Check backup integrity
- Performance optimization

## 🆘 Troubleshooting

### Common Issues:

1. **TURN Server Not Starting**
```bash
# Check logs
docker-compose logs coturn

# Check port conflicts
sudo netstat -tulpn | grep :3478

# Restart service
docker-compose restart coturn
```

2. **Firewall Blocking Connections**
```bash
# Check firewall status
sudo ufw status verbose

# Check if ports are open
nmap -p 3478,5349 your-server-ip
```

3. **High Memory Usage**
```bash
# Check memory usage
free -h

# Restart if needed
docker-compose restart coturn
```

4. **Connection Failures**
```bash
# Test STUN connectivity
turnutils_stunclient your-server-ip

# Test TURN connectivity
turnutils_uclient -t -u username -w password your-server-ip
```

## 📞 Support

### Getting Help:
1. Check logs: `docker-compose logs coturn`
2. Review configuration: `cat coturn.conf`
3. Test connectivity: `./turn-status.sh`
4. Check system resources: `htop`

### Emergency Contacts:
- Provider support (DigitalOcean, Vultr, etc.)
- Community forums
- TURN/WebRTC documentation

## 🚀 Next Steps After Setup

1. **Test from different networks** (home, mobile, corporate)
2. **Monitor performance** for first week
3. **Set up alerting** for downtime
4. **Plan scaling** based on usage
5. **Consider backup server** for high availability

Remember: Start simple with one server, then scale based on actual usage patterns!
