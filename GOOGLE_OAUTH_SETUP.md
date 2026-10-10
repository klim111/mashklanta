# התחברות עם Google — הגדרה ופתרון `redirect_uri_mismatch`

## מה גוגל בעצם אומרת

> **Access blocked: This app's request is invalid**
> **Error 400: redirect_uri_mismatch**

זו אינה תקלה בקוד ההתחברות ואינה בעיה בחשבון הגוגל של הגולש. גוגל מקבלת מהשרת
פרמטר `redirect_uri` — הכתובת שאליה היא תחזיר את הגולש אחרי האישור — ומשווה
אותו, **תו בתו**, לרשימת ה-URI שרשומים ב-OAuth Client שלכם. כל הבדל, ולו של
סלאש אחד או `www`, נדחה.

הכתובת שהאפליקציה הזו שולחת היא תמיד:

```
<כתובת האתר>/api/auth/callback/google
```

## בדיקה מהירה: מה השרת שולח בפועל

```
GET https://<כתובת-האתר>/api/auth-diagnostics
```

התשובה כוללת:

| שדה | משמעות |
| --- | --- |
| `configured` | האם `GOOGLE_CLIENT_ID` ו-`GOOGLE_CLIENT_SECRET` הגיעו לדפלוי הזה |
| `expectedRedirectUri` | ה-URI שצריך להיות רשום ב-Google Cloud Console |
| `redirectUri` | ה-URI שיישלח בפועל אם ההתחברות תתחיל מהכתובת שממנה נטענה הבקשה |
| `originMatches` | `false` פירושו שההתחברות מהכתובת הזו תיכשל |
| `originSource` | `request-host` ב-Vercel (הכתובת נגזרת מהדפדפן), אחרת `NEXTAUTH_URL` |
| `redirectUrisToRegister` | כל ה-URI שכדאי לרשום בגוגל |

## ההגדרה בגוגל

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) →
   **APIs & Services → Credentials** → ה-**OAuth 2.0 Client ID** של האתר
   (סוג **Web application**).
2. תחת **Authorized redirect URIs** הוסיפו שורה לכל כתובת שממנה מתחברים:

   ```
   https://<הדומיין-שלכם>/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```

   אם האתר נגיש גם עם `www` וגם בלעדיו — רשמו את שניהם, או הפנו את אחד לשני.
3. תחת **Authorized JavaScript origins** הוסיפו את הדומיינים עצמם, בלי נתיב:

   ```
   https://<הדומיין-שלכם>
   http://localhost:3000
   ```
4. **Save**. שינויים בגוגל נכנסים לתוקף תוך דקות ספורות (לעיתים עד כשעה).
5. אם מסך ההסכמה (OAuth consent screen) במצב **Testing**, הוסיפו את כתובת
   המייל שמתחברת תחת **Test users** — אחרת תתקבל שגיאת `access_denied`.

## ההגדרה בשרת

| משתנה | ערך |
| --- | --- |
| `NEXTAUTH_URL` | כתובת האתר בדיוק כפי שהיא בדפדפן: `https://example.com`. בלי סלאש בסוף, בלי מרכאות, עם אותו פרוטוקול ואותו `www` |
| `NEXTAUTH_SECRET` | מחרוזת אקראית (`openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` | מה-OAuth Client |
| `GOOGLE_CLIENT_SECRET` | מה-OAuth Client |

בממשקים של ספקי אחסון (Vercel, Railway, Render) **אין להקיף את הערכים
במרכאות** — בניגוד לקובץ `.env`, המרכאות נשמרות כחלק מהערך. האפליקציה מנקה
מרכאות, רווחים וסלאש מיותר בעצמה, אבל עדיף להזין ערך נקי מלכתחילה.

אחרי שינוי משתני סביבה צריך **Redeploy** — משתנים נטענים בזמן הפעלת הדפלוי.

## הסיבות הנפוצות, לפי סדר השכיחות

1. **ה-URI לא רשום בגוגל בכלל** — רשומה שם רק הכתובת של `localhost`, או של
   דומיין ישן.
2. **`www` מול הדומיין החשוף** — האתר נטען מ-`https://www.example.com` בעוד
   שרשום `https://example.com`.
3. **דפלוי Preview ב-Vercel** — ב-Vercel כתובת הבסיס נגזרת מהדומיין שבדפדפן,
   וכתובות ה-Preview (`...-git-branch-....vercel.app`) משתנות בכל דפלוי ולעולם
   אינן רשומות בגוגל. כפתור ההתחברות באפליקציה מזהה את המצב הזה ומעביר את
   הגולש לכתובת הרשמית (`NEXTAUTH_URL`) לפני שהוא פונה לגוגל.
4. **`http` מול `https`** — `NEXTAUTH_URL` שנשאר `http://localhost:3000`
   בפרודקשן, או פרוקסי שמעביר `x-forwarded-proto: http`.
5. **סלאש בסוף או מרכאות ב-`NEXTAUTH_URL`** — `https://example.com/` מייצר
   `https://example.com//api/auth/callback/google`.
6. **OAuth Client שגוי** — יש כמה Clients בפרויקט, וה-`GOOGLE_CLIENT_ID`
   שבשרת שייך לאחד בעוד שה-URI נרשם באחר. ההשוואה היא לפי ה-Client ID.

## אחרי התיקון

לאחר שמירת ה-URI בגוגל ו-Redeploy של השרת, `GET /api/auth-diagnostics` צריך
להחזיר `originMatches: true`, וכפתור "התחברות עם Google" אמור להשלים את
ההתחברות. אם מתקבלת שגיאה אחרת (למשל `invalid_client`) — היא מצביעה על
המפתחות עצמם, לא על ה-URI.
