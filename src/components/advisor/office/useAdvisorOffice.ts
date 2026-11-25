'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OfficeProfile, OfficeTools } from '@/lib/office';

/** המשרד כפי שהשרת מחזיר אותו (src/lib/office-store.ts) */
export interface AdvisorOfficeView {
  id: string;
  slug: string;
  name: string;
  published: boolean;
  profile: OfficeProfile;
  tools: OfficeTools;
  path: string;
  updatedAt: string;
}

export interface OfficeUpdate {
  name?: string;
  slug?: string;
  published?: boolean;
  profile?: OfficeProfile;
  tools?: OfficeTools;
}

/**
 * "המשרד שלי" של היועץ המחובר: קריאה ושמירה. `platformAdmin` מגיע באותה
 * תשובה, כדי שהתפריט יידע אם להציג את ניהול הפלטפורמה.
 */
export function useAdvisorOffice() {
  const [office, setOffice] = useState<AdvisorOfficeView | null>(null);
  const [publicUrl, setPublicUrl] = useState('');
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (body: { office?: AdvisorOfficeView; publicUrl?: string; platformAdmin?: boolean }) => {
    if (body.office) setOffice(body.office);
    if (typeof body.publicUrl === 'string') setPublicUrl(body.publicUrl);
    setPlatformAdmin(body.platformAdmin === true);
  };

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/advisor/office', { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      apply(await response.json());
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את פרטי המשרד');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** שמירה. מחזירה הודעת שגיאה, או null כשנשמר */
  const save = useCallback(async (update: OfficeUpdate): Promise<string | null> => {
    try {
      const response = await fetch('/api/advisor/office', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return typeof body?.error === 'string' ? body.error : 'השמירה לא הצליחה. נסו שוב.';
      apply(body);
      return null;
    } catch {
      return 'השמירה לא הצליחה. בדקו את החיבור ונסו שוב.';
    }
  }, []);

  return { office, publicUrl, platformAdmin, ready, error, refresh, save };
}

/** העלאת לוגו או תמונה. מחזירה את הכתובת, או הודעת שגיאה */
export async function uploadOfficeImage(file: File): Promise<{ url: string } | { error: string }> {
  try {
    const response = await fetch('/api/advisor/office/images', {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body?.url !== 'string') {
      return { error: typeof body?.error === 'string' ? body.error : 'ההעלאה לא הצליחה' };
    }
    return { url: body.url };
  } catch {
    return { error: 'ההעלאה לא הצליחה. בדקו את החיבור ונסו שוב.' };
  }
}
