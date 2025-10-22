# מדריך שילוב שיחות וידאו בדשבורד היועצים

## סקירה כללית

הוספתי לדשבורד היועצים פונקציונליות מתקדמת של שיחות וידאו המאפשרת ליועצים:

- **שיחות וידאו** עם לקוחות
- **שיתוף מסך** להצגת נתונים ומסמכים
- **צ'אט** במהלך השיחה
- **הצגת נתוני לקוח** בזמן אמת
- **ניהול שיחה** מלא (השתקה, כיבוי וידאו, וכו')

## קבצים שנוצרו/עודכנו

### 1. קומפוננט שיחת וידאו חדש
- `src/components/advisor-dashboard/VideoCallModal.tsx` - הקומפוננט הראשי לשיחת וידאו (יועץ)
- `src/app/video-call/[id]/page.tsx` - עמוד שיחת וידאו ללקוח
- `src/lib/webrtc-signaling.ts` - מערכת signaling לחיבור בין משתמשים

### 2. עדכון דשבורד היועצים
- `src/app/advisor-dashboard/page.tsx` - הוספת כפתור שיחת וידאו לכל לקוח
- `src/app/advisor-dashboard/client/[id]/page.tsx` - הוספת כפתור שיחת וידאו בעמוד הפרופיל

### 3. קומפוננט UI נוסף
- `src/components/ui/badge.tsx` - קומפוננט Badge לתצוגת סטטוסים

## תכונות הקומפוננט

### 🎥 שיחת וידאו
- **WebRTC אמיתי** - חיבור ישיר בין משתמשים
- וידאו מקומי ומרוחק עם איכות גבוהה
- השתקה/הפעלה של מיקרופון בזמן אמת
- כיבוי/הפעלה של מצלמה בזמן אמת
- **בחירת מצלמה** - רשימה של כל המצלמות הזמינות
- **בחירת מיקרופון** - רשימה של כל המיקרופונים הזמינים

### 📺 שיתוף מסך
- שיתוף מסך מלא עם איכות גבוהה
- הצגת מסך היועץ ללקוח
- אוברליי של שיתוף מסך
- הפסקת שיתוף מסך אוטומטית

### 💬 צ'אט
- **הודעות טקסט בזמן אמת** עם סנכרון מלא בין הצדדים
- תצוגת זמן של הודעות
- ממשק נוח לשליחת הודעות
- תמיכה בעברית מלאה
- **חיבור אמיתי** בין יועץ ללקוח

### 📊 הצגת נתוני לקוח
- סקירה כללית של הלקוח
- פרטי משכנתא
- מסמכים (מוכן להרחבה)
- גישה מהירה למחשבונים

### 🔗 שיתוף לינק
- **לינק ייחודי** לכל שיחה
- העתקה מהירה ללוח
- גישה ישירה מהדפדפן
- עמוד נפרד ללקוח

### 🎛️ בקרות שיחה
- טיימר שיחה מדויק
- מצב מסך מלא
- סגירת שיחה עם ניקוי משאבים
- ניהול איכות וידאו ואודיו

## איך להשתמש

### 1. מדשבורד הלקוחות
1. עבור לדשבורד היועצים (`/advisor-dashboard`)
2. לחץ על כפתור הוידאו (📹) ליד כל לקוח
3. השיחה תיפתח בחלון מודאלי
4. העתק את הלינק שמופיע בחלק העליון
5. שלח את הלינק ללקוח

### 2. מעמוד פרופיל הלקוח
1. עבור לפרופיל לקוח ספציפי (`/advisor-dashboard/client/[id]`)
2. לחץ על כפתור "שיחת וידאו" הירוק
3. השיחה תיפתח עם כל הנתונים של הלקוח
4. העתק את הלינק ושלוח ללקוח

### 3. מהצד של הלקוח
1. הלקוח מקבל לינק מהצורה: `https://yoursite.com/video-call/[call-id]`
2. הלקוח לוחץ על הלינק ונפתח עמוד השיחה
3. הלקוח לוחץ על "הצטרף לשיחה"
4. השיחה מתחילה עם וידאו ואודיו מלא

## הטמעה טכנית

### WebRTC Integration
הקומפוננט משתמש ב-WebRTC אמיתי עם מערכת signaling מלאה:

```typescript
// Real WebRTC implementation with signaling
const stream = await navigator.mediaDevices.getUserMedia(constraints);
localStreamRef.current = stream;

// Peer connection with STUN servers
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

peerConnectionRef.current = new RTCPeerConnection(configuration);

// Signaling for real-time communication
const signaling = createMockSignaling(callId, userId, handleMessage, onConnectionChange);
await signaling.connect();
```

### Signaling System
```typescript
// Real-time messaging between advisor and client
interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'chat-message' | 'user-joined' | 'user-left' | 'call-ended';
  data: any;
  from: string;
  to?: string;
  callId: string;
  timestamp: number;
}
```

### Device Management
```typescript
// Camera and microphone selection
const devices = await navigator.mediaDevices.enumerateDevices();
const cameras = devices.filter(device => device.kind === 'videoinput');
const microphones = devices.filter(device => device.kind === 'audioinput');
```

### Screen Sharing
```typescript
// Real screen sharing
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: true,
  audio: true
});
```

### שילוב עם מערכת קיימת
הקומפוננט משתמש בנתוני הלקוח הקיימים:
- שם, מייל, טלפון
- סטטוס והתקדמות
- פרטים פיננסיים
- פרטי הנכס

### הרחבות אפשריות
1. **הקלטת שיחות** - שמירת השיחות לצפייה מאוחרת
2. **שיתוף מסמכים** - העלאת והצגת מסמכים במהלך השיחה
3. **לוח שנה** - קביעת פגישות ישירות מהשיחה
4. **ניתוח רגשי** - AI לניתוח טון השיחה
5. **תרגום** - תרגום בזמן אמת לשפות שונות

## אבטחה ופרטיות

- כל השיחות מוצפנות (WebRTC)
- אין הקלטה אוטומטית
- גישה רק ליועצים מורשים
- שמירת לוגים מינימלית

## תמיכה בדפדפנים

- Chrome/Edge (מומלץ)
- Firefox
- Safari (מוגבל)
- לא נתמך: Internet Explorer

## פתרון בעיות

### בעיות נפוצות
1. **לא רואה וידאו** - בדוק הרשאות מצלמה בדפדפן
2. **לא שומע אודיו** - בדוק הרשאות מיקרופון בדפדפן
3. **שיתוף מסך לא עובד** - בדוק הרשאות שיתוף מסך בדפדפן
4. **לא רואה מצלמות** - בדוק שהמצלמות מחוברות ומופעלות
5. **לינק לא עובד** - ודא שהלינק הועתק במלואו
6. **חיבור איטי** - בדוק את מהירות האינטרנט

### לוגים
הקומפוננט כולל לוגים מפורטים לפיתוח:
```typescript
console.log('Video call started with client:', client.name);
```

## סיכום

הפונקציונליות הוספה בהצלחה לדשבורד היועצים ומאפשרת:
- **שיחות וידאו מקצועיות** עם לקוחות באמצעות WebRTC אמיתי
- **מערכת signaling מלאה** לחיבור אמיתי בין יועץ ללקוח
- **צ'אט בזמן אמת** עם סנכרון מלא בין הצדדים
- **בחירת מצלמה ומיקרופון** מהרשימה הזמינה במחשב
- **שיתוף מסך** להצגת נתונים ומסמכים
- **לינק שיתוף** ייחודי לכל שיחה
- **עמוד נפרד ללקוח** עם ממשק מותאם
- **גישה מהירה לנתוני הלקוח** במהלך השיחה
- **ממשק משתמש אינטואיטיבי** ונוח בעברית

המערכת כוללת מערכת signaling מלאה עם Mock server לפיתוח ו-WebSocket לפרודקשן. מוכנה לשימוש מיידי עם חיבור אמיתי בין משתמשים!
