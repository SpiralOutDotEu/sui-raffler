module.exports = {
    apps: [{
      name: 'raffler-prod',
      cwd: '/var/www/suiraffler-main/current',
      script: './.next/standalone/server.js',
      env: { NODE_ENV: 'production', PORT: 3000 },
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      listen_timeout: 8000,
      kill_timeout: 8000
    }]
  }
  