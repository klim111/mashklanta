'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AlertTriangle, CheckCircle2, FileText, Loader2, Send, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MixExplanation, WorkspaceMix } from '@/components/mortgage-advisor/engine';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import { formatShekel, trackColor } from '@/components/mortgage-advisor/workspace/primitives';
import { AUTHORIZATION_FONT_PATH } from '@/lib/authorization-forms';
import {
  alignExplanation,
  explanationGaps,
  mixReportFileName,
  mixReportMessage,
  mixReportModel,
  trackTitle,
} from '@/lib/mix-report';
import { assignmentGaps, assignmentGapsMessage } from '@/lib/mix-assignment';

export interface MixReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mix: WorkspaceMix;
  /** הלקוחות של היועץ — לבחירת הנמען כשהתמהיל עוד לא משויך */
  clients: Array<{ id: string; name: string }>;
  /** הלקוח שהתמהיל כבר משויך אליו, או שהכלי נפתח עליו */
  defaultClientId?: string | null;
  /** 'send' — שליחה ללקוח היא הפעולה הראשית; 'report' — הפקת הדוח */
  intent?: 'send' | 'report';
  /**
   * שמירת התמהיל עם ההסבר, לפני ההפקה. מחזירה את הרשומה השמורה — לשליחה צריך
   * את המזהה שלה. ההסבר נשמר עם התמהיל כדי שייטען שוב בפעם הבאה.
   */
  onPersist: (mix: WorkspaceMix) => Promise<SavedMix | null>;
  /** אחרי שליחה מוצלחת — כדי לרענן את הרשימות */
  onSent?: (clientId: string) => void;
  /** פתיחת התמהיל בבונה כדי להשלים מחיר נכס או הכנסה — מתיק התמהילים */
  onCompleteMix?: () => void;
}

async function buildPdf(mix: WorkspaceMix, explanation: MixExplanation, preparedBy: string | null, clientName: string | null) {
  const [{ mixReportPdf }, font] = await Promise.all([
    import('@/lib/mix-report'),
    fetch(AUTHORIZATION_FONT_PATH).then((response) => {
      if (!response.ok) throw new Error('font');
      return response.arrayBuffer();
    }),
  ]);
  return mixReportPdf({ mix, explanation, preparedBy, clientName, generatedAt: new Date() }, font);
}

/**
 * דוח התמהיל ושליחתו ללקוח.
 *
 * ההסבר בנוי תמיד באותו מבנה: הסבר כללי על התמהיל, ושורת יתרונות אחת לכל
 * מסלול — כמה מסלולים, כך שורות. מכאן מורידים את הדוח כ-PDF, או שולחים אותו
 * ללקוח כהודעה בצ'אט עם הקובץ מצורף.
 */
export function MixReportDialog({
  open,
  onOpenChange,
  mix,
  clients,
  defaultClientId,
  intent = 'send',
  onPersist,
  onSent,
  onCompleteMix,
}: MixReportDialogProps) {
  const { data: session } = useSession();
  const preparedBy = session?.user?.name || null;
  const [explanation, setExplanation] = useState<MixExplanation>(() => alignExplanation(mix, mix.explanation));
  const [clientId, setClientId] = useState(defaultClientId ?? '');
  const [busy, setBusy] = useState<'pdf' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [showGaps, setShowGaps] = useState(false);

  useEffect(() => {
    if (!open) return;
    setExplanation(alignExplanation(mix, mix.explanation));
    setClientId(defaultClientId ?? '');
    setError(null);
    setSentTo(null);
    setShowGaps(false);
    // נפתח מחדש על התמהיל שנבחר, לא בכל שינוי שלו בזמן שהחלון פתוח
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mix.id, defaultClientId]);

  const gaps = useMemo(() => explanationGaps(mix, explanation), [mix, explanation]);
  const missingForAssign = useMemo(() => assignmentGaps(mix), [mix]);
  const model = useMemo(() => mixReportModel({ mix, explanation }), [mix, explanation]);
  const clientName = clients.find((client) => client.id === clientId)?.name ?? null;

  const withExplanation = (): WorkspaceMix => ({ ...mix, explanation });

  const download = async () => {
    setBusy('pdf');
    setError(null);
    try {
      void onPersist(withExplanation()).catch(() => null);
      const bytes = await buildPdf(mix, explanation, preparedBy, clientName);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = mixReportFileName(mix);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      setError('לא הצלחנו להפיק את הדוח. נסו שוב בעוד רגע.');
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    setShowGaps(true);
    if (!clientId) {
      setError('בחרו את הלקוח שהתמהיל יישלח אליו.');
      return;
    }
    if (missingForAssign.length > 0) {
      setError(assignmentGapsMessage(missingForAssign));
      return;
    }
    if (gaps.length > 0) {
      setError(`כדי לשלוח צריך למלא: ${gaps.join(', ')}.`);
      return;
    }
    setBusy('send');
    setError(null);
    try {
      const stored = await onPersist(withExplanation());
      if (!stored?.recordId) throw new Error('התמהיל לא נשמר בחשבון. בדקו את החיבור ונסו שוב.');
      const bytes = await buildPdf(mix, explanation, preparedBy, clientName);
      const form = new FormData();
      form.append('file', new Blob([bytes as BlobPart], { type: 'application/pdf' }), 'mix.pdf');
      form.append('fileName', mixReportFileName(mix));
      form.append('clientId', clientId);
      form.append('message', mixReportMessage(model));
      const response = await fetch(`/api/mixes/${stored.recordId}/send`, { method: 'POST', body: form });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : 'השליחה לא הושלמה. נסו שוב.');
      setSentTo(clientName ?? 'הלקוח');
      onSent?.(clientId);
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : 'השליחה לא הושלמה. נסו שוב.');
    } finally {
      setBusy(null);
    }
  };

  const total = mix.totalAmount || mix.tracks.reduce((sum, track) => sum + track.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90dvh] max-w-2xl overflow-y-auto text-right">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-right">
            {intent === 'send' ? <Send className="h-5 w-5 text-blue-600" /> : <FileText className="h-5 w-5 text-blue-600" />}
            {intent === 'send' ? 'שליחת התמהיל ללקוח' : 'דוח תמהיל'} · {mix.name || 'תמהיל ללא שם'}
          </DialogTitle>
          <DialogDescription className="text-right">
            ההסבר נכנס לדוח ה-PDF: הסבר כללי על התמהיל, ושורת יתרונות לכל אחד מ-{mix.tracks.length} המסלולים.
            בשליחה הדוח מגיע ללקוח כהודעה בצ&apos;אט, והתמהיל מופיע אצלו בשלב בניית התמהיל.
          </DialogDescription>
        </DialogHeader>

        {sentTo ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-emerald-50 p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <p className="text-sm font-black text-emerald-900">התמהיל נשלח ל{sentTo}</p>
            <p className="text-xs text-emerald-800">
              הדוח נמצא בצ&apos;אט שלכם, והתמהיל מסומן אצלו כתמהיל שבנה היועץ.
            </p>
            <Button className="mt-2 h-9 text-xs" onClick={() => onOpenChange(false)}>
              סגירה
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {intent === 'send' && missingForAssign.length > 0 && (
              <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span className="flex-1">{assignmentGapsMessage(missingForAssign)}</span>
                {onCompleteMix && (
                  <Button size="sm" variant="outline" className="h-7 shrink-0 bg-white text-2xs" onClick={onCompleteMix}>
                    השלמה בבונה
                  </Button>
                )}
              </p>
            )}
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <UserRound className="h-3.5 w-3.5 text-blue-600" />
                הלקוח
              </span>
              <select
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">{intent === 'send' ? 'בחרו לקוח' : 'בלי שם לקוח בדוח'}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">הסבר כללי על התמהיל</span>
              <textarea
                value={explanation.overview}
                onChange={(event) => setExplanation((current) => ({ ...current, overview: event.target.value }))}
                rows={4}
                maxLength={2400}
                placeholder="למשל: התמהיל מאזן בין יציבות ההחזר לגמישות. שליש בקבועה לא צמודה שומר על החזר קבוע, והפריים מאפשר פירעון מוקדם בלי עמלה."
                className={`w-full rounded-lg border bg-white p-3 text-sm leading-relaxed outline-none focus:border-blue-400 ${
                  showGaps && !explanation.overview.trim() ? 'border-red-300' : 'border-slate-200'
                }`}
              />
            </label>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700">
                היתרונות של כל מסלול · {mix.tracks.length} שורות, אחת לכל מסלול
              </p>
              {mix.tracks.map((track, index) => {
                const value = explanation.tracks[track.id] ?? '';
                return (
                  <div key={track.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: trackColor(track.type) }} />
                      <span className="text-xs font-black text-slate-900">{trackTitle(track, index)}</span>
                      <span className="text-[11px] text-slate-500">
                        {formatShekel(track.amount)} · {total > 0 ? ((track.amount / total) * 100).toFixed(0) : 0}% ·
                        ריבית {track.interestRate.toFixed(2)}% · {track.years} שנים
                      </span>
                    </div>
                    <Input
                      value={value}
                      maxLength={300}
                      onChange={(event) =>
                        setExplanation((current) => ({
                          ...current,
                          tracks: { ...current.tracks, [track.id]: event.target.value },
                        }))
                      }
                      placeholder="היתרון של המסלול הזה בתמהיל"
                      className={`h-9 bg-white text-sm ${showGaps && !value.trim() ? 'border-red-300' : ''}`}
                      aria-label={`היתרונות של מסלול ${index + 1}`}
                    />
                  </div>
                );
              })}
            </div>

            {error && (
              <p className="flex items-start gap-1.5 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}

            <DialogFooter className="gap-2 sm:justify-start">
              <Button onClick={() => void send()} disabled={busy !== null} className="h-9 text-xs">
                {busy === 'send' ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Send className="ml-1 h-4 w-4" />}
                שלח תמהיל ללקוח
              </Button>
              <Button variant="outline" onClick={() => void download()} disabled={busy !== null} className="h-9 text-xs">
                {busy === 'pdf' ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <FileText className="ml-1 h-4 w-4" />}
                הורד דוח PDF
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-9 text-xs">
                ביטול
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
