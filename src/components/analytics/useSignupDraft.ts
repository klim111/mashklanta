'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useDemoRequest } from '@/demo/store';
import { randomTrackingId, visitorId } from '@/lib/visitor-ids';
import type { DraftField } from '@/lib/site-analytics';

type DraftValues = Partial<Record<DraftField, string>>;

function post(body: Record<string, unknown>) {
  return fetch('/api/track/signup-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

/**
 * שומר את מה שהוקלד בטופס ההרשמה תוך כדי הקלדה (שם, שם משתמש ומייל — לא
 * סיסמה), כדי שהיועץ יראה מי התחיל להירשם ולא סיים ועד איפה הגיע. השמירה
 * יוצאת שנייה אחרי שההקלדה נעצרת, וגם כשהעמוד נסגר באמצע.
 *
 * מחזיר `markSubmitted`, לקריאה אחרי שהשרת קיבל את ההרשמה ושלח מייל אישור.
 */
export function useSignupDraft(
  source: 'register' | 'guest-dialog',
  values: DraftValues,
  enabled = true
) {
  const pathname = usePathname();
  const demo = useDemoRequest();
  const draftKey = useRef<string | null>(null);
  const lastField = useRef<DraftField | null>(null);
  const previous = useRef<DraftValues>({});
  const pending = useRef<Record<string, unknown> | null>(null);

  const active = enabled && !demo;
  const { name = '', username = '', email = '' } = values;

  const payload = useCallback(
    (extra: Record<string, unknown> = {}) => {
      if (!draftKey.current) draftKey.current = randomTrackingId();
      return {
        draftKey: draftKey.current,
        visitorId: visitorId(),
        source,
        path: pathname,
        name,
        username,
        email,
        lastField: lastField.current,
        ...extra,
      };
    },
    [source, pathname, name, username, email]
  );

  useEffect(() => {
    if (!active) return;
    const current: DraftValues = { name, username, email };
    for (const field of ['name', 'username', 'email'] as const) {
      if ((current[field] ?? '') !== (previous.current[field] ?? '')) lastField.current = field;
    }
    previous.current = current;
    if (!name.trim() && !username.trim() && !email.trim()) return;

    pending.current = payload();
    const timer = window.setTimeout(() => {
      if (pending.current) post(pending.current);
      pending.current = null;
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [active, name, username, email, payload]);

  // סגירת הלשונית באמצע ההקלדה — שולחים את מה שעוד לא נשמר
  useEffect(() => {
    if (!active) return;
    const flush = () => {
      if (pending.current) post(pending.current);
      pending.current = null;
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [active]);

  const markSubmitted = useCallback(() => {
    if (!active) return;
    pending.current = null;
    post(payload({ submitted: true }));
  }, [active, payload]);

  return { markSubmitted };
}
