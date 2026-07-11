# SMS Monitor Dashboard - Real Data Setup Guide

## Roman Urdu Mein Samjhiye

Aap ka dashboard ab **REAL DATA** dikhayega agar aap sahi credentials dein. Ye guide follow kro:

---

## 1. Local Development Mein Real Data Dekhe

### Step 1: `.env.local` File Banao

Project root mein ek file banao: `.env.local`

```bash
# Windows (Command Prompt)
copy .env.example .env.local

# Mac/Linux
cp .env.example .env.local
```

### Step 2: Apne Credentials Fill Kro

`.env.local` file ko text editor mein kholo aur fill kro:

```env
BASE_URL=http://51.77.216.195
TOKEN=aXZ0gVZXgoCAc2loX4iFSl9mVWB8hVdgdFVhW3SVZXM=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

**Replace kro:**
- `http://51.77.216.195` → Apka actual API URL
- `aXZ0gVZXgoCAc2loX4iFSl9mVWB8hVdgdFVhW3SVZXM=` → Apka actual TOKEN

### Step 3: Dev Server Restart Kro

```bash
pnpm dev
```

**Browser kholo:** `http://localhost:3000/dashboard`

Ab **REAL SMS DATA** dikhe ga! Updates har 2 seconds mein automatically hogi.

---

## 2. VPS Mein Deploy Karnay Ke Liye

### Step 1: VPS Par SSH Connection

```bash
ssh root@YOUR_VPS_IP
```

### Step 2: Node.js Install Kro

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
```

### Step 3: Project Clone Kro

Agar GitHub repo hai:
```bash
git clone https://github.com/YOUR_REPO/sms-monitor.git
cd sms-monitor
```

Ya local se download kro aur upload kro (zip/SFTP).

### Step 4: Dependencies Install Kro

```bash
npm install -g pnpm
pnpm install
```

### Step 5: `.env.local` File Banao

```bash
nano .env.local
```

Apna details likho:

```env
BASE_URL=http://51.77.216.195
TOKEN=aXZ0gVZXgoCAc2loX4iFSl9mVWB8hVdgdFVhW3SVZXM=
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
```

**Ctrl+X** → **Y** → **Enter** (save karnay ke liye)

### Step 6: Build Kro

```bash
pnpm build
```

### Step 7: PM2 Setup Kro (Auto-Restart)

```bash
npm install -g pm2
pm2 start npm --name "sms-monitor" -- start
pm2 startup
pm2 save
```

### Step 8: Nginx Setup Kro (Website)

```bash
apt install -y nginx
```

Nginx config file banao:

```bash
nano /etc/nginx/sites-available/sms-monitor
```

Ye paste kro:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Replace kro:** `YOUR_DOMAIN.com` → Apna domain

Enable kro:

```bash
ln -s /etc/nginx/sites-available/sms-monitor /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 9: SSL Certificate Lagao (HTTPS)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d YOUR_DOMAIN.com
```

### Step 10: Telegram Notifications Setup (Optional)

Telegram par **@BotFather** ko message kro: `/newbot`

- Bot name likho (e.g., "SMS Monitor Bot")
- Bot username likho (e.g., "sms_monitor_bot_123")

Bot ke TOKEN ko .env.local mein paste kro.

Apna **Chat ID** pane ke liye:
- **@userinfobot** ko message kro
- Ye apka user ID deega

`.env.local` mein fill kro:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklmnoPQRstuvWXYZ1234567
TELEGRAM_CHAT_ID=987654321
```

---

## 3. Dashboard Ko Access Kro

- **Local:** `http://localhost:3000/dashboard`
- **VPS (HTTP):** `http://YOUR_VPS_IP:3000/dashboard`
- **VPS (HTTPS):** `https://YOUR_DOMAIN.com/dashboard`

---

## 4. Real-Time Data Updates

Dashboard **automatically** update hoga har 2 seconds:

✓ **New CLIs** automatically detect hogi  
✓ **Telegram notifications** bheje gi (agar setup kiya)  
✓ **Full SMS content** dikhegi (truncated nahi)  
✓ **All columns show hogi:** TIME, RANGE, NUMBER, MY PAYOUT, AGENT PAYOUT, CLIENT, CLI, CONTENT  

---

## 5. Monitoring & Logs

### VPS mein Status Check Kro

```bash
pm2 status
pm2 logs sms-monitor
```

### Nginx Logs Check Kro

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### API Response Check Kro

```bash
curl "http://localhost:3000/api/sms-monitor"
```

---

## 6. Troubleshooting

### "Disconnected" Show Ho Raha Hai?

**Check kro:**

1. `.env.local` file hai?
```bash
cat .env.local
```

2. BASE_URL aur TOKEN sahi hai?
```bash
curl "http://51.77.216.195/crapi/lamix/viewstats?token=YOUR_TOKEN"
```

3. API server accessible hai?
```bash
ping 51.77.216.195
```

### PM2 Nahi Chal Raha?

```bash
pm2 restart sms-monitor
pm2 logs sms-monitor
```

### Nginx Error?

```bash
nginx -t
systemctl reload nginx
```

---

**Dashboard ab LIVE hai aur real data dikhayega!** 🚀

