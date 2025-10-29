#!/bin/bash

# TURN Server Deployment Script
# Supports multiple hosting providers

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Detect hosting provider
detect_provider() {
    if [ -f /etc/cloud/cloud.cfg ]; then
        if curl -s --max-time 2 http://169.254.169.254/metadata/v1/id 2>/dev/null | grep -q "digitalocean"; then
            echo "digitalocean"
        elif curl -s --max-time 2 http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null | grep -q "i-"; then
            echo "aws"
        elif curl -s --max-time 2 http://169.254.169.254/computeMetadata/v1/instance/id -H "Metadata-Flavor: Google" 2>/dev/null; then
            echo "gcp"
        elif curl -s --max-time 2 http://169.254.169.254/metadata/instance/compute/vmId -H "Metadata: true" 2>/dev/null; then
            echo "azure"
        else
            echo "cloud"
        fi
    else
        echo "vps"
    fi
}

# Get external IP
get_external_ip() {
    local ip=""
    
    # Try multiple services
    for service in "ifconfig.me" "ipinfo.io/ip" "icanhazip.com" "ipecho.net/plain"; do
        ip=$(curl -s --max-time 5 "$service" 2>/dev/null | tr -d '\n\r')
        if [[ $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            echo "$ip"
            return
        fi
    done
    
    log_error "Could not determine external IP address"
    exit 1
}

# Generate secure credentials
generate_credentials() {
    local turn_secret=""
    local turn_username="mashklanta-$(date +%s)"
    
    # Generate strong secret
    if command -v openssl >/dev/null 2>&1; then
        turn_secret=$(openssl rand -hex 32)
    else
        turn_secret=$(head -c 32 /dev/urandom | base64 | tr -d '=+/' | cut -c1-32)
    fi
    
    echo "TURN_SECRET=$turn_secret"
    echo "TURN_USERNAME=$turn_username"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Update system
    sudo apt-get update
    
    # Install required packages
    sudo apt-get install -y \
        docker.io \
        docker-compose \
        curl \
        wget \
        ufw \
        fail2ban \
        htop \
        iotop \
        net-tools \
        bc
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    # Enable and start Docker
    sudo systemctl enable docker
    sudo systemctl start docker
    
    log_success "Dependencies installed successfully"
}

# Configure firewall
configure_firewall() {
    log_info "Configuring firewall..."
    
    # Reset firewall
    sudo ufw --force reset
    
    # Default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH
    sudo ufw allow ssh
    
    # TURN server ports
    sudo ufw allow 3478/udp comment 'TURN STUN'
    sudo ufw allow 3478/tcp comment 'TURN STUN'
    sudo ufw allow 5349/tcp comment 'TURN TLS'
    sudo ufw allow 5349/udp comment 'TURN DTLS'
    
    # Relay ports range
    sudo ufw allow 49152:65535/udp comment 'TURN Relay Range'
    
    # Optional monitoring
    sudo ufw allow 9100/tcp comment 'Prometheus Node Exporter'
    
    # Enable firewall
    sudo ufw --force enable
    
    log_success "Firewall configured successfully"
}

# Configure fail2ban
configure_fail2ban() {
    log_info "Configuring fail2ban..."
    
    sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

# Custom TURN server protection
[turn-server]
enabled = true
port = 3478,5349
protocol = udp
filter = turn-server
logpath = /var/log/coturn.log
maxretry = 10
bantime = 1800
EOF

    # Create TURN server filter
    sudo tee /etc/fail2ban/filter.d/turn-server.conf > /dev/null <<EOF
[Definition]
failregex = ^.*session.*failed.*from.*<HOST>.*$
            ^.*authentication failed.*from.*<HOST>.*$
            ^.*allocation failed.*from.*<HOST>.*$
ignoreregex =
EOF

    sudo systemctl enable fail2ban
    sudo systemctl restart fail2ban
    
    log_success "Fail2ban configured successfully"
}

# Optimize system for TURN server
optimize_system() {
    log_info "Optimizing system for TURN server..."
    
    # Kernel parameters
    sudo tee -a /etc/sysctl.conf > /dev/null <<EOF

# TURN server optimizations
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.core.rmem_default = 65536
net.core.wmem_default = 65536
net.ipv4.udp_mem = 102400 873800 16777216
net.ipv4.udp_rmem_min = 8192
net.ipv4.udp_wmem_min = 8192
net.core.netdev_max_backlog = 5000
net.ipv4.ip_local_port_range = 32768 65535
fs.file-max = 65536
EOF

    # Apply kernel parameters
    sudo sysctl -p
    
    # Limits configuration
    sudo tee -a /etc/security/limits.conf > /dev/null <<EOF

# TURN server limits
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
EOF

    log_success "System optimization completed"
}

# Deploy TURN server
deploy_turn_server() {
    log_info "Deploying TURN server..."
    
    # Create environment file
    local external_ip=$(get_external_ip)
    local credentials=$(generate_credentials)
    
    cat > "$ENV_FILE" <<EOF
# TURN Server Configuration
EXTERNAL_IP=$external_ip
$credentials
REALM=mashklanta.com

# Docker settings
COMPOSE_PROJECT_NAME=mashklanta-turn
EOF

    log_info "External IP detected: $external_ip"
    
    # Update configuration file with actual values
    sed -i "s/EXTERNAL_IP_PLACEHOLDER/$external_ip/g" coturn.conf
    sed -i "s/TURN_SECRET_PLACEHOLDER/$(echo "$credentials" | grep TURN_SECRET | cut -d= -f2)/g" coturn.conf
    
    # Deploy with Docker Compose
    docker-compose --env-file "$ENV_FILE" up -d
    
    # Wait for service to start
    log_info "Waiting for TURN server to start..."
    sleep 10
    
    # Check if service is running
    if docker-compose ps | grep -q "Up"; then
        log_success "TURN server deployed successfully!"
    else
        log_error "TURN server failed to start"
        docker-compose logs
        exit 1
    fi
}

# Test TURN server
test_turn_server() {
    log_info "Testing TURN server connectivity..."
    
    local external_ip=$(grep EXTERNAL_IP "$ENV_FILE" | cut -d= -f2)
    local turn_secret=$(grep TURN_SECRET "$ENV_FILE" | cut -d= -f2)
    local turn_username=$(grep TURN_USERNAME "$ENV_FILE" | cut -d= -f2)
    
    # Test STUN
    if command -v turnutils_stunclient >/dev/null 2>&1; then
        log_info "Testing STUN connectivity..."
        if turnutils_stunclient "$external_ip"; then
            log_success "STUN test passed"
        else
            log_warning "STUN test failed"
        fi
    fi
    
    # Test TURN
    if command -v turnutils_uclient >/dev/null 2>&1; then
        log_info "Testing TURN connectivity..."
        if timeout 10 turnutils_uclient -t -u "$turn_username" -w "$turn_secret" "$external_ip"; then
            log_success "TURN test passed"
        else
            log_warning "TURN test failed or timed out"
        fi
    fi
}

# Generate Vercel configuration
generate_vercel_config() {
    log_info "Generating Vercel environment variables..."
    
    local external_ip=$(grep EXTERNAL_IP "$ENV_FILE" | cut -d= -f2)
    local turn_secret=$(grep TURN_SECRET "$ENV_FILE" | cut -d= -f2)
    local turn_username=$(grep TURN_USERNAME "$ENV_FILE" | cut -d= -f2)
    
    cat > vercel-env.txt <<EOF
# Add these environment variables to your Vercel project:
# https://vercel.com/your-project/settings/environment-variables

NEXT_PUBLIC_TURN_URL=turn:$external_ip:3478
NEXT_PUBLIC_TURN_USERNAME=$turn_username
NEXT_PUBLIC_TURN_CREDENTIAL=$turn_secret

# Optional: Force TURN relay (for testing)
# NEXT_PUBLIC_FORCE_TURN=true

# TLS TURN (if you configure SSL certificates)
# NEXT_PUBLIC_TURNS_URL=turns:$external_ip:5349
EOF

    log_success "Vercel configuration saved to vercel-env.txt"
    
    echo ""
    echo "🌐 Vercel Environment Variables:"
    echo "================================"
    cat vercel-env.txt | grep -v "^#" | grep -v "^$"
    echo ""
}

# Create monitoring dashboard
create_monitoring() {
    log_info "Setting up monitoring..."
    
    # Create monitoring script
    cat > turn-status.sh <<'EOF'
#!/bin/bash

# TURN Server Status Dashboard

echo "🔄 TURN Server Status Dashboard"
echo "================================"
echo ""

# Service status
echo "📊 Docker Services:"
docker-compose ps

echo ""
echo "🌐 Network Status:"
ss -tuln | grep -E ":(3478|5349)" || echo "No TURN ports listening"

echo ""
echo "💾 Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo ""
echo "📝 Recent Logs (last 10 lines):"
docker-compose logs --tail=10 coturn

echo ""
echo "🔥 Firewall Status:"
sudo ufw status numbered

echo ""
echo "🚫 Fail2ban Status:"
sudo fail2ban-client status
EOF

    chmod +x turn-status.sh
    
    # Create log rotation
    sudo tee /etc/logrotate.d/docker-coturn > /dev/null <<EOF
/var/lib/docker/containers/*/*-json.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF

    log_success "Monitoring setup completed"
}

# Main deployment function
main() {
    log_info "Starting TURN Server deployment for Mashklanta Video Calls"
    echo ""
    
    # Check prerequisites
    check_root
    
    # Detect hosting environment
    local provider=$(detect_provider)
    log_info "Detected hosting provider: $provider"
    
    # Installation steps
    install_dependencies
    configure_firewall
    configure_fail2ban
    optimize_system
    deploy_turn_server
    test_turn_server
    generate_vercel_config
    create_monitoring
    
    echo ""
    log_success "🎉 TURN Server deployment completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Copy the environment variables from vercel-env.txt to your Vercel project"
    echo "2. Redeploy your Vercel application"
    echo "3. Test video calls from different networks"
    echo "4. Monitor server status with: ./turn-status.sh"
    echo ""
    echo "📚 Useful Commands:"
    echo "   View logs: docker-compose logs -f coturn"
    echo "   Restart server: docker-compose restart coturn"
    echo "   Stop server: docker-compose down"
    echo "   Update server: docker-compose pull && docker-compose up -d"
    echo ""
    echo "🔒 Security Notes:"
    echo "   - Firewall is configured to allow only necessary ports"
    echo "   - Fail2ban is monitoring for suspicious activity"
    echo "   - Keep your server updated: sudo apt update && sudo apt upgrade"
    echo ""
    
    # Show final status
    ./turn-status.sh
}

# Run main function
main "$@"
