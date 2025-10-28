module.exports = {
  apps: [
    {
      name: "suiraffler-prod",
      cwd: "/var/www/suiraffler-prod/frontend",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      listen_timeout: 8000,
      kill_timeout: 8000,
    },
    {
      name: "suiraffler-testnet",
      cwd: "/var/www/suiraffler-testnet/frontend",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      listen_timeout: 8000,
      kill_timeout: 8000,
    },
  ],
};
