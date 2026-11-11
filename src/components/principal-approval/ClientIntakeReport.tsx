'use client';

/**
 * הדוח המסכם של טופס פרטי הלקוח, באזור היועץ: כל מה שהלקוח הזין בטופס, לפי
 * הסדר של הטופס, עם הורדה כ-PDF.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CloudOff, Loader2 } from 'lucide-react';
import { CaseProvider, useCase } from './CaseContext';
import { ApprovalReport } from './ApprovalReport';

function ReportBody({ clientRecordId }: { clientRecordId: string }) {
  const { data, loading, loadError } = useCase();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (loadError || !data) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <CloudOff className="mx-auto mb-3 h-8 w-8 text-rose-400" />
        <p className="text-sm text-rose-700">{loadError ?? 'לא ניתן לטעון את הדוח'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/advisor-dashboard/client/${clientRecordId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לתיק הלקוח
        </Link>
        <Link
          href={`/client-details-form?client=${encodeURIComponent(clientRecordId)}`}
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          פתיחת הטופס כפי שהלקוח רואה אותו
        </Link>
      </div>
      <ApprovalReport variant="intake" />
    </div>
  );
}

export function ClientIntakeReport({ clientRecordId }: { clientRecordId: string }) {
  return (
    <CaseProvider clientRecordId={clientRecordId}>
      <div className="min-h-screen bg-slate-50" dir="rtl">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <ReportBody clientRecordId={clientRecordId} />
        </div>
      </div>
    </CaseProvider>
  );
}
