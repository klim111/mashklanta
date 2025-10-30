# Complete Video Call System Deployment Guide
## Mashklanta - Production-Ready WebRTC with Custom TURN Server

This guide will take you from zero to a fully functional, production-ready video call system deployed on Vercel with your own custom TURN server.

## 🎯 What You'll Build

- **Vercel-hosted Next.js app** with WebRTC video calling
- **Custom TURN server** for reliable connectivity through NATs/firewalls
- **HTTP-based signaling** optimized for serverless architecture
- **Advanced monitoring** and quality optimization
- **Professional-grade audio/video** with adaptive bitrate

## 📋 Prerequisites

### Required Accounts/Services:
1. **GitHub account** (for code repository)
2. **Vercel account** (for frontend hosting)
3. **VPS provider account** (DigitalOcean, Vultr, Linode, etc.)
4. **Domain name** (optional but recommended)

### Technical Requirements:
- Basic command line knowledge
- SSH access to a Linux server
- Git installed locally

## 🚀 Phase 1: TURN Server Deployment

### Step 1: Choose and Create Your Server

**Recommended: DigitalOcean Droplet**
1. Go to [DigitalOcean](https://digitalocean.com)
2. Create account and add payment method
3. Create new Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic ($10/month - 2GB RAM, 1 vCPU)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: Add SSH key (create if needed)
   - **Hostname**: `mashklanta-turn-server`
4. Note the IP address once created

### Step 2: Deploy TURN Server

```bash
# Connect to your server
ssh root@YOUR_SERVER_IP

# Create non-root user for security
adduser mashklanta
usermod -aG sudo mashklanta
su - mashklanta

# Clone the repository
git clone https://github.com/YOUR_USERNAME/mashklanta.git
cd mashklanta/turn-server
 
# Run the deployment (takes 5-10 minutes)
./deploy.sh
```

**Important**: Save the output! You'll need the environment variables for Vercel.

### Step 3: Verify TURN Server

```bash
# Check server status
./turn-status.sh

# Test connectivity
sudo turnutils_stunclient YOUR_SERVER_IP

# Monitor logs
docker-compose logs -f coturn
```

## 🌐 Phase 2: Vercel Integration

### Step 1: Prepare Your Vercel Project

1. Fork/clone the Mashklanta repository to your GitHub
2. Connect to Vercel:
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

### Step 2: Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

```env
# TURN Server Configuration (from your server deployment)
NEXT_PUBLIC_TURN_URL=turn:YOUR_SERVER_IP:3478
NEXT_PUBLIC_TURN_USERNAME=your_turn_username
NEXT_PUBLIC_TURN_CREDENTIAL=your_turn_secret

# Optional: Force TURN relay for testing
NEXT_PUBLIC_FORCE_TURN=false

# Database and other existing variables
DATABASE_URL=your_existing_database_url
NEXTAUTH_SECRET=your_existing_nextauth_secret
# ... other existing variables
```

### Step 3: Deploy to Vercel

```bash
# Deploy with new environment variables
vercel --prod

# Or redeploy from Vercel dashboard
```

## 🔧 Phase 3: Testing and Optimization

### Step 1: Basic Connectivity Test

1. Open your Vercel app URL
2. Navigate to video call page: `/video-call/test-call-123`
3. Grant camera/microphone permissions
4. Open debug console (WiFi icon)
5. Check for TURN server connection in logs

### Step 2: Network Testing

**Test from different networks:**
- Home WiFi
- Mobile data
- Corporate network
- Public WiFi

**Expected results:**
- ✅ Same network: Should work without TURN
- ✅ Different networks: Should use TURN server
- ✅ Corporate networks: Should work with TURN

### Step 3: Performance Optimization

Monitor the debug console for:
- **RTT (Round Trip Time)**: < 100ms is excellent
- **Packet Loss**: < 1% is excellent
- **Frame Rate**: Should match your camera settings
- **Bitrate**: Should adapt to network conditions

## 📊 Phase 4: Monitoring and Maintenance

### Daily Monitoring

```bash
# SSH to your TURN server
ssh mashklanta@YOUR_SERVER_IP

# Check system status
./turn-status.sh

# Check resource usage
htop
df -h
```

### Weekly Tasks

1. **Review logs** for errors or unusual activity
2. **Check bandwidth usage** in your VPS dashboard
3. **Monitor Vercel function usage** in dashboard
4. **Update system packages**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   docker-compose pull && docker-compose up -d
   ```

### Monthly Tasks

1. **Rotate TURN credentials** (optional for security)
2. **Review server costs** and optimize if needed
3. **Backup server configuration**
4. **Performance analysis** based on usage patterns

## 🔒 Security Best Practices

### Server Security

```bash
# SSH hardening
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades

# Monitor failed login attempts
sudo fail2ban-client status
```

### Application Security

1. **Use HTTPS only** (Vercel provides this automatically)
2. **Rotate TURN credentials** periodically
3. **Monitor for abuse** in server logs
4. **Implement rate limiting** for API endpoints
5. **Validate user permissions** before allowing video calls

## 🛠 Troubleshooting Guide

### Common Issues and Solutions

#### 1. TURN Server Not Responding

```bash
# Check if service is running
docker-compose ps

# Check firewall
sudo ufw status

# Test port connectivity
nmap -p 3478,5349 YOUR_SERVER_IP

# Restart service
docker-compose restart coturn
```

#### 2. Video Call Fails to Connect

**Check browser console for:**
- ICE connection state
- TURN server authentication
- Media permissions

**Solutions:**
1. Verify environment variables in Vercel
2. Test TURN server connectivity
3. Check browser permissions
4. Try different browser/device

#### 3. Poor Video Quality

**Causes and solutions:**
- **High latency**: Check server location, consider CDN
- **Packet loss**: Monitor network quality, adjust bitrate
- **CPU overload**: Upgrade server plan
- **Bandwidth limits**: Optimize video constraints

#### 4. Signaling Issues

**Check:**
1. Vercel function logs
2. WebSocket API responses
3. Network connectivity
4. Firewall blocking HTTP requests

### Emergency Procedures

#### TURN Server Down
1. Check server status in VPS dashboard
2. SSH to server and restart services
3. If server is unresponsive, reboot from dashboard
4. Monitor logs for root cause

#### High Resource Usage
```bash
# Check resource usage
htop
iotop
df -h

# Restart services if needed
docker-compose restart

# Scale server if consistently high
```

## 📈 Scaling Considerations

### When to Scale

**Scale TURN server when:**
- CPU usage consistently > 80%
- Memory usage consistently > 80%
- Network bandwidth approaching limits
- Connection failures increasing

### Scaling Options

1. **Vertical scaling**: Upgrade server plan (more RAM/CPU)
2. **Horizontal scaling**: Deploy multiple TURN servers
3. **Geographic scaling**: Servers in multiple regions
4. **Load balancing**: Distribute load across servers

### Multi-Region Setup

For global deployment:

1. **Primary region**: Your main user base
2. **Secondary regions**: Other major markets
3. **GeoDNS**: Route users to nearest server
4. **Monitoring**: Centralized monitoring across regions

## 💰 Cost Optimization

### Monthly Cost Breakdown

**Basic Setup (50 concurrent users):**
- TURN Server (DigitalOcean): $10/month
- Vercel Pro: $20/month
- Domain: $12/year
- **Total**: ~$32/month

**Production Setup (200 concurrent users):**
- TURN Server (DigitalOcean): $20/month
- Vercel Pro: $20/month
- Monitoring: $5/month
- Domain + SSL: $12/year
- **Total**: ~$46/month

### Cost Optimization Tips

1. **Monitor bandwidth usage** - biggest variable cost
2. **Use video quality adaptation** - reduces bandwidth
3. **Implement call duration limits** - prevents abuse
4. **Choose server location wisely** - affects performance and cost
5. **Regular cleanup** - remove old logs and data

## 🚀 Advanced Features

### Optional Enhancements

1. **Screen sharing optimization**
2. **Recording functionality**
3. **Chat message persistence**
4. **User presence indicators**
5. **Call quality analytics**
6. **Mobile app integration**

### Integration Options

1. **Calendar integration** (Google Calendar, Outlook)
2. **CRM integration** (Salesforce, HubSpot)
3. **Payment integration** (Stripe for premium features)
4. **Analytics** (Google Analytics, custom dashboards)

## 📞 Support and Resources

### Getting Help

1. **Check logs first**: Both Vercel and TURN server
2. **Test connectivity**: Use provided testing tools
3. **Review documentation**: WebRTC specs and browser compatibility
4. **Community forums**: Stack Overflow, WebRTC discussions

### Useful Commands Reference

```bash
# TURN Server Management
docker-compose logs -f coturn          # View logs
docker-compose restart coturn          # Restart service
docker-compose down && docker-compose up -d  # Full restart
./turn-status.sh                       # Status dashboard

# System Monitoring
htop                                   # CPU/Memory usage
iotop                                  # Disk I/O
ss -tuln | grep 3478                  # Check port listening
sudo fail2ban-client status           # Security status

# Testing
turnutils_stunclient YOUR_SERVER_IP   # Test STUN
turnutils_uclient -t -u USER -w PASS YOUR_SERVER_IP  # Test TURN
nmap -p 3478,5349 YOUR_SERVER_IP      # Test ports
```

### Emergency Contacts

- **VPS Provider Support**: Available 24/7
- **Vercel Support**: Available for Pro accounts
- **DNS Provider**: Check status pages
- **Your Team**: Document who has access to what

## ✅ Production Checklist

Before going live:

### Infrastructure
- [ ] TURN server deployed and tested
- [ ] Firewall properly configured
- [ ] SSL certificates installed (if using TURNS)
- [ ] Monitoring set up
- [ ] Backup procedures tested

### Application
- [ ] Environment variables configured
- [ ] Video call functionality tested
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness tested
- [ ] Error handling implemented

### Security
- [ ] SSH keys configured (no password auth)
- [ ] Fail2ban configured and active
- [ ] Regular updates scheduled
- [ ] Access logs monitored
- [ ] Rate limiting implemented

### Monitoring
- [ ] Server monitoring alerts set up
- [ ] Application error tracking
- [ ] Performance metrics collection
- [ ] Log rotation configured
- [ ] Backup verification scheduled

### Documentation
- [ ] Deployment procedures documented
- [ ] Troubleshooting guide accessible
- [ ] Emergency procedures defined
- [ ] Team access documented
- [ ] User guide created

## 🎉 Conclusion

You now have a production-ready video call system that can handle real-world usage patterns and network conditions. The custom TURN server ensures reliable connectivity, while the optimized WebRTC configuration provides excellent audio/video quality.

**Key achievements:**
- ✅ Professional video calling capability
- ✅ Works through NATs and firewalls
- ✅ Optimized for low latency
- ✅ Scalable architecture
- ✅ Comprehensive monitoring
- ✅ Security best practices

**Next steps:**
1. Monitor usage patterns for first month
2. Optimize based on real user feedback
3. Plan scaling based on growth
4. Consider advanced features based on needs

Remember: Start simple, monitor closely, and scale based on actual usage. This foundation will serve you well as your video calling needs grow!

---

**Need help?** Check the troubleshooting section or review the logs. Most issues can be resolved by following the diagnostic procedures outlined in this guide.
