/**
 * בקשת ההרשאות למצלמה ולמיקרופון לפני הכניסה לשיחה.
 *
 * LiveKit מפעיל את המיקרופון ואת המצלמה בשתי בקשות נפרדות שיוצאות באותו
 * רגע. דפדפנים רבים (בעיקר בטלפון) מציגים רק את הבקשה הראשונה, והשנייה
 * נכשלת בשקט — הלקוח נשאל על מיקרופון ולא על מצלמה. לכן מבקשים את שניהם
 * בבקשה אחת, עוד בלובי. אחרי שהדפדפן אישר, LiveKit כבר לא שואל שוב.
 */

export type DeviceKind = 'mic' | 'camera';

export interface DeviceCheck {
  mic: boolean;
  camera: boolean;
  /** הסבר ללקוח, כשאחד המכשירים לא נפתח */
  issue: string | null;
}

const NAMES: Record<DeviceKind, string> = { mic: 'המיקרופון', camera: 'המצלמה' };

/** ההסבר ללקוח לפי סוג השגיאה של הדפדפן */
export function deviceIssueMessage(kind: DeviceKind, errorName: string | undefined): string {
  const name = NAMES[kind];
  switch (errorName) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return `הדפדפן חוסם את ${name}. לחצו על סמל המנעול או ההגדרות ליד כתובת האתר, אפשרו את ${name} ונסו שוב.`;
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return `לא מצאנו ${kind === 'camera' ? 'מצלמה' : 'מיקרופון'} במכשיר הזה.`;
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return `${name} תפוסה כרגע בתוכנה אחרת (למשל זום או וואטסאפ). סגרו אותה ונסו שוב.`;
    default:
      return `לא הצלחנו להפעיל את ${name}. אם נכנסתם מתוך אפליקציה כמו וואטסאפ, פתחו את הקישור בכרום או בספארי.`;
  }
}

async function tryOpen(constraints: MediaStreamConstraints): Promise<string | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((track) => track.stop());
    return null;
  } catch (error) {
    return (error as { name?: string })?.name ?? 'Error';
  }
}

/**
 * מבקש את המכשירים שנבחרו בלובי בבקשה אחת. אם הבקשה המשותפת נכשלה, בודק
 * כל אחד לחוד, כדי להיכנס עם מה שעובד ולהסביר מה לא.
 */
export async function prepareDevices(wantMic: boolean, wantCamera: boolean): Promise<DeviceCheck> {
  if (!wantMic && !wantCamera) return { mic: false, camera: false, issue: null };
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return {
      mic: false,
      camera: false,
      issue: 'הדפדפן הזה לא מאפשר מצלמה ומיקרופון. פתחו את הקישור בכרום או בספארי.',
    };
  }

  const together = await tryOpen({ audio: wantMic, video: wantCamera });
  if (!together) return { mic: wantMic, camera: wantCamera, issue: null };

  const micError = wantMic ? await tryOpen({ audio: true }) : null;
  const cameraError = wantCamera ? await tryOpen({ video: true }) : null;
  const issues = [
    wantMic && micError ? deviceIssueMessage('mic', micError) : null,
    wantCamera && cameraError ? deviceIssueMessage('camera', cameraError) : null,
  ].filter(Boolean);
  // הבקשה המשותפת נכשלה אבל כל אחד לחוד עבר — נכנסים עם שניהם
  return {
    mic: wantMic && !micError,
    camera: wantCamera && !cameraError,
    issue: issues.length ? issues.join(' ') : null,
  };
}
