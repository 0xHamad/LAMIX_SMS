# Quick Setup - Real Data SMS Monitor Dashboard

## 🎯 What You Have

- Professional SMS Monitor Dashboard
- Real-time data updates (every 2 seconds)
- Supports all 10 API endpoints (tries all until one works)
- Full message content display (not truncated)
- NEW CLIs detection with Telegram notifications
- Telegram settings configuration
- VPS-ready deployment

---

## ⚡ Local Setup (2 Minutes)

### 1. Create `.env.local` File

In project root, create a file named `.env.local`:

```env
BASE_URL=http://51.77.216.195
TOKEN=YOUR_TOKEN_HERE
```

Replace with your actual credentials.

### 2. Restart Dev Server

```bash
pnpm dev
```

### 3. Open Dashboard

```
http://localhost:3000/dashboard
```

**That's it! Real data will appear.** ✓

---

## 🚀 VPS Deployment (10 Minutes)

### 1. SSH to VPS

```bash
ssh root@YOUR_VPS_IP
```

### 2. Install & Setup

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs npm

# Install pnpm
npm install -g pnpm

# Clone repository (or upload if no Git)
git clone YOUR_REPO
cd sms-monitor

# Install dependencies
pnpm install
pnpm build
```

### 3. Create `.env.local`

```bash
nano .env.local
```

Paste:
```env
BASE_URL=http://51.77.216.195
TOKEN=YOUR_TOKEN_HERE
```

### 4. Start with PM2

```bash
npm install -g pm2
pm2 start npm --name "sms-monitor" -- start
pm2 startup
pm2 save
```

### 5. Setup Nginx (Optional - for Domain)

```bash
apt install -y nginx

nano /etc/nginx/sites-available/sms
```

Paste:
```nginx
server {
    listen 80;
    server_name YOURDOMAIN.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

Enable & restart:
```bash
ln -s /etc/nginx/sites-available/sms /etc/nginx/sites-enabled/
systemctl restart nginx
```

### 6. Setup SSL (For HTTPS)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d YOURDOMAIN.com
```

---

## 📊 What the Dashboard Shows

| Column | Description |
|--------|-------------|
| **TIME** | When SMS was received |
| **RANGE** | Country/Region |
| **NUMBER** | Phone number that sent SMS |
| **MY PAYOUT** | Your earnings |
| **AGENT PAYOUT** | Agent's cut |
| **CLIENT** | SMS service provider |
| **CLI** | SMS sender ID |
| **CONTENT** | Full SMS message (not truncated!) |

**NEW CLIs** - Automatically detected and highlighted in orange

---

## 🔔 Telegram Notifications (Optional)

### Get Bot Token

1. Chat with **@BotFather** on Telegram
2. Send `/newbot`
3. Choose name (e.g., "SMS Monitor Bot")
4. Choose username (e.g., "sms_monitor_bot_123")
5. Copy the token provided

### Get Chat ID

1. Chat with **@userinfobot** on Telegram
2. It will show your User ID

### Add to Dashboard

Click Settings icon (⚙️) in dashboard:
- Paste **Bot Token**
- Paste **Chat ID**
- Click "Save Telegram Config"

Now you'll get notifications whenever a NEW CLI is detected! 🔔

---

## 📋 Supported Endpoints (Auto-tries all)

Dashboard automatically tries these endpoints until one works:

```
/crapi/lamix/viewstats
/crapi/lamix/stats
/crapi/lamix/user
/crapi/lamix/numbers
/crapi/lamix/ranges
/crapi/lamix/balance
/crapi/lamix/dashboard
/crapi/lamix/sms
/crapi/lamix/reports
/crapi/lamix/info
```

---

## ✅ Features

- ✓ Real-time updates every 2 seconds
- ✓ Full SMS content (no truncation)
- ✓ All 10 endpoints supported
- ✓ NEW CLIs auto-detection
- ✓ Telegram notifications
- ✓ Search & filter
- ✓ Copy phone numbers
- ✓ Professional UI
- ✓ Mobile responsive
- ✓ Zero delay live updates

---

## 🆘 Troubleshooting

**"Disconnected" showing?**
- Check `.env.local` exists
- Verify BASE_URL and TOKEN are correct
- API server might be offline

**Dashboard not loading?**
```bash
curl http://localhost:3000/dashboard
```

**Check logs:**
```bash
pm2 logs sms-monitor
```

**Restart:**
```bash
pm2 restart sms-monitor
```

---

**Dashboard is ready! Add your credentials and go live.** 🎯

