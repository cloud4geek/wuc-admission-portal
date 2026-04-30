module.exports = {
  apps: [
    {
      name: 'wuc-api',
      script: './server.js',
      cwd: '/var/www/wuc-admission-portal/backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: '/var/log/wuc/api-error.log',
      out_file: '/var/log/wuc/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000,
      wait_ready: true,
      watch: false,
      ignore_watch: ['node_modules', 'uploads', 'logs'],
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/wuc-admission-portal.git',
      path: '/var/www/wuc-admission-portal',
      'post-deploy': 'cd backend && npm install --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /var/www/wuc-admission-portal'
    }
  }
};
