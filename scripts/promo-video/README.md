# סרטון התדמית של דף הבית

הסרטון שמתחת לאנימציה בדף הבית (`public/promo/mashkalanta-promo.mp4`) מוקלט מהממשק
האמיתי, עם נתוני ההדגמה בלבד:

- **התסריט**: `src/demo/catalog/flows/promo.ts` — הצעדים, הכתוביות וכמה זמן כל כתובית
  נשארת על המסך (`duration`). ההדגמה `promo` אינה מוצגת למבקרים.
- **ההקלטה**: `record.mjs` — מריץ את התסריט בדפדפן, מסתיר את פקדי ההדגמה, מציג כתוביות
  גדולות וכרטיס סיום, ומצלם. הפעולות (הקלדה, לחיצות, ניווט) מואצות פי `SPEED`
  (ברירת מחדל 2.8), וזמן הקריאה של הכתוביות נשמר.
- **נתוני השוק**: `market-snapshot.json` — נתוני בנק ישראל כפי שהוצגו בדאשבורד
  בדף הבית ב-26.9.2026, כדי שההקלטה לא תלויה ברשת. כדאי לעדכן לפני הקלטה חדשה.

## הקלטה מחדש

```bash
npx next build && npx next start &          # האתר על http://localhost:3000
npm i --no-save playwright-core@1.56.1
node scripts/promo-video/record.mjs          # FFMPEG=/path/to/ffmpeg CHROMIUM=/path/to/chrome לפי הצורך
```

התוצרים נכתבים ל-`public/promo/`: הסרטון, תמונת הפתיחה וקובץ הכתוביות (VTT).

## קריינות

`NARRATION=voice.mp3 node scripts/promo-video/record.mjs` משלב קובץ שמע בסרטון.
הזמנים של כל כתובית נמצאים ב-`public/promo/mashkalanta-promo.he.vtt`, ולפיהם מקליטים
או מפיקים את הקריינות.
