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