/**
 * הניתוב בחלונות ההדגמה של הפגישות (src/components/frame-mode/frameMode.ts).
 *
 * בחלון הביקור הווירטואלי ובחלון הכלים של האורח, האזור האישי ושולחן העבודה
 * של התהליך מוצגים על נתוני ההדגמה, שחיים תחת `/demo`. מעבר בתוך החלון
 * לכתובת של האזור המחובר מגיע לכאן ומנותב למסך ההדגמה המקביל.
 */

/** הכותרת שהחלון מוסיף למעברים בין עמודים */
export const FRAME_HEADER = 'x-mk-frame';

/** מסך ההדגמה שמחליף את הכתובת הזו בחלון ההדגמה, או null כשהיא פתוחה כמו שהיא */
export function demoPathFor(pathname: string): string | null {
  if (pathname === '/dashboard/plans' || pathname.startsWith('/dashboard/plans/')) return '/demo/plan';
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return '/demo/dashboard';
  if (pathname === '/advisor-dashboard' || pathname.startsWith('/advisor-dashboard/')) return '/demo/dashboard';
  if (pathname.startsWith('/auth/')) return '/demo/dashboard';
  return null;
}
