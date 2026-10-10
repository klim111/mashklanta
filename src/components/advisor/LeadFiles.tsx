'use client';

import { useEffect, useState } from 'react';
import { Eye, Paperclip } from 'lucide-react';
import type { AdvisorLeadView } from '@/lib/advisor-leads';
import { pageLabel } from '@/lib/page-labels';
import { SectionCard } from './ui';

function sizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** הקבצים שהלקוח צירף לפנייה — כל קובץ נפתח בלשונית חדשה דרך הפלטפורמה */
export function LeadFilesList({ lead }: { lead: Pick<AdvisorLeadView, 'id' | 'files'> }) {
  if (lead.files.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {lead.files.map((file) => (
        <a
          key={file.id}
          href={`/api/advisor/leads/${lead.id}/files/${file.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-[12px] font-bold text-violet-800 transition-colors hover:bg-violet-50"
        >
          <Paperclip className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{file.fileName}</span>
          <span className="shrink-0 font-normal text-slate-400">{sizeLabel(file.size)}</span>
        </a>
      ))}
    </div>
  );
}

/**
 * בדף הלקוח אצל היועץ: הקבצים שהלקוח צירף לפניות שלו (גם לפניות ששלח כאורח,
 * לפני שנרשם). מוצג רק כשיש קבצים כאלה.
 */
export function ClientLeadFiles({ clientId }: { clientId: string }) {
  const [leads, setLeads] = useState<AdvisorLeadView[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/advisor/leads', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((body: AdvisorLeadView[]) => {
        if (cancelled || !Array.isArray(body)) return;
        setLeads(body.filter((lead) => lead.clientId === clientId && lead.files?.length > 0));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (leads.length === 0) return null;
  return (
    <SectionCard title="קבצים שצורפו לפניות" icon={<Paperclip className="h-4 w-4 text-violet-600" />}>
      <ul className="space-y-3">
        {leads.map((lead) => (
          <li key={lead.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
              <Eye className="h-3.5 w-3.5" />
              <span className="font-bold text-slate-700">{lead.topicLabel}</span>
              {lead.sourcePath && <span>· נשלחה מ{pageLabel(lead.sourcePath)}</span>}
              <span>· {new Date(lead.createdAt).toLocaleDateString('he-IL')}</span>
            </div>
            <LeadFilesList lead={lead} />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
