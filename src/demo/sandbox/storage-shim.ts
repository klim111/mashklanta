/**
 * אחסון דפדפן מבודד לזמן ההדגמה.
 *
 * הכלים שומרים טיוטות ב-`localStorage` (למשל נתוני מחשבון ההיתכנות). כדי
 * שההדגמה לא תדרוס את מה שהמבקר כבר הזין בעצמו — ולא תקרא אותו — מחליפים את
 * `localStorage` ו-`sessionStorage` בעותק שחי בזיכרון בלבד. ביציאה מההדגמה
 * האחסון המקורי חוזר, ללא שינוי.
 */

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    key: (index) => Array.from(map.keys())[index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(String(key), String(value));
    },
  };
  return storage;
}

export function installStorageShim(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const replaced: Array<'localStorage' | 'sessionStorage'> = [];
  (['localStorage', 'sessionStorage'] as const).forEach((name) => {
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        enumerable: true,
        get: (() => {
          const memory = createMemoryStorage();
          return () => memory;
        })(),
      });
      replaced.push(name);
    } catch {
      /* דפדפן שלא מאפשר להחליף — הכלים ימשיכו לעבוד, בלי הבידוד הזה */
    }
  });
  return () => {
    replaced.forEach((name) => {
      try {
        delete (window as unknown as Record<string, unknown>)[name];
      } catch {
        /* ignore */
      }
    });
  };
}
