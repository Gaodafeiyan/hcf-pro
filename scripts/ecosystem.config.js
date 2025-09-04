/**
 * PM2配置文件
 * 用于生产环境的进程管理
 */

module.exports = {
  apps: [{
    name: 'liquidity-monitor',
    script: './liquidity-monitor.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    env_development: {
      NODE_ENV: 'development'
    },
    // 错误日志
    error_file: '../logs/pm2-error.log',
    // 输出日志
    out_file: '../logs/pm2-out.log',
    // 日志时间格式
    time: true,
    // 日志合并
    merge_logs: true,
    // 崩溃后重启延迟
    restart_delay: 5000,
    // 最大重启次数
    max_restarts: 10,
    // 重启间隔
    min_uptime: '10s',
    // 优雅关闭超时
    kill_timeout: 5000
  }]
};