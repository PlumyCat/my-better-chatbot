module.exports = {
  apps: [{
    name: 'better-chatbot',
    script: 'pnpm',
    args: 'start',
    cwd: '/home/ric/Projects/better-chatbot',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NO_HTTPS: '1'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};