/**
 * מזהים אקראיים לדאשבורד הביקורים, נשמרים בדפדפן בלבד: מזהה מבקר קבוע
 * (localStorage) ומזהה ביקור שמתחלף בכל לשונית חדשה (sessionStorage). אין בהם
 * שום פרט מזהה, ואם האחסון חסום הם פשוט מוגרלים מחדש.
 */

export function randomTrackingId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

function stored(storage: () => Storage, key: string): string {
  try {
    const existing = storage().getItem(key);
    if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
    const created = randomTrackingId();
    storage().setItem(key, created);
    return created;
  } catch {
    return randomTrackingId();
  }
}

export function visitorId(): string {
  return stored(() => window.localStorage, 'mk_vid');
}

export function visitSessionId(): string {
  return stored(() => window.sessionStorage, 'mk_sid');
}
