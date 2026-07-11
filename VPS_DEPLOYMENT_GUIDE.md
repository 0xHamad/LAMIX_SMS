# SMS Monitor Dashboard - VPS Deployment Guide (Roman Urdu)

## 🚀 VPS par Deploy Karne ke Steps

### **Step 1: Telegram Bot Setup (پہلے کریں)**

Telegram bot banane ke liye:

1. **@BotFather ko message karo** - Telegram mein `@BotFather` search karo
2. `/start` likho
3. `/newbot` likho
4. **Bot ka naam** dalo (jaise: "SMS Monitor Bot")
5. **Bot ka username** dalo (jaise: "sms_monitor_bot_xyz")
6. **Bot token** milega - ye copy karo: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`

**Apna Telegram User ID nikalno ke liye:**

1. `@userinfobot` ko Telegram mein message karo
2. `/start` likho
3. Apna User ID mil jayega (jaise: `987654321`)

---

### **Step 2: VPS Setup (Ubuntu 20.04 ya 22.04)**

**SSH se connect karo:**
```bash
ssh root@your-vps-ip
# Password enter karo ya SSH key use karo
```

**Node.js install karo:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs npm
node --version  # Check: v18.x.x
```

**Git install karo:**
```bash
apt-get install -y git
```

**Project clone karo:**
```bash
cd /home
git clone https://github.com/your-username/sms-monitor-dashboard.git
cd sms-monitor-dashboard
```

---

### **Step 3: Environment Variables Setup**

**.env.local file banao:**
```bash
nano .env.local
```

**Ye data paste karo:**
```env
# API Credentials
BASE_URL=http://51.77.216.195
TOKEN=your-api-token-here

# Telegram Configuration
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=987654321

# App Settings
NODE_ENV=production
PORT=3000
```

- `BASE_URL` = Aapka SMS API server ka URL
- `TOKEN` = Aapka API token
- `TELEGRAM_BOT_TOKEN` = @BotFather se milne wala token
- `TELEGRAM_CHAT_ID` = Apna Telegram User ID

**Save karo:** `Ctrl + X` → `Y` → `Enter`

---

### **Step 4: Dependencies Install aur Build**

```bash
npm install
# ya agar pnpm use karte ho:
npm install -g pnpm
pnpm install

# Build karo
npm run build
```

---

### **Step 5: PM2 Setup (Auto Restart ke liye)**

**PM2 install karo:**
```bash
npm install -g pm2
```

**PM2 start karo:**
```bash
pm2 start npm --name "sms-monitor" -- start
```

**Auto-restart on reboot:**
```bash
pm2 startup
pm2 save
```

**Check status:**
```bash
pm2 status
pm2 logs sms-monitor
```

---

### **Step 6: Nginx Reverse Proxy Setup**

**Nginx install karo:**
```bash
apt-get install -y nginx
```

**Nginx config banao:**
```bash
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

**Config enable karo:**
```bash
ln -s /etc/nginx/sites-available/sms-monitor /etc/nginx/sites-enabled/
nginx -t  # Check if config is correct
systemctl restart nginx
```

---

### **Step 7: SSL Certificate (HTTPS ke liye)**

**Certbot install karo:**
```bash
apt-get install -y certbot python3-certbot-nginx
```

**SSL certificate generate karo:**
```bash
certbot --nginx -d your-domain.com
```

Follow the instructions aur email enter karo.

---

### **Step 8: Telegram Notifications Configure Karo**

Dashboard mein Settings button par click karo:

1. **Bot Token paste karo:** `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
2. **Chat ID paste karo:** `987654321`
3. **"Save Telegram Config"** button click karo

Ab jab bhi new CLI detect ho, Telegram par notification ayega!

---

### **Step 9: Dashboard Access Karo**

Browser mein jao:
```
https://your-domain.com/dashboard
```

ya direct IP:
```
http://your-vps-ip:3000/dashboard
```

---

## 📋 Monitoring aur Maintenance

**Logs dekhne ke liye:**
```bash
pm2 logs sms-monitor
```

**App restart karne ke liye:**
```bash
pm2 restart sms-monitor
```

**Nginx logs:**
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🔧 Troubleshooting

### **"Cannot GET /dashboard"**
- Check: `pm2 status` - app running hai?
- Check: Nginx config sahi hai?
- Solution: `pm2 restart sms-monitor`

### **"API Connection Failed"**
- Check: `BASE_URL` aur `TOKEN` sahi hain?
- Check: Firewall mein outbound allowed hai?
- Solution: Command run karo: `curl http://51.77.216.195/crapi/lamix/viewstats?token=YOUR_TOKEN`

### **Telegram notifications nahi aa rahe**
- Check: Bot Token aur Chat ID sahi hain?
- Test karo: Dashboard mein Settings mein config dekho
- Bot se message karo: `/start`

### **Port 3000 already in use**
```bash
lsof -i :3000
kill -9 <PID>
```

---

## ✅ Final Checklist

```
☐ Telegram Bot banaya aur Token copy kiya
☐ Apna Telegram User ID pata kiya
☐ VPS mein SSH se login ho gaya
☐ Node.js install hua
☐ Project clone aur dependencies installed
☐ .env.local file banai aur credentials daalae
☐ npm run build successful hua
☐ PM2 start hua aur auto-restart set kiya
☐ Nginx configure kiya
☐ SSL certificate generate kiya
☐ Dashboard accessible hai (https://your-domain.com/dashboard)
☐ Telegram notifications test kiye
☐ Logs dekhay - koi errors nahi hain
```

---

## 🎯 Telegram Message Aaye ga Ye Format Mein:

```
🚨 NEW CLI DETECTED! 🚨

CLI: Bolt
First Detected: 2026-07-11 14:19:20
SMS Count: 5
```

Jab bhi naya CLI detect ho tu instantly notification milega!

---

**Koi problem ho to Support check karo ya Logs dekho!**

Good luck! 🚀
