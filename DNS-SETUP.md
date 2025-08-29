# DNS配置说明

## 域名信息
- **域名**: hcf-finance.xyz
- **服务器IP**: 118.107.4.216

## DNS记录配置

请在您的域名注册商（如Namecheap、GoDaddy、阿里云等）的DNS管理面板中添加以下记录：

### 必需的DNS记录

| 记录类型 | 主机名 | 值 | TTL |
|---------|--------|-----|-----|
| A | @ | 118.107.4.216 | 3600 |
| A | www | 118.107.4.216 | 3600 |
| A | api | 118.107.4.216 | 3600 |

### 可选的DNS记录

| 记录类型 | 主机名 | 值 | TTL | 说明 |
|---------|--------|-----|-----|------|
| CNAME | app | hcf-finance.xyz | 3600 | 应用子域名 |
| CNAME | docs | hcf-finance.xyz | 3600 | 文档子域名 |
| TXT | @ | v=spf1 ip4:118.107.4.216 ~all | 3600 | SPF记录 |

## 配置步骤

### 1. 配置DNS（在域名注册商处）
1. 登录域名注册商管理面板
2. 找到DNS管理或域名解析设置
3. 添加上述A记录
4. 保存设置（DNS生效需要5-30分钟）

### 2. 在服务器上执行配置脚本
```bash
# SSH连接到服务器
ssh root@118.107.4.216

# 进入项目目录
cd /srv/hcf-pro

# 拉取最新代码
git pull

# 执行Nginx配置脚本
chmod +x setup-nginx.sh
./setup-nginx.sh
```

### 3. 验证配置
```bash
# 检查DNS解析
nslookup hcf-finance.xyz
ping hcf-finance.xyz

# 检查Nginx状态
systemctl status nginx

# 查看网站日志
tail -f /var/log/nginx/hcf-finance.access.log
```

## 访问地址

配置完成后，可以通过以下地址访问：

- **主站**: http://hcf-finance.xyz
- **WWW**: http://www.hcf-finance.xyz
- **HTTPS**: https://hcf-finance.xyz（需要配置SSL）

## 常见问题

### DNS未生效
- DNS记录通常需要5-30分钟生效
- 最长可能需要48小时全球生效
- 可使用 https://dnschecker.org 检查DNS传播状态

### 无法访问网站
1. 检查DNS是否解析到正确IP
   ```bash
   nslookup hcf-finance.xyz
   ```
2. 检查服务器防火墙
   ```bash
   ufw status
   ```
3. 检查Nginx是否运行
   ```bash
   systemctl status nginx
   ```

### SSL证书问题
- Let's Encrypt证书每90天需要更新
- 可设置自动更新：
  ```bash
  crontab -e
  # 添加以下行
  0 0 * * * certbot renew --quiet
  ```

## 开发模式访问

如需开发调试，可以直接访问开发服务器：
- http://118.107.4.216:5173

运行开发服务器：
```bash
cd /srv/hcf-pro/frontend
npm run dev -- --host 0.0.0.0
```