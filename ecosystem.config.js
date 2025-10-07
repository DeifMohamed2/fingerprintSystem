module.exports = {
  apps : [
    {
      name: "fingerPrintApp",
      script: "./app.js",
      cwd: "C:\\Program Files\\fingerPrintSystem",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: "10s",
      kill_timeout: 5000,
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      error_file: "./logs/app-error.log",
      out_file: "./logs/app-out.log",
      log_file: "./logs/app-combined.log",
      time: true
    },
    {
      name: "listener",
      script: "./listener.py",
      interpreter: "python",
      cwd: "C:\\Program Files\\fingerPrintSystem",
      instances: 1,
      autorestart: true,
      watch: false,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: "10s",
      kill_timeout: 5000,
      error_file: "./logs/listener-error.log",
      out_file: "./logs/listener-out.log",
      log_file: "./logs/listener-combined.log",
      time: true
    }
  ]
};
