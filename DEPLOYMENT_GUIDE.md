# SMS Monitor Dashboard - Deployment Guide

**Roman Urdu:**
Ye guide aapko sikhayga k SMS Monitor Dashboard ko VPS par kesy deploy karna hai aur Telegram notifications kesy setup karna hai.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [VPS Deployment](#vps-deployment)
5. [Telegram Setup](#telegram-setup)
6. [Production Checklist](#production-checklist)

---

## Prerequisites

You'll need:
- **Node.js 18+** installed
- **npm** or **pnpm** package manager
- **API Credentials** (BASE_URL, TOKEN from your SMS API)
- **Telegram Bot Token** (for notifications)
- **VPS with Ubuntu/Debian** (for production)

---

## Environment Setup

### Step 1: Create `.env.local` file

```bash
# .env.local

# API Credentials
BASE_URL=http://your-api-server.com
TOKEN=your_api_token_here

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

### Step 2: Get Your Credentials

**For BASE_URL and TOKEN:**
- Contact your SMS API provider
- BASE_URL format: `http://51.77.216.195` (without trailing slash)
- TOKEN: Your authentication token

**For Telegram:**

#### Create Telegram Bot:
1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Follow the prompts:
   - Name: `SMS Monitor Bot`
   - Username: `sms_monitor_bot_123`
4. Copy the token provided (this is your `TELEGRAM_BOT_TOKEN`)

#### Get Chat ID:
1. Create a Telegram Group or use private chat with yourself
2. Add your bot to the group
3. Send a message in the group
4. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
5. Look for `"chat":{"id":123456789}` - this is your `TELEGRAM_CHAT_ID`

---

## Local Development

### Step 1: Install Dependencies

```bash
cd /path/to/project
pnpm install
# or npm install
```

### Step 2: Create `.env.local`

Copy the environment setup above and add your credentials.

### Step 3: Run Development Server

```bash
pnpm dev
# or npm run dev
```

The dashboard will be available at: `http://localhost:3000/dashboard`

### Step 4: Test API Connection

Visit: `http://localhost:3000/api/sms-monitor`

If connected, you'll see JSON data with SMS stats.

---

## VPS Deployment

### Step 1: Connect to VPS

```bash
ssh root@your-vps-ip
# or
ssh user@your-vps-ip
```

### Step 2: Install Node.js and npm

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 3: Clone Repository

```bash
# Navigate to apps directory
cd /home/apps
# or /opt/apps

# Clone your repository
git clone https://github.com/yourusername/sms-monitor.git
cd sms-monitor

# Or upload files via SCP
# scp -r /local/path user@vps-ip:/home/apps/sms-monitor
```

### Step 4: Install Dependencies

```bash
cd /home/apps/sms-monitor
pnpm install
# or npm install
```

### Step 5: Create `.env.local` on VPS

```bash
nano .env.local
```

Paste your credentials:
```
BASE_URL=http://your-api-server.com
TOKEN=your_api_token_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

Save: `Ctrl + X`, then `Y`, then `Enter`

### Step 6: Build for Production

```bash
pnpm build
# or npm run build
```

### Step 7: Install PM2 (Process Manager)

```bash
npm install -g pm2
```

### Step 8: Start with PM2

```bash
pm2 start npm --name "sms-monitor" -- start

# Save PM2 config to restart on reboot
pm2 startup
pm2 save
```

### Step 9: Setup Nginx Reverse Proxy

```bash
# Install Nginx
apt install -y nginx

# Create config
nano /etc/nginx/sites-available/sms-monitor
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Save and enable:
```bash
ln -s /etc/nginx/sites-available/sms-monitor /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 10: Setup SSL (HTTPS)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com

# Auto-renewal is automatically configured
```

---

## Production URL

Your SMS Monitor Dashboard will be available at:

```
https://your-domain.com/dashboard
```

---

## Monitoring and Logs

### View Real-time Logs

```bash
pm2 logs sms-monitor
```

### View All PM2 Processes

```bash
pm2 list
```

### Monitor Performance

```bash
pm2 monit
```

### View Nginx Logs

```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

---

## Telegram Notifications

When new CLIs are detected, the dashboard automatically sends Telegram messages like:

```
🆕 NEW CLI DETECTED!
CLI: +1234567890
Time: 12/15/2024, 3:45 PM
```

---

## Troubleshooting

### Issue: "Cannot connect to API"
**Solution:**
- Verify BASE_URL and TOKEN in `.env.local`
- Check if API server is accessible from your VPS
- Test: `curl http://51.77.216.195/crapi/lamix/viewstats?token=YOUR_TOKEN`

### Issue: "Telegram notifications not working"
**Solution:**
- Verify TELEGRAM_BOT_TOKEN is correct
- Check TELEGRAM_CHAT_ID is valid
- Bot must be added to the chat/group
- Test: `https://api.telegram.org/bot<TOKEN>/getMe`

### Issue: "Dashboard shows 0 SMS"
**Solution:**
- API endpoint might be returning different data format
- Check `/api/sms-monitor` response for errors
- Verify token has valid permissions
- Check Nginx logs: `tail -f /var/log/nginx/error.log`

### Issue: "Port 3000 already in use"
**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PM2_HOME=~/.pm2 PORT=3001 pm2 start npm -- start
```

---

## Backup and Maintenance

### Backup Configuration

```bash
# Backup .env.local
cp /home/apps/sms-monitor/.env.local /backups/.env.local.backup

# Backup entire app
tar -czf sms-monitor-backup-$(date +%Y%m%d).tar.gz /home/apps/sms-monitor/
```

### Update Dashboard

```bash
cd /home/apps/sms-monitor
git pull origin main
pnpm install
pnpm build
pm2 restart sms-monitor
```

---

## Performance Optimization

### Increase Data Fetch Interval

Edit `components/advanced-sms-dashboard.tsx`:

```typescript
// Change from 3000ms to 5000ms (5 seconds)
const interval = setInterval(fetchData, 5000);
```

### Memory Usage

```bash
# Check memory usage
free -h

# Monitor with PM2
pm2 monit
```

---

## Security Best Practices

1. **Never commit `.env.local` to Git**
   ```bash
   echo ".env.local" >> .gitignore
   ```

2. **Use HTTPS only** (SSL configured above)

3. **Restrict access if needed:**
   ```nginx
   location / {
       allow YOUR_IP;
       deny all;
   }
   ```

4. **Update Node.js regularly:**
   ```bash
   npm install -g n
   n latest
   ```

---

## Support

For issues or questions:
1. Check logs: `pm2 logs sms-monitor`
2. Verify credentials in `.env.local`
3. Test API endpoint directly: `curl http://BASE_URL/ENDPOINT?token=TOKEN`
4. Check Telegram bot permissions

---

**Happy monitoring! 📊**
