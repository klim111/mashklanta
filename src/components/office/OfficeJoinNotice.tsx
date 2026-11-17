'use client';

import { useEffect, useState } from 'react';
import type { PublicOffice } from '@/lib/office';
import { officeStyle } from './officeTheme';
import { OfficeAvatar } from './OfficeAvatar';
import { rememberOffice } from './OfficeVisitTracker';

/**
 * בראש עמוד ההרשמה, כשמגיעים מדף משרד (`?office=<slug>`): אל מי מצטרפים. גם
 * שומר את המשרד בדפדפן, כדי שהחשבון החדש ישויך ליועץ שלו גם כשהקישור להרשמה
 * נשלח ישירות, בלי ביקור בדף המשרד.
 */
export function OfficeJoinNotice({ slug }: { slug: string }) {
  const [office, setOffice] = useState<PublicOffice | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/office/public?slug=${encodeURIComponent(slug)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { office?: PublicOffice | null } | null) => {
        if (cancelled || !body?.office) return;
        setOffice(body.office);
        rememberOffice(body.office.slug);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!office) return null;
  const advisor = office.profile.advisorName || office.name;
  return (
    <div
      style={officeStyle(office.profile.color)}
      className="start-aligned mb-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-[var(--office-soft)] p-4 text-right"
      role="status"
    >
      <OfficeAvatar name={advisor} photoUrl={office.profile.photoUrl} size="sm" />
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-900">פתיחת תיק אצל {advisor}</p>
        <p className="text-xs text-slate-600">{office.name} · החשבון יחובר ישירות למשרד</p>
      </div>
    </div>
  );
}
