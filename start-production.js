#!/usr/bin/env node

/**
 * Production startup script for the video call system
 * This script starts both the WebSocket server and provides instructions for the Next.js app
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Mashklanta Video Call System in Production Mode...\n');

// Check environment variables
const requiredEnvVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'NEXT_PUBLIC_WEBSOCKET_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease set these environment variables before starting the application.');
  process.exit(1);
}

console.log('✅ Environment variables validated');
console.log(`📡 WebSocket URL: ${process.env.NEXT_PUBLIC_WEBSOCKET_URL}`);
console.log(`🌐 NextAuth URL: ${process.env.NEXTAUTH_URL}`);
console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}\n`);

// Start WebSocket server
console.log('🔌 Starting WebSocket server...');
const websocketServer = spawn('node', ['websocket-server.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

websocketServer.on('error', (error) => {
  console.error('❌ Failed to start WebSocket server:', error);
  process.exit(1);
});

websocketServer.on('exit', (code) => {
  console.log(`📡 WebSocket server exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  websocketServer.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down servers...');
  websocketServer.kill('SIGTERM');
  process.exit(0);
});

console.log('✅ WebSocket server started successfully!');
console.log('\n📋 Next steps:');
console.log('1. Start your Next.js application: npm run build && npm start');
console.log('2. Test the video call system');
console.log('3. Monitor logs for any issues\n');

// Keep the process running
process.stdin.resume();
