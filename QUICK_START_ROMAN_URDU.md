# SMS Monitor Dashboard - Quick Start Guide (Roman Urdu)

## 🎯 Ye Dashboard Kya Hai?

Professional SMS monitoring system jo:
- Real-time SMS data dikhata hai
- New CLIs automatically detect karta hai
- Telegram par notifications bhejta hai
- Professional table format mein organized hai

---

## 📊 Dashboard Features

### 1. **Main Table (SMS Log)**
```
TIME | RANGE | NUMBER | MY PAYOUT | AGENT PAYOUT | CLIENT | CLI | CONTENT
```
- **TIME** - Message kab aya (timestamp)
- **RANGE** - Country/Region (jaise: Tanzania LX 05Mar)
- **NUMBER** - Phone number jisse message aya
- **MY PAYOUT** - Aapko kitna paise milenge
- **AGENT PAYOUT** - Agent ko kitna paise
- **CLIENT** - Kaun-si company bhej rahi hai
- **CLI** - Caller Line ID (jaise: Bolt, AUTHMSG)
- **CONTENT** - Message ki content

### 2. **NEW CLIs DETECTED Section**
```
⚠️ NEW CLIs DETECTED!
┌─────────────────────┐  ┌─────────────────────┐
│     Bolt            │  │    AUTHMSG          │
│ First: 14:19:20     │  │ First: 14:17:03     │
│ 5 SMS               │  │ 3 SMS               │
└─────────────────────┘  └─────────────────────┘
```
- Naye CLIs automatically highlight hote hain
- First detection time dikhta hai
- Total SMS count har CLI ka

### 3. **Telegram Settings Panel**
```
🔧 Telegram Notifications
┌─────────────────────────────────────────┐
│ Bot Token (from @BotFather)             │
│ [____________________________________]  │
│                                         │
│ Chat ID (your Telegram user ID)         │
│ [____________________________________]  │
│                                         │
│ [Save Telegram Config] Button          │
└─────────────────────────────────────────┘
```

### 4. **Footer Stats**
- Total SMS
- Total My Payout
- New CLIs Count
- Telegram Status

---

## 🚀 Local Testing (Vercel Preview)

1. **Preview mein dashboard dekho:**
   - URL bar mein `/dashboard` likho
   
2. **Test Data Dikhega:**
   - 3 SMS messages
   - 2 New CLIs (Bolt, AUTHMSG)
   - All features working

3. **Settings test karo:**
   - ⚙️ button click karo
   - Telegram settings panel khulega
   - (Local testing mein actual Telegram message nahi ayega, production mein ayega)

---

## 📱 Telegram Setup (Zaroori!)

### Step 1: Bot Token Get Karo
1. Telegram mein `@BotFather` search karo
2. `/newbot` likho
3. Bot ka naam likho (jaise "SMS Monitor")
4. Bot ka username likho (jaise "sms_monitor_bot_123")
5. **Token mil jayega** - copy karo

**Example token:**
```
123456789:ABCDefGHIjklmnoPQRStuVWXyZ1234567890
```

### Step 2: Apna Telegram User ID Get Karo
1. Telegram mein `@userinfobot` search karo
2. `/start` likho
3. Apna User ID dikhega - **copy karo**

**Example ID:**
```
987654321
```

---

## 💻 VPS par Deploy Karne ke Steps (Puri Tarah se)

### Pre-requisites
- Ubuntu 20.04 ya 22.04 VPS
- SSH access
- Domain name (optional but recommended)

### Commands (Copy-paste karte rho):

```bash
# 1. SSH se connect karo
ssh root@your-vps-ip

# 2. Node.js install karo
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs npm

# 3. Project clone karo
cd /home
git clone https://github.com/your-username/sms-monitor-dashboard.git
cd sms-monitor-dashboard

# 4. .env.local file banao
nano .env.local
```

**.env.local mein ye likho:**
```env
BASE_URL=http://51.77.216.195
TOKEN=your-api-token-here
TELEGRAM_BOT_TOKEN=123456789:ABCDefGHIjklmnoPQRStuVWXyZ1234567890
TELEGRAM_CHAT_ID=987654321
NODE_ENV=production
PORT=3000
```

**Save: Ctrl+X → Y → Enter**

```bash
# 5. Build karo
npm install
npm run build

# 6. PM2 install karo
npm install -g pm2

# 7. App start karo
pm2 start npm --name "sms-monitor" -- start

# 8. Auto-restart on reboot
pm2 startup
pm2 save

# 9. Nginx install karo
apt-get install -y nginx

# 10. Nginx config banao
nano /etc/nginx/sites-available/sms-monitor
```

**Ye paste karo:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

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

**Save: Ctrl+X → Y → Enter**

```bash
# 11. Enable Nginx
ln -s /etc/nginx/sites-available/sms-monitor /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# 12. SSL certificate (HTTPS)
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

## ✅ After Deployment

1. **Dashboard access karo:**
   ```
   https://your-domain.com/dashboard
   ```

2. **Telegram Config set karo:**
   - Dashboard mein ⚙️ Settings button click karo
   - Bot Token paste karo
   - Chat ID paste karo
   - "Save Telegram Config" button click karo

3. **Test karo:**
   - Bot ko Telegram mein `/start` likho
   - New SMS detect hone par Telegram message ayega

---

## 🔍 Monitoring Commands

**Status check:**
```bash
pm2 status
```

**Logs dekho:**
```bash
pm2 logs sms-monitor
```

**Restart karo:**
```bash
pm2 restart sms-monitor
```

**Stop karo:**
```bash
pm2 stop sms-monitor
```

---

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot GET /dashboard" | `pm2 restart sms-monitor` |
| "Cannot connect to API" | Check BASE_URL aur TOKEN sahi hain |
| "Telegram not working" | Settings panel mein Bot Token aur Chat ID verify karo |
| "Port 3000 in use" | `lsof -i :3000` then `kill -9 <PID>` |

---

## 📞 Support

Agar problem ho to:
1. Logs check karo: `pm2 logs sms-monitor`
2. Nginx error log: `tail -f /var/log/nginx/error.log`
3. Test API: `curl http://your-vps-ip:3000/api/sms-monitor`

---

## 🎉 You're Done!

Ab aapka SMS Monitor Dashboard fully operational hai with:
- ✅ Real-time SMS tracking
- ✅ New CLI detection
- ✅ Telegram notifications
- ✅ Professional interface
- ✅ 24/7 monitoring

Enjoy! 🚀
