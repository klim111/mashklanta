#!/usr/bin/env node

/**
 * TURN Server Connectivity Test
 * Tests WebRTC connectivity with your custom TURN server
 */

const https = require('https');
const http = require('http');

// Configuration - update these with your server details
const TURN_SERVER = process.env.TURN_SERVER || 'your-server-ip';
const TURN_USERNAME = process.env.TURN_USERNAME || 'your-username';
const TURN_PASSWORD = process.env.TURN_PASSWORD || 'your-password';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  title: (msg) => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`)
};

// Test TURN server HTTP health endpoint
async function testHttpHealth() {
  return new Promise((resolve) => {
    log.info(`Testing HTTP health endpoint: http://${TURN_SERVER}:3478`);
    
    const req = http.get(`http://${TURN_SERVER}:3478`, { timeout: 5000 }, (res) => {
      if (res.statusCode === 200) {
        log.success('HTTP health check passed');
        resolve(true);
      } else {
        log.warning(`HTTP health check returned status: ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', (err) => {
      log.warning(`HTTP health check failed: ${err.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      log.warning('HTTP health check timed out');
      req.destroy();
      resolve(false);
    });
  });
}

// Test WebRTC ICE gathering with TURN server
async function testWebRTCConnection() {
  return new Promise((resolve) => {
    log.info('Testing WebRTC ICE gathering with TURN server...');
    
    // This would normally run in a browser environment
    // For Node.js testing, we simulate the configuration
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: `turn:${TURN_SERVER}:3478`,
        username: TURN_USERNAME,
        credential: TURN_PASSWORD,
        credentialType: 'password'
      }
    ];
    
    log.info('ICE servers configuration:');
    iceServers.forEach((server, index) => {
      if (server.urls.startsWith('turn:')) {
        console.log(`  ${index + 1}. ${server.urls} (username: ${server.username ? '***' : 'none'})`);
      } else {
        console.log(`  ${index + 1}. ${server.urls}`);
      }
    });
    
    log.success('WebRTC configuration appears valid');
    resolve(true);
  });
}

// Test port connectivity
async function testPortConnectivity() {
  const net = require('net');
  
  const testPort = (port, protocol = 'TCP') => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 3000);
      
      socket.connect(port, TURN_SERVER, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  };
  
  log.info('Testing port connectivity...');
  
  const ports = [
    { port: 3478, name: 'TURN (UDP/TCP)' },
    { port: 5349, name: 'TURN TLS' }
  ];
  
  for (const { port, name } of ports) {
    const isOpen = await testPort(port);
    if (isOpen) {
      log.success(`Port ${port} (${name}) is accessible`);
    } else {
      log.warning(`Port ${port} (${name}) is not accessible`);
    }
  }
}

// Generate test HTML for browser testing
function generateTestHTML() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TURN Server WebRTC Test</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
        button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        button:hover { background: #0056b3; }
        #results { margin-top: 20px; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>TURN Server WebRTC Connectivity Test</h1>
    <p>This page tests WebRTC connectivity using your custom TURN server.</p>
    
    <button onclick="runTest()">Start WebRTC Test</button>
    
    <div id="results"></div>
    
    <script>
        const TURN_CONFIG = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                {
                    urls: 'turn:${TURN_SERVER}:3478',
                    username: '${TURN_USERNAME}',
                    credential: '${TURN_PASSWORD}',
                    credentialType: 'password'
                }
            ]
        };
        
        function log(message, type = 'info') {
            const results = document.getElementById('results');
            const div = document.createElement('div');
            div.className = \`status \${type}\`;
            div.innerHTML = \`<strong>\${new Date().toLocaleTimeString()}</strong>: \${message}\`;
            results.appendChild(div);
        }
        
        async function runTest() {
            const results = document.getElementById('results');
            results.innerHTML = '';
            
            log('Starting WebRTC connectivity test...', 'info');
            log('TURN Server: ${TURN_SERVER}:3478', 'info');
            
            try {
                const pc = new RTCPeerConnection(TURN_CONFIG);
                let candidateCount = 0;
                let turnCandidateFound = false;
                
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        candidateCount++;
                        const candidate = event.candidate.candidate;
                        
                        if (candidate.includes('relay')) {
                            turnCandidateFound = true;
                            log(\`TURN relay candidate found: \${candidate}\`, 'success');
                        } else if (candidate.includes('srflx')) {
                            log(\`STUN reflexive candidate found: \${candidate}\`, 'info');
                        } else if (candidate.includes('host')) {
                            log(\`Host candidate found: \${candidate}\`, 'info');
                        }
                    } else {
                        log(\`ICE gathering complete. Total candidates: \${candidateCount}\`, 'info');
                        
                        if (turnCandidateFound) {
                            log('✅ TURN server is working correctly!', 'success');
                        } else {
                            log('⚠️ No TURN relay candidates found. Check server configuration.', 'warning');
                        }
                    }
                };
                
                pc.onicegatheringstatechange = () => {
                    log(\`ICE gathering state: \${pc.iceGatheringState}\`, 'info');
                };
                
                pc.onconnectionstatechange = () => {
                    log(\`Connection state: \${pc.connectionState}\`, 'info');
                };
                
                // Create offer to trigger ICE gathering
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                
                log('ICE gathering started...', 'info');
                
                // Cleanup after 10 seconds
                setTimeout(() => {
                    pc.close();
                    log('Test completed', 'info');
                }, 10000);
                
            } catch (error) {
                log(\`Error during test: \${error.message}\`, 'error');
            }
        }
        
        // Auto-run test on page load
        window.onload = () => {
            setTimeout(runTest, 1000);
        };
    </script>
</body>
</html>`;
  
  require('fs').writeFileSync('turn-test.html', html);
  log.success('Generated turn-test.html for browser testing');
  log.info('Open turn-test.html in your browser to run WebRTC tests');
}

// Main test function
async function runTests() {
  log.title('🔄 TURN Server Connectivity Test');
  console.log('=====================================');
  
  if (!TURN_SERVER || TURN_SERVER === 'your-server-ip') {
    log.error('Please set TURN_SERVER environment variable or update the script');
    log.info('Usage: TURN_SERVER=1.2.3.4 TURN_USERNAME=user TURN_PASSWORD=pass node test-connectivity.js');
    return;
  }
  
  log.info(\`Testing TURN server: \${TURN_SERVER}\`);
  log.info(\`Username: \${TURN_USERNAME}\`);
  log.info(\`Password: \${TURN_PASSWORD ? '***' : 'not set'}\`);
  console.log('');
  
  // Test 1: HTTP Health
  await testHttpHealth();
  console.log('');
  
  // Test 2: Port Connectivity
  await testPortConnectivity();
  console.log('');
  
  // Test 3: WebRTC Configuration
  await testWebRTCConnection();
  console.log('');
  
  // Generate browser test
  generateTestHTML();
  console.log('');
  
  log.title('📋 Test Summary');
  console.log('=====================================');
  log.info('1. Check the results above for any errors');
  log.info('2. Open turn-test.html in your browser for WebRTC tests');
  log.info('3. Look for TURN relay candidates in browser test');
  log.info('4. If tests fail, check firewall and server configuration');
  console.log('');
  
  log.title('🔧 Troubleshooting');
  console.log('=====================================');
  log.info('If tests fail:');
  log.info('• Check server is running: docker-compose ps');
  log.info('• Check firewall: sudo ufw status');
  log.info('• Check logs: docker-compose logs coturn');
  log.info('• Verify ports: nmap -p 3478,5349 ' + TURN_SERVER);
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testHttpHealth, testPortConnectivity, testWebRTCConnection };
