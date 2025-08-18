# משכלתנא - פלטפורמת ייעוץ משכנתאות חכמה

פלטפורמה מתקדמת לייעוץ משכנתאות עם כלים אינטראקטיביים וחישובים מדויקים.

## טכנולוגיות

- **Next.js 14** - React Framework
- **TypeScript** - Type Safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible Components
- **Framer Motion** - Animations
- **Recharts** - Data Visualization

## התקנה

```bash
npm install
```

## הרצה

```bash
npm run dev
```

האפליקציה תיפתח ב-[http://localhost:3000](http://localhost:3000).

## בנייה

```bash
npm run build
```

## תכונות

- 🏠 **מחשבון משכנתא** - חישוב תשלומים חודשיים ולוח סילוקין
- 📊 **מחשבון הון עצמי** - ניהול הוצאות וחישוב LTV
- 📈 **סטטיסטיקות** - גרפים ותרשימים של שוק הנדל"ן
- 🎯 **הכוונה אישית** - בחירת מסלול מותאם אישית
- 📱 **רספונסיבי** - עובד על כל המכשירים
- 🌐 **תמיכה בעברית** - RTL מלא

## מבנה הפרויקט

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root Layout
│   ├── page.tsx           # Home Page
│   └── globals.css        # Global Styles
├── components/             # React Components
│   ├── ui/                # UI Components
│   └── mortgagecalculator.tsx
└── lib/                   # Utilities
    └── utils.ts
``` 

## Server-side setup

### Quick Setup (Recommended)
Run the automated setup script:
```bash
./scripts/setup-env.sh
```

### Manual Setup
1. Copy `.env.example` to `.env.local` and fill values (DB, Redis, S3, BOI API, NEXTAUTH_SECRET, Google Vision).
2. Generate a secure NEXTAUTH_SECRET:
   ```bash
   openssl rand -base64 32
   ```
3. Install dependencies and generate Prisma client:

```bash
npm install
npm run prisma:generate
```

3. Run initial migration (creates tables):

```bash
npm run prisma:migrate -- --name init
```

4. Start dev server:

```bash
npm run dev
```

### API endpoints
- `GET /api/boi/rates?from=YYYY-MM-DD&to=YYYY-MM-DD` – מחזיר ריביות (עם קאש ב-Redis)
- `POST /api/uploads/presign` – קבלת כתובת חתומה ל-S3 להעלאה
- `POST /api/documents` – יצירת מסמך + OCR + parsing ל-JSON
- `GET /api/documents/:id` – סטטוס/JSON של מסמך
- `GET/POST /api/calculations` – שליפת/שמירת חישובים למשתמש
- `GET/POST /api/auth/*` – Auth.js (NextAuth)

Notes:
- OCR משתמש ב-`@google-cloud/vision`. הקפד להגדיר `GOOGLE_APPLICATION_CREDENTIALS` או קונפיג חלופית.
- העלאות מתבצעות ישירות ל-S3 עם presigned URL.
- `BOI_RATES_URL` צריך להפנות ל-endpoint של בנק ישראל לפי הצורך. 