'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { CheckCircle2, HeartHandshake, Loader2, Mail, MessageCircle, Phone, Send, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LEAD_TOPIC_LABELS } from '@/lib/advisor-lead-topics';
import type { LeadTopic } from '@/lib/advisor-lead-topics';
import type { RequestKind } from '@/lib/advisor-requests';
import { useClientConversation } from '@/components/conversation/ClientChatDock';
import { RequestKindPicker, currentPagePath } from './RequestKindPicker';

/** סימון מקומי שנשלחה פנייה ליועץ — כדי שהדאשבורד לא יציג יותר מסך פתיחה */
export const CONTACTED_ADVISOR_KEY = 'mashklanta:contacted-advisor';
export const CONTACTED_ADVISOR_EVENT = 'mashklanta:contacted-advisor-changed';

/** הכפתור בטופס של לקוח רשום — לפי מה שהכפתור שפתח אותו מבקש */
export const MEMBER_SUBMIT_LABELS: Record<RequestKind, string> = {
  GUIDANCE: 'בקשו ליווי',
  MEETING: 'בקשו פגישה',
  QUESTION: 'שלחו את השאלה',
  QUOTE: 'בקשו הצעת מחיר',
};

/**
 * טופס פנייה לליווי — "אל דאגה, יועצי משכלנתא כאן כדי לעזור".
 *
 * לקוח רשום לא נשאל על מה שכבר ידוע עליו (שם, מייל, טלפון) ולא על סוג
 * הפנייה, שנקבע לפי הכפתור: רק הערה חופשית לא חובה, וכפתור אחד. הפנייה
 * מופיעה אצל היועץ ונכתבת גם בצ׳אט עם נציג משכלנתא. אורח ממלא פרטים ובוחר סוג.
 *
 * אותו טופס משמש בכל נקודות הפנייה: מהאזור האישי (סירוב, לא יודע מהיכן להתחיל,
 * היתכנות) ומתוך השלבים (גיוס הון עצמי). הנושא נקבע לפי הכפתור שממנו נפתח, כדי
 * שהיועץ יראה מיד במה מדובר.
 */
export function AdvisorLeadDialog({
  open,
  onOpenChange,
  topic,
  requestKind = 'GUIDANCE',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: LeadTopic;
  /** מה הכפתור שפתח את הטופס מבקש — ללקוח רשום אין בחירה */
  requestKind?: RequestKind;
}) {
  const { data: session, status } = useSession();
  const member = status === 'authenticated' && session?.user?.role !== 'ADVISOR' && Boolean(session?.user?.email);
  const conversation = useClientConversation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [kind, setKind] = useState<RequestKind>('GUIDANCE');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(session?.user?.name ?? '');
    setEmail(session?.user?.email ?? '');
    setPhone('');
    setNotes('');
    setKind(requestKind);
    setSent(false);
    setError(null);
  }, [open, session?.user?.name, session?.user?.email, requestKind]);

  const ready = member || (name.trim().length > 1 && /\d{6,}/.test(phone.replace(/\D/g, '')) && email.includes('@'));

  const submit = async () => {
    if (!ready) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch('/api/advisor-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          member
            ? { topic, notes, requestKind: requestKind, sourcePath: currentPagePath() }
            : { topic, name, phone, email, notes, requestKind: kind, sourcePath: currentPagePath() }
        ),
      });
      if (!response.ok) throw new Error(String(response.status));
      // הדאשבורד מציג מסך פתיחה אחר אחרי הפנייה הראשונה ליועץ
      try {
        window.localStorage.setItem(CONTACTED_ADVISOR_KEY, '1');
        window.dispatchEvent(new Event(CONTACTED_ADVISOR_EVENT));
      } catch {
        // דפדפן שחוסם אחסון מקומי — הפנייה עצמה כבר נשלחה
      }
      setSent(true);
    } catch {
      setError('הפנייה לא נשלחה. בדקו את החיבור ונסו שוב.');
    } finally {
      setSending(false);
    }
  };

  const field =
    'w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader className="text-center">
          <DialogTitle className="justify-center text-center">
            <span className="inline-flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-violet-600" />
              אל דאגה — יועצי משכלנתא כאן כדי לעזור
            </span>
          </DialogTitle>
          <DialogDescription className="text-center">
            {sent
              ? 'הפנייה נשלחה. יועץ משכלנתא יחזור אליכם בהקדם.'
              : member
                ? `נושא הפנייה: ${LEAD_TOPIC_LABELS[topic]}. הבקשה נשלחת עם פרטי החשבון שלכם, ותופיע גם בצ׳אט עם נציג משכלנתא.`
                : `השאירו פרטים ונחזור אליכם. נושא הפנייה: ${LEAD_TOPIC_LABELS[topic]}.`}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </span>
            <p className="text-sm font-bold text-slate-700">
              {member
                ? 'קיבלנו את הפנייה, והיא כבר אצל היועץ. ההמשך מתנהל בצ׳אט עם נציג משכלנתא.'
                : 'קיבלנו את הפנייה שלכם, והיא כבר מופיעה אצל היועצים. נדבר בקרוב.'}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {member && conversation?.enabled && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    conversation.open();
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-2.5 text-button font-black text-white transition-colors hover:bg-blue-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  לצ׳אט
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={
                  member && conversation?.enabled
                    ? 'rounded-2xl border-2 border-slate-200 px-6 py-2.5 text-button font-black text-slate-700 transition-colors hover:bg-slate-50'
                    : 'rounded-2xl bg-blue-600 px-6 py-2.5 text-button font-black text-white transition-colors hover:bg-blue-700'
                }
              >
                סגירה
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {!member && (
              <>
                <RequestKindPicker value={kind} onChange={setKind} />

                <label className="block">
                  <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <User className="h-3.5 w-3.5" />
                    שם מלא
                  </span>
                  <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="ישראל ישראלי" />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      <Phone className="h-3.5 w-3.5" />
                      טלפון
                    </span>
                    <input
                      className={field}
                      dir="ltr"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="050-0000000"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      <Mail className="h-3.5 w-3.5" />
                      אימייל
                    </span>
                    <input
                      className={field}
                      dir="ltr"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </label>
                </div>
              </>
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-600">
                הערות (לא חובה) — ספרו לנו קצת על הבקשה שלכם
              </span>
              <textarea
                className={`${field} min-h-[84px] resize-y`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="לדוגמה: הבנק סירב בגלל חריגה בעו״ש, ואני רוצה להבין איך להתקדם."
              />
            </label>

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={!ready || sending}
              onClick={() => void submit()}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black text-white transition-all ${
                ready && !sending ? 'bg-violet-600 hover:bg-violet-700' : 'cursor-not-allowed bg-slate-200 text-slate-400'
              }`}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {member ? MEMBER_SUBMIT_LABELS[requestKind] : 'שליחת הפנייה'}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
