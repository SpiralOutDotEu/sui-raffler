module.exports = {
    apps: [{
      name: 'raffler-testnet',
      cwd: '/var/www/suiraffler-testnet/current',
      script: './.next/standalone/server.js',
      env: { NODE_ENV: 'production', PORT: 3001 },
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      listen_timeout: 8000,
      kill_timeout: 8000
    }]
  }
  