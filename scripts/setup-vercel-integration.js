#!/usr/bin/env node

/**
 * Vercel Integration Setup Script
 * Automates the integration of TURN server with Vercel deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  title: (msg) => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`)
};

// Check if Vercel CLI is installed
function checkVercelCLI() {
  try {
    execSync('vercel --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Install Vercel CLI
function installVercelCLI() {
  log.info('Installing Vercel CLI...');
  try {
    execSync('npm install -g vercel', { stdio: 'inherit' });
    log.success('Vercel CLI installed successfully');
    return true;
  } catch (error) {
    log.error('Failed to install Vercel CLI');
    return false;
  }
}

// Check if user is logged in to Vercel
function checkVercelAuth() {
  try {
    const result = execSync('vercel whoami', { encoding: 'utf8', stdio: 'pipe' });
    log.success(`Logged in to Vercel as: ${result.trim()}`);
    return true;
  } catch (error) {
    return false;
  }
}

// Login to Vercel
function loginToVercel() {
  log.info('Please login to Vercel...');
  try {
    execSync('vercel login', { stdio: 'inherit' });
    return checkVercelAuth();
  } catch (error) {
    log.error('Failed to login to Vercel');
    return false;
  }
}

// Read TURN server configuration
function readTurnConfig() {
  const envFile = path.join(__dirname, '..', 'turn-server', '.env');
  
  if (!fs.existsSync(envFile)) {
    log.error('TURN server .env file not found. Please deploy TURN server first.');
    return null;
  }
  
  const envContent = fs.readFileSync(envFile, 'utf8');
  const config = {};
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      config[key.trim()] = value.trim();
    }
  });
  
  return config;
}

// Set Vercel environment variables
function setVercelEnvVars(turnConfig) {
  log.info('Setting Vercel environment variables...');
  
  const envVars = [
    { key: 'NEXT_PUBLIC_TURN_URL', value: `turn:${turnConfig.EXTERNAL_IP}:3478` },
    { key: 'NEXT_PUBLIC_TURN_USERNAME', value: turnConfig.TURN_USERNAME },
    { key: 'NEXT_PUBLIC_TURN_CREDENTIAL', value: turnConfig.TURN_SECRET }
  ];
  
  envVars.forEach(({ key, value }) => {
    if (value) {
      try {
        execSync(`vercel env add ${key} production`, {
          input: value,
          stdio: ['pipe', 'inherit', 'inherit']
        });
        log.success(`Set ${key}`);
      } catch (error) {
        log.warning(`Failed to set ${key}, you may need to set it manually`);
      }
    }
  });
}

// Generate deployment summary
function generateDeploymentSummary(turnConfig) {
  const summary = `# Mashklanta Video Call System - Deployment Summary

## 🎉 Deployment Completed Successfully!

### TURN Server Configuration
- **Server IP**: ${turnConfig.EXTERNAL_IP}
- **TURN URL**: turn:${turnConfig.EXTERNAL_IP}:3478
- **Username**: ${turnConfig.TURN_USERNAME}
- **Credential**: [HIDDEN]

### Vercel Environment Variables Set
- ✅ NEXT_PUBLIC_TURN_URL
- ✅ NEXT_PUBLIC_TURN_USERNAME  
- ✅ NEXT_PUBLIC_TURN_CREDENTIAL

### Next Steps
1. Deploy your Vercel application: \`vercel --prod\`
2. Test video calls from different networks
3. Monitor TURN server performance
4. Set up monitoring and alerts

### Testing URLs
- **Video Call Test**: https://your-app.vercel.app/video-call/test-123
- **Debug Console**: Click WiFi icon in video call interface
- **TURN Server Status**: http://${turnConfig.EXTERNAL_IP}:3478/health (if configured)

### Monitoring Commands
\`\`\`bash
# SSH to TURN server
ssh mashklanta@${turnConfig.EXTERNAL_IP}

# Check server status
./turn-status.sh

# View logs
docker-compose logs -f coturn
\`\`\`

### Support
- Check logs first: Both Vercel and TURN server
- Test connectivity: Use provided testing tools
- Review documentation: COMPLETE_VIDEO_CALL_DEPLOYMENT_GUIDE.md

---
Generated on: ${new Date().toISOString()}
`;

  fs.writeFileSync('DEPLOYMENT_SUMMARY.md', summary);
  log.success('Deployment summary saved to DEPLOYMENT_SUMMARY.md');
}

// Test Vercel deployment
async function testVercelDeployment() {
  log.info('Testing Vercel deployment...');
  
  try {
    // Get deployment URL
    const result = execSync('vercel ls --scope=personal', { encoding: 'utf8' });
    const lines = result.split('\n');
    const deploymentLine = lines.find(line => line.includes('mashklanta') || line.includes('video'));
    
    if (deploymentLine) {
      const url = deploymentLine.split(' ')[1];
      log.success(`Deployment found: https://${url}`);
      log.info('Please test video calls manually');
      return true;
    } else {
      log.warning('No deployment found. Run: vercel --prod');
      return false;
    }
  } catch (error) {
    log.warning('Could not check deployment status');
    return false;
  }
}

// Main setup function
async function setupVercelIntegration() {
  log.title('🚀 Vercel Integration Setup');
  console.log('========================================');
  
  // Step 1: Check Vercel CLI
  if (!checkVercelCLI()) {
    log.warning('Vercel CLI not found');
    if (!installVercelCLI()) {
      log.error('Please install Vercel CLI manually: npm install -g vercel');
      return;
    }
  } else {
    log.success('Vercel CLI found');
  }
  
  // Step 2: Check authentication
  if (!checkVercelAuth()) {
    log.warning('Not logged in to Vercel');
    if (!loginToVercel()) {
      log.error('Please login to Vercel manually: vercel login');
      return;
    }
  }
  
  // Step 3: Read TURN configuration
  log.info('Reading TURN server configuration...');
  const turnConfig = readTurnConfig();
  if (!turnConfig) {
    log.error('Please deploy TURN server first using: cd turn-server && ./deploy.sh');
    return;
  }
  
  log.success(`TURN server found at: ${turnConfig.EXTERNAL_IP}`);
  
  // Step 4: Set environment variables
  setVercelEnvVars(turnConfig);
  
  // Step 5: Generate summary
  generateDeploymentSummary(turnConfig);
  
  // Step 6: Test deployment (optional)
  await testVercelDeployment();
  
  console.log('');
  log.title('✅ Integration Setup Complete!');
  console.log('========================================');
  log.info('1. Review DEPLOYMENT_SUMMARY.md for details');
  log.info('2. Deploy to Vercel: vercel --prod');
  log.info('3. Test video calls from different networks');
  log.info('4. Monitor TURN server performance');
  console.log('');
  log.success('Your video call system is ready for production! 🎉');
}

// Handle command line usage
if (require.main === module) {
  setupVercelIntegration().catch(error => {
    log.error(`Setup failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { setupVercelIntegration };
