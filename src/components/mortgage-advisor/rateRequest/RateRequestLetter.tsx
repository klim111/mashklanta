'use client';

import React, { useMemo } from 'react';
import { RATE_REQUEST_CSS, rateRequestBodyHtml } from './letter';
import type { RateRequestDocument } from './document';

/**
 * תצוגת המכתב על המסך. אותו HTML בדיוק שנשלח למדפסת ולקובץ ה-PDF, כדי שמה
 * שנראה כאן יהיה מה שיישמר — כללי העיצוב תחומים ל-‎.rr-doc‎ ולכן אינם דולפים
 * לשאר המסך.
 */
export function RateRequestLetter({ document }: { document: RateRequestDocument }) {
  const html = useMemo(() => rateRequestBodyHtml(document), [document]);

  return (
    <div className="rr-frame overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <style dangerouslySetInnerHTML={{ __html: RATE_REQUEST_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
