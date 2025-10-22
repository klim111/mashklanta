# מדריך התקנה והפעלה של שרת WebSocket

## סקירה כללית

שרת WebSocket זה מספק תקשורת בזמן אמת עבור מערכת שיחות הוידאו. הוא משתמש ב-Socket.IO לניהול חיבורים ו-WebRTC signaling.

## התקנה

### 1. התקנת תלויות

```bash
# העתק את קובץ ה-package.json
cp websocket-package.json package.json

# התקן תלויות
npm install
```

### 2. התקנת PM2 (אופציונלי)

```bash
# התקן PM2 גלובלית
npm install -g pm2

# או התקן מקומית
npm install pm2
```

## הפעלה

### פיתוח (Development)

```bash
# הפעלה עם nodemon (אוטומטית restart)
npm run dev

# או הפעלה רגילה
npm start
```

### פרודקשן (Production)

#### עם PM2 (מומלץ)

```bash
# הפעלה עם PM2
pm2 start ecosystem.config.js

# צפייה בלוגים
pm2 logs websocket-server

# סטטוס
pm2 status

# עצירה
pm2 stop websocket-server

# הפעלה מחדש
pm2 restart websocket-server
```

#### ללא PM2

```bash
# הפעלה רגילה
npm start

# או עם nohup
nohup npm start > websocket.log 2>&1 &
```

## הגדרות

### משתני סביבה

```bash
# יצירת קובץ .env
NODE_ENV=production
WEBSOCKET_PORT=3001
```

### הגדרת Firewall

```bash
# פתיחת פורט 3001
sudo ufw allow 3001
```

### הגדרת Nginx (אופציונלי)

```nginx
# /etc/nginx/sites-available/websocket
server {
    listen 80;
    server_name your-domain.com;

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## בדיקת תקינות

### Health Check

```bash
# בדיקת סטטוס השרת
curl http://localhost:3001/health

# תגובה צפויה:
{
  "status": "ok",
  "activeCalls": 0,
  "uptime": 123.456
}
```

### בדיקת Call

```bash
# בדיקת מידע על שיחה ספציפית
curl http://localhost:3001/call/call_1234567890_abcdef

# תגובה צפויה:
{
  "callId": "call_1234567890_abcdef",
  "participants": [],
  "messageCount": 0,
  "isActive": false
}
```

## לוגים

### PM2 Logs

```bash
# צפייה בלוגים בזמן אמת
pm2 logs websocket-server

# לוגים אחרונים
pm2 logs websocket-server --lines 100

# ניקוי לוגים
pm2 flush websocket-server
```

### קבצי לוג

- `./logs/websocket-error.log` - שגיאות
- `./logs/websocket-out.log` - פלט רגיל
- `./logs/websocket-combined.log` - כל הלוגים

## פתרון בעיות

### בעיות נפוצות

1. **פורט תפוס**
   ```bash
   # בדיקת תהליכים על הפורט
   sudo lsof -i :3001
   
   # הריגת תהליך
   sudo kill -9 <PID>
   ```

2. **חיבור נכשל**
   ```bash
   # בדיקת חיבור
   telnet localhost 3001
   
   # בדיקת firewall
   sudo ufw status
   ```

3. **זיכרון גבוה**
   ```bash
   # הפעלה מחדש
   pm2 restart websocket-server
   
   # או הגדרת הגבלת זיכרון
   pm2 start ecosystem.config.js --max-memory-restart 500M
   ```

### דיבוג

```bash
# הפעלה עם debug mode
DEBUG=socket.io* npm start

# או עם PM2
pm2 start websocket-server.js --name websocket-debug --node-args="--inspect"
```

## אבטחה

### HTTPS/WSS

```javascript
// websocket-server.js
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

const server = https.createServer(options, app);
```

### CORS

```javascript
// עדכון CORS בשרת
const io = socketIo(server, {
  cors: {
    origin: [
      "https://your-domain.com",
      "https://www.your-domain.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

## ניטור

### עם PM2

```bash
# ניטור בזמן אמת
pm2 monit

# מידע מפורט
pm2 show websocket-server
```

### עם systemd (אלטרנטיבה)

```bash
# יצירת service file
sudo nano /etc/systemd/system/websocket-server.service

[Unit]
Description=WebSocket Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/websocket-server
ExecStart=/usr/bin/node websocket-server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

# הפעלה
sudo systemctl enable websocket-server
sudo systemctl start websocket-server
```

## עדכונים

```bash
# עדכון קוד
git pull origin main

# הפעלה מחדש
pm2 restart websocket-server

# או עם PM2 reload (zero-downtime)
pm2 reload websocket-server
```

## גיבוי

```bash
# גיבוי קוד
tar -czf websocket-backup-$(date +%Y%m%d).tar.gz .

# גיבוי לוגים
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

## סיכום

שרת WebSocket זה מספק תשתית יציבה ואמינה לתקשורת בזמן אמת במערכת שיחות הוידאו. עם PM2, הוא יכול לרוץ ברקע עם restart אוטומטי וניטור מתקדם.

לשאלות או בעיות, בדוק את הלוגים או צור קשר עם צוות הפיתוח.
