'use client';

import { useEffect, useState } from 'react';
import { ALL_TOOLS_OPEN, TOOL_MODULE_IDS, type ClientToolAccess, type PublicOffice } from '@/lib/office';

export interface ClientOfficeState {
  /** המשרד שהלקוח משויך אליו, כשהיועץ הפעיל אותו. בלעדיו — המיתוג של משכלנתא */
  office: PublicOffice | null;
  /** אילו כלים מוצגים לו באזור האישי */
  tools: ClientToolAccess;
  ready: boolean;
}

function readTools(raw: unknown): ClientToolAccess {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(
    TOOL_MODULE_IDS.map((id) => [id, typeof source[id] === 'boolean' ? source[id] : ALL_TOOLS_OPEN[id]])
  ) as ClientToolAccess;
}

/**
 * המשרד והכלים של הלקוח המחובר (/api/office/me). עד שהתשובה מגיעה, וגם כשהיא
 * נכשלת, הכול מוצג כמו היום — כלי לא נעלם בגלל תקלה ברשת.
 */
export function useClientOffice(): ClientOfficeState {
  const [state, setState] = useState<ClientOfficeState>({ office: null, tools: ALL_TOOLS_OPEN, ready: false });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/office/me', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { office?: PublicOffice | null; tools?: unknown } | null) => {
        if (cancelled) return;
        setState({ office: body?.office ?? null, tools: readTools(body?.tools), ready: true });
      })
      .catch(() => {
        if (!cancelled) setState((current) => ({ ...current, ready: true }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
