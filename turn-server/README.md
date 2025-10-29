# Custom TURN Server for Mashklanta Video Calls

This directory contains everything needed to deploy your own TURN server for reliable WebRTC video calling.

## 🎯 Quick Start

### 1. Create a Server
- **Recommended**: DigitalOcean Droplet ($10/month)
- **OS**: Ubuntu 22.04 LTS
- **Specs**: 2GB RAM, 1 vCPU, 50GB SSD
- **Location**: Choose closest to your users

### 2. Deploy TURN Server
```bash
# SSH to your server
ssh root@YOUR_SERVER_IP

# Create user and clone repo
adduser mashklanta
usermod -aG sudo mashklanta
su - mashklanta
git clone https://github.com/YOUR_USERNAME/mashklanta.git
cd mashklanta/turn-server

# Deploy (takes 5-10 minutes)
chmod +x deploy.sh
./deploy.sh
```

### 3. Save the Credentials
The deployment script will output environment variables like:
```bash
NEXT_PUBLIC_TURN_URL=turn:1.2.3.4:3478
NEXT_PUBLIC_TURN_USERNAME=mashklanta-1234567890
NEXT_PUBLIC_TURN_CREDENTIAL=abc123def456...
```

**Save these securely!** You'll need them for Vercel.

## 📁 Files Explained

### Core Files
- **`coturn.conf`** - TURN server configuration (optimized for production)
- **`deploy.sh`** - Automated deployment script
- **`docker-compose.yml`** - Container orchestration
- **`install.sh`** - Manual installation script (alternative to Docker)

### Testing & Monitoring
- **`test-connectivity.js`** - Node.js connectivity tester
- **`turn-status.sh`** - Generated monitoring script
- **`turn-test.html`** - Generated browser test page

## 🔧 Configuration Details

### Port Configuration
- **3478** - TURN server (UDP/TCP)
- **5349** - TURN over TLS (optional)
- **49152-65535** - Relay port range (UDP)

### Security Features
- Firewall configured (UFW)
- Fail2ban for intrusion prevention
- Non-root user execution
- Automatic security updates

### Performance Optimizations
- Kernel parameter tuning
- Memory and file descriptor limits
- Process priority optimization
- Log rotation

## 🚀 Usage Commands

### Check Status
```bash
./turn-status.sh
```

### View Logs
```bash
docker-compose logs -f coturn
```

### Restart Service
```bash
docker-compose restart coturn
```

### Update Server
```bash
docker-compose pull
docker-compose up -d
```

### Test Connectivity
```bash
# Node.js test
node test-connectivity.js

# Manual STUN test
turnutils_stunclient YOUR_SERVER_IP

# Manual TURN test
turnutils_uclient -t -u USERNAME -w PASSWORD YOUR_SERVER_IP
```

## 📊 Monitoring

### Automated Monitoring
The deployment sets up:
- Health checks every 5 minutes
- Log rotation
- Resource monitoring
- Connection tracking

### Manual Monitoring
```bash
# System resources
htop
iotop
df -h

# Network connections
ss -tuln | grep 3478
netstat -an | grep 3478

# Service status
systemctl status coturn
docker-compose ps
```

### Key Metrics to Watch
- **CPU Usage**: Should stay < 80%
- **Memory Usage**: Should stay < 80%
- **Active Connections**: Monitor for unusual spikes
- **Disk Space**: Logs can grow over time

## 🔒 Security

### Firewall Rules
```bash
# Check firewall status
sudo ufw status verbose

# Allow specific IP (if needed)
sudo ufw allow from 1.2.3.4 to any port 3478
```

### Access Control
```bash
# Check fail2ban status
sudo fail2ban-client status

# Unban IP if needed
sudo fail2ban-client set turn-server unbanip 1.2.3.4
```

### Credential Rotation
To rotate TURN credentials:
1. Generate new secret: `openssl rand -hex 32`
2. Update `coturn.conf`
3. Restart service: `docker-compose restart coturn`
4. Update Vercel environment variables

## 🛠 Troubleshooting

### Common Issues

#### 1. Service Won't Start
```bash
# Check logs
docker-compose logs coturn

# Check configuration
docker-compose config

# Restart everything
docker-compose down && docker-compose up -d
```

#### 2. Connection Refused
```bash
# Check if port is listening
ss -tuln | grep 3478

# Check firewall
sudo ufw status

# Test from external
nmap -p 3478,5349 YOUR_SERVER_IP
```

#### 3. High Resource Usage
```bash
# Check processes
htop

# Check connections
ss -s

# Restart if needed
docker-compose restart coturn
```

#### 4. WebRTC Still Failing
- Verify Vercel environment variables
- Check browser console for errors
- Test from different networks
- Confirm TURN credentials are correct

### Getting Help
1. Check logs first: `docker-compose logs coturn`
2. Test connectivity: `node test-connectivity.js`
3. Review configuration: `cat coturn.conf`
4. Check system resources: `htop`

## 📈 Scaling

### When to Scale
Scale your server when:
- CPU usage consistently > 80%
- Memory usage consistently > 80%
- Connection failures increasing
- Network bandwidth approaching limits

### Scaling Options
1. **Vertical**: Upgrade to larger server
2. **Horizontal**: Deploy multiple TURN servers
3. **Geographic**: Servers in multiple regions

### Multi-Server Setup
For multiple TURN servers:
1. Deploy to different regions
2. Use round-robin DNS or load balancer
3. Update Vercel config with multiple URLs
4. Monitor all servers centrally

## 💰 Cost Optimization

### Monthly Costs
- **Basic** (50 users): $10/month
- **Standard** (200 users): $20/month
- **Premium** (500+ users): $40/month

### Optimization Tips
1. Monitor bandwidth usage (biggest variable)
2. Use appropriate server size
3. Enable log compression
4. Regular cleanup of old data
5. Consider reserved instances for predictable usage

## 🔄 Backup and Recovery

### Configuration Backup
```bash
# Backup configuration
tar -czf turn-backup-$(date +%Y%m%d).tar.gz \
  coturn.conf docker-compose.yml .env

# Restore configuration
tar -xzf turn-backup-YYYYMMDD.tar.gz
```

### Disaster Recovery
1. Keep server configuration documented
2. Store credentials securely
3. Have deployment scripts ready
4. Test recovery procedures regularly

### High Availability
For production systems:
1. Deploy to multiple regions
2. Use health checks and failover
3. Monitor uptime and latency
4. Have automated recovery procedures

## 📚 Additional Resources

### Documentation
- [Coturn Documentation](https://github.com/coturn/coturn)
- [WebRTC Specifications](https://webrtc.org/)
- [ICE/TURN/STUN Protocols](https://tools.ietf.org/html/rfc5766)

### Tools
- [WebRTC Troubleshooter](https://test.webrtc.org/)
- [STUN/TURN Tester](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)
- [Network Connectivity Test](https://networktest.twilio.com/)

### Community
- [WebRTC Google Group](https://groups.google.com/g/discuss-webrtc)
- [Stack Overflow WebRTC Tag](https://stackoverflow.com/questions/tagged/webrtc)
- [Coturn Issues](https://github.com/coturn/coturn/issues)

---

## 🆘 Emergency Procedures

### Server Down
1. Check server status in VPS dashboard
2. Try restarting: `sudo reboot`
3. SSH and check services: `docker-compose ps`
4. Check logs: `docker-compose logs coturn`

### High Load
1. Check resource usage: `htop`
2. Identify heavy processes: `top`
3. Restart services if needed: `docker-compose restart`
4. Scale server if consistently high

### Security Incident
1. Check fail2ban logs: `sudo fail2ban-client status`
2. Review access logs: `sudo journalctl -u ssh`
3. Block suspicious IPs: `sudo ufw deny from IP_ADDRESS`
4. Rotate credentials if compromised

Remember: Most issues can be resolved by checking logs and restarting services. Keep this README handy for quick reference!
