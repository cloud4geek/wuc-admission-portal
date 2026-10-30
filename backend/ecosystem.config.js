module.exports = {
  apps: [{
    name: 'wuc-backend',
    script: './server.js',
    cwd: '/home/admin/wuc-admission-portal/backend',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '400M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    out_file: '/home/admin/.pm2/logs/wuc-backend-out.log',
    error_file: '/home/admin/.pm2/logs/wuc-backend-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    restart_delay: 3000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
