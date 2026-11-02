'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { formatTime } from '@/lib/advisor-crm';

export interface EphemeralMessage {
  id: string;
  by: string;
  text: string;
  at: string;
  mine: boolean;
}

/**
 * הצ'אט של פגישת אורח (src/lib/guest-meetings.ts). ההודעות עוברות בערוץ
 * הנתונים של השיחה בלבד, לא נשמרות בשרת, ונעלמות כשהשיחה נגמרת.
 */
export function EphemeralChat({
  messages,
  onSend,
}: {
  messages: EphemeralMessage[];
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  return (
    <div dir="rtl" className="flex min-h-0 flex-1 flex-col">
      <p className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-2xs font-bold text-slate-500">
        הצ׳אט קיים רק בזמן הפגישה ולא נשמר
      </p>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && <p className="py-8 text-center text-sm text-slate-400">עדיין אין הודעות</p>}
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.mine ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                message.mine ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'
              }`}
            >
              {!message.mine && <p className="text-2xs font-black text-slate-500">{message.by}</p>}
              <p className="whitespace-pre-wrap break-words">{message.text}</p>
              <p className={`mt-0.5 text-2xs ${message.mine ? 'text-white/70' : 'text-slate-400'}`}>
                {formatTime(message.at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-200 p-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="כתבו הודעה…"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
        <button
          type="submit"
          aria-label="שליחה"
          className="rounded-xl bg-blue-600 p-2.5 text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={!draft.trim()}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
