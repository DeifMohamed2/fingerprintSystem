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
        PORT: 8721
      },
      error_file: "C:\\Users\\crazy mouse\\fingerPrintSystem\\logs\\app-error.log",
      out_file: "C:\\Users\\crazy mouse\\fingerPrintSystem\\logs\\app-out.log",
      log_file: "C:\\Users\\crazy mouse\\fingerPrintSystem\\logs\\app-combined.log",
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
      error_file: "C:\\Users\\crazy mouse\\fingerPrintSystem\\logs\\listener-error.log",
      out_file: "C:\\Users\\crazy mouse\\fingerPrintSystem\\logs\\listener-out.log",
      log_file: "C:\\Users\\crazy mouse\\fingerPrintSystem\\logs\\listener-combined.log",
      time: true
    }
  ]
};
