module.exports = {
  apps: [
    {
      name: 'websocket-server',
      script: 'websocket-server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        WEBSOCKET_PORT: 3001
      },
      env_development: {
        NODE_ENV: 'development',
        WEBSOCKET_PORT: 3001
      },
      error_file: './logs/websocket-error.log',
      out_file: './logs/websocket-out.log',
      log_file: './logs/websocket-combined.log',
      time: true
    }
  ]
};
