#!/bin/bash

# TURN Server Installation Script for Ubuntu/Debian
# Optimized for Mashklanta Video Call System

set -e

echo "🚀 Installing TURN Server for Mashklanta Video Calls..."

# Update system
sudo apt-get update

# Install Coturn
sudo apt-get install -y coturn

# Install additional tools
sudo apt-get install -y ufw fail2ban htop iotop

# Create turnserver user if it doesn't exist
sudo useradd -r -s /bin/false turnserver 2>/dev/null || true

# Create directories
sudo mkdir -p /var/log/coturn
sudo mkdir -p /var/lib/coturn
sudo mkdir -p /etc/coturn

# Set permissions
sudo chown -R turnserver:turnserver /var/log/coturn
sudo chown -R turnserver:turnserver /var/lib/coturn
sudo chown -R turnserver:turnserver /etc/coturn

# Get external IP
EXTERNAL_IP=$(curl -s ifconfig.me)
echo "📡 Detected external IP: $EXTERNAL_IP"

# Generate random secret
TURN_SECRET=$(openssl rand -hex 32)
echo "🔐 Generated TURN secret: $TURN_SECRET"

# Copy configuration
sudo cp coturn.conf /etc/coturn/turnserver.conf

# Replace placeholders in configuration
sudo sed -i "s/EXTERNAL_IP_PLACEHOLDER/$EXTERNAL_IP/g" /etc/coturn/turnserver.conf
sudo sed -i "s/TURN_SECRET_PLACEHOLDER/$TURN_SECRET/g" /etc/coturn/turnserver.conf

# Set proper permissions for config
sudo chown turnserver:turnserver /etc/coturn/turnserver.conf
sudo chmod 640 /etc/coturn/turnserver.conf

# Enable Coturn service
sudo systemctl enable coturn

# Configure firewall
echo "🔥 Configuring firewall..."

# Allow SSH (important!)
sudo ufw allow ssh

# TURN server ports
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp

# Relay ports range
sudo ufw allow 49152:65535/udp

# Enable firewall
sudo ufw --force enable

# Configure fail2ban for security
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create systemd service override for better performance
sudo mkdir -p /etc/systemd/system/coturn.service.d
sudo tee /etc/systemd/system/coturn.service.d/override.conf > /dev/null <<EOF
[Service]
LimitNOFILE=65536
LimitNPROC=65536
LimitMEMLOCK=infinity

# Performance settings
Nice=-10
IOSchedulingClass=1
IOSchedulingPriority=4

# Restart policy
Restart=always
RestartSec=5
EOF

# Reload systemd
sudo systemctl daemon-reload

# Start Coturn
sudo systemctl start coturn

# Create monitoring script
sudo tee /usr/local/bin/turn-monitor.sh > /dev/null <<'EOF'
#!/bin/bash

# TURN Server Monitoring Script

LOG_FILE="/var/log/coturn-monitor.log"
TURN_PORT=3478
EXTERNAL_IP=$(curl -s ifconfig.me)

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Check if coturn is running
if ! systemctl is-active --quiet coturn; then
    log "ERROR: Coturn service is not running!"
    sudo systemctl restart coturn
    log "INFO: Attempted to restart coturn service"
fi

# Check if port is listening
if ! netstat -ln | grep -q ":$TURN_PORT "; then
    log "ERROR: TURN port $TURN_PORT is not listening!"
    sudo systemctl restart coturn
    log "INFO: Attempted to restart coturn due to port issue"
fi

# Check memory usage
MEMORY_USAGE=$(ps -o pid,ppid,cmd,%mem,%cpu --sort=-%mem -C turnserver | head -2 | tail -1 | awk '{print $4}')
if (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
    log "WARNING: High memory usage: $MEMORY_USAGE%"
fi

# Check connection count
CONNECTIONS=$(netstat -an | grep :$TURN_PORT | wc -l)
log "INFO: Active connections: $CONNECTIONS"

# Log system stats
LOAD=$(uptime | awk -F'load average:' '{print $2}' | cut -d, -f1 | xargs)
log "INFO: System load: $LOAD, Memory usage: $MEMORY_USAGE%"
EOF

sudo chmod +x /usr/local/bin/turn-monitor.sh

# Create cron job for monitoring
echo "*/5 * * * * /usr/local/bin/turn-monitor.sh" | sudo crontab -

# Create log rotation
sudo tee /etc/logrotate.d/coturn > /dev/null <<EOF
/var/log/coturn.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 turnserver turnserver
    postrotate
        systemctl reload coturn > /dev/null 2>&1 || true
    endscript
}

/var/log/coturn-monitor.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF

# Show status
echo "✅ TURN Server installation completed!"
echo ""
echo "📊 Service Status:"
sudo systemctl status coturn --no-pager -l

echo ""
echo "🔧 Configuration Summary:"
echo "   External IP: $EXTERNAL_IP"
echo "   TURN Secret: $TURN_SECRET"
echo "   TURN URL: turn:$EXTERNAL_IP:3478"
echo "   TLS TURN URL: turns:$EXTERNAL_IP:5349"
echo ""
echo "🌐 Add these environment variables to your Vercel deployment:"
echo "   NEXT_PUBLIC_TURN_URL=turn:$EXTERNAL_IP:3478"
echo "   NEXT_PUBLIC_TURN_USERNAME=mashklanta"
echo "   NEXT_PUBLIC_TURN_CREDENTIAL=$TURN_SECRET"
echo ""
echo "📝 Save these credentials securely!"
echo ""
echo "🔍 Monitor logs with:"
echo "   sudo journalctl -u coturn -f"
echo "   sudo tail -f /var/log/coturn.log"
echo ""
echo "🔧 Test connectivity with:"
echo "   sudo turnutils_stunclient $EXTERNAL_IP"
echo "   sudo turnutils_uclient -t -u mashklanta -w $TURN_SECRET $EXTERNAL_IP"
