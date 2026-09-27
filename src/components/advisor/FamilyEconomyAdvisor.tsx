'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowUpLeft,
  CheckCircle2,
  Coins,
  HeartHandshake,
  Loader2,
  PiggyBank,
  Send,
  Sparkles,
  TrendingDown,
  UserRound,
  X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

/**
 * הפנייה ליועץ כלכלת המשפחה של משכלנתא — אותה פנייה מכל הכלים הפתוחים.
 *
 * הכלי מראה ללקוח את המצב; היועץ הוא מי שהופך אותו לתוכנית — איחוד או פריסה
 * של ההלוואות היקרות, תכנון ההון העצמי וההוצאות לרכישה, שימוש נכון בכסף שיש
 * לו ותשואה טובה יותר על החיסכון. הפנייה נשלחת כבקשת ליווי לצד היועצים, עם
 * הסבר ועם תמונת המצב שהלקוח הזין, כדי שהיועץ יחזור אליו עם משהו ביד. לקוח
 * שאינו רשום מזין שם וטלפון, והמייל אצלו הוא רשות.
 *
 * הכלי שממנו נפתחה הפנייה מעביר ב-`context` את משפט המקור ואת תמונת המצב,
 * ויכול להחליף את נקודות הערך — כך שכל כלי מדבר בשפה שלו, בלי לשכפל את הטופס.
 */

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';

/** מה היועץ עושה — אותן נקודות גם בכפתור הצף וגם בכרטיס שבתוך הכלי */
export const ADVISOR_VALUE_POINTS: { icon: React.ElementType; text: string }[] = [
  {
    icon: TrendingDown,
    text: 'בוחן כל הלוואה מול החלופות בשוק, ובונה מסלול לאיחוד, פריסה או סגירה מוקדמת — כדי שתפסידו כמה שפחות על ריבית',
  },
  {
    icon: PiggyBank,
    text: 'מסדר את כלכלת המשפחה: מה נכון להחזיר עכשיו, מה להשאיר נזיל, ואיך להוציא תשואה גבוהה יותר מהחיסכון שכבר יש לכם',
  },
  {
    icon: Coins,
    text: 'מתאם בין ההלוואות הצרכניות למשכנתא — יחס ההחזר שלכם הוא מה שקובע איזו משכנתא הבנק יאשר ובאיזו ריבית',
  },
];

export const ADVISOR_COST_NOTE =
  'עלות הייעוץ תמיד קטנה משמעותית מהכסף שתרוויחו מהאסטרטגיה שהיועץ יבנה: החיסכון בריבית ובעלויות, והתשואה הנוספת על הכסף שברשותכם, גדולים ממנה בכל תרחיש שנבדק.';

export interface AdvisorLeadContext {
  /** תמונת המצב שהלקוח הזין, נשלחת ליועץ כהערה */
  summary?: string;
  /** מאיזה כלי הגיעה הפנייה ומה הלקוח מבקש — השורה הראשונה שהיועץ קורא */
  origin?: string;
  /** נקודות הערך שמוצגות בכרטיס ובכפתור הצף, כשהכלי רוצה לנסח אותן אחרת */
  points?: { icon: React.ElementType; text: string }[];
  /** המשפט שמתחת לכותרת הטופס — מה היועץ יחזור אליהם איתו */
  intro?: string;
  /** המשפט שמופיע אחרי השליחה, על מה שנשלח ליועץ */
  confirmation?: string;
}

const DEFAULT_INTRO =
  'השאירו שם וטלפון, ויועץ יחזור אליכם עם קריאה ראשונה של ההלוואות שהזנתם כאן — מה יקר, מה כדאי לאחד או לסגור, ואיך לנצל טוב יותר את הכסף שברשותכם.';

const DEFAULT_CONFIRMATION =
  'הבקשה מופיעה אצל יועצי משכלנתא כבקשת ליווי, יחד עם תמונת ההלוואות שהזנתם כאן — כך שהשיחה מתחילה מהנתונים שלכם ולא מאפס. בינתיים אפשר להמשיך לעבוד בכלי.';

const DEFAULT_ORIGIN =
  'פנייה מכלי ההלוואות הצרכניות — הלקוח מבקש ליווי של יועץ כלכלת המשפחה: בחינת ההלוואות הקיימות, איחוד או סגירה מוקדמת, ותכנון נכון של כלכלת המשפחה.';

/* ------------------------------------------------------------------ */
/* טופס הפנייה                                                         */
/* ------------------------------------------------------------------ */

export function FamilyEconomyLeadDialog({
  open,
  onOpenChange,
  context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: AdvisorLeadContext;
}) {
  const { data: session, status } = useSession();
  const isMember = status === 'authenticated' && !!session?.user;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // כל פתיחה מתחילה נקייה, ולמשתמש רשום כבר מגיעים פרטי החשבון
  useEffect(() => {
    if (!open) return;
    setName(session?.user?.name ?? '');
    setEmail(session?.user?.email ?? '');
    setSent(false);
    setError(null);
    setBusy(false);
  }, [open, session?.user?.name, session?.user?.email]);

  const digits = phone.replace(/\D/g, '');
  const ready = name.trim().length > 1 && digits.length >= 9;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) {
      setError('נדרשים שם ומספר טלפון לחזרה');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const notes = [
        context?.origin ?? DEFAULT_ORIGIN,
        context?.summary ? `תמונת המצב שהלקוח הזין בכלי: ${context.summary}` : null,
        note.trim() || null,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await fetch('/api/advisor-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'FAMILY_ECONOMY',
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          notes,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? 'שליחת הפנייה נכשלה. נסו שוב.');
        return;
      }
      setSent(true);
      setNote('');
    } catch {
      setError('שליחת הפנייה נכשלה. בדקו את החיבור ונסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden rounded-3xl border-0 bg-white p-0 text-right shadow-2xl sm:w-full"
      >
        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-8 py-10 text-center"
          >
            <span className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </span>
            <DialogTitle className="text-xl font-black leading-snug text-slate-900">
              הפנייה נרשמה — יועץ כלכלת המשפחה יחזור אליכם
            </DialogTitle>
            <DialogDescription className="mt-3 text-sm leading-relaxed text-slate-500">
              {context?.confirmation ?? DEFAULT_CONFIRMATION}
            </DialogDescription>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-700"
            >
              סגירה
            </button>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="p-6 md:p-7">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                <HeartHandshake className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black leading-snug text-slate-900">
                  פנייה ליועץ כלכלת המשפחה של משכלנתא
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] leading-relaxed text-slate-500">
                  {context?.intro ?? DEFAULT_INTRO}
                </DialogDescription>
              </div>
            </div>

            <p className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-2.5 text-[12px] font-bold leading-relaxed text-emerald-900">
              {ADVISOR_COST_NOTE}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">
                שם מלא
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={`mt-1 ${inputClass}`}
                  placeholder="איך לפנות אליכם"
                  autoComplete="name"
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                טלפון
                <input
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className={`mt-1 ${inputClass}`}
                  placeholder="050-0000000"
                  autoComplete="tel"
                  inputMode="tel"
                  dir="ltr"
                />
              </label>
            </div>

            <label className="mt-3 block text-xs font-bold text-slate-600">
              אימייל <span className="font-normal text-slate-400">(רשות)</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`mt-1 ${inputClass}`}
                placeholder="name@example.com"
                autoComplete="email"
                dir="ltr"
              />
            </label>

            <label className="mt-3 block text-xs font-bold text-slate-600">
              מה חשוב שהיועץ ידע <span className="font-normal text-slate-400">(רשות)</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={2000}
                className={`mt-1 resize-none ${inputClass}`}
                placeholder="למשל: יש לי חיסכון פנוי, מתכנן משכנתא בחצי שנה הקרובה, החזר חודשי שמכביד"
              />
            </label>

            {isMember && (
              <p className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                הפנייה תישלח עם חשבון משכלנתא שלכם, כך שהיועץ יראה גם את מה שהזנתם בתהליך
              </p>
            )}

            {error && (
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                שליחת הפנייה ליועץ
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* הכפתור הצף                                                          */
/* ------------------------------------------------------------------ */

export function FamilyEconomyFloatingCta({ context }: { context?: AdvisorLeadContext }) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const points = context?.points ?? ADVISOR_VALUE_POINTS;

  return (
    <>
      <div className="pointer-events-none fixed bottom-5 left-4 z-40 flex flex-col items-start gap-3 print:hidden sm:left-5">
        <AnimatePresence>
          {open && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              dir="rtl"
              className="pointer-events-auto w-[min(92vw,23rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 bg-gradient-to-l from-emerald-600 to-teal-600 px-5 py-4 text-white">
                <div>
                  <p className="text-[11px] font-bold text-white/80">ליווי אישי</p>
                  <h4 className="mt-0.5 text-base font-black leading-snug">
                    יועץ כלכלת המשפחה של משכלנתא
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="סגירה"
                  className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 p-5">
                <ul className="m-0 list-none space-y-2 p-0">
                  {points.map((point) => {
                    const Icon = point.icon;
                    return (
                      <li key={point.text} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-[12.5px] leading-relaxed text-slate-600">
                          {point.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <p className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-[12px] font-bold leading-relaxed text-emerald-900">
                  {ADVISOR_COST_NOTE}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setDialogOpen(true);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-2xl bg-gradient-to-l from-emerald-600 to-teal-600 px-4 py-3 text-sm font-black text-white transition-all hover:shadow-lg"
                >
                  השארת פרטים ליועץ
                  <ArrowUpLeft className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setOpen((value) => !value)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          aria-expanded={open}
          aria-label="פנה ליועץ כלכלת המשפחה של משכלנתא"
          className="pointer-events-auto inline-flex items-center gap-2.5 rounded-full bg-gradient-to-l from-emerald-600 to-teal-600 p-2 text-[13px] sm:py-3 sm:pl-5 sm:pr-4 font-black text-white shadow-[0_12px_30px_rgba(5,150,105,0.4)] ring-2 ring-white transition-shadow hover:shadow-[0_14px_36px_rgba(5,150,105,0.5)] sm:text-sm"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <HeartHandshake className="h-4 w-4" />
          </span>
          {/* בטלפון הכפתור עגול, כדי שלא יסתיר את תוכן הכלי */}
          <span className="sr-only sm:not-sr-only">פנה ליועץ כלכלת המשפחה של משכלנתא</span>
        </motion.button>
      </div>

      <FamilyEconomyLeadDialog open={dialogOpen} onOpenChange={setDialogOpen} context={context} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* הכרטיס שבתוך הכלי                                                   */
/* ------------------------------------------------------------------ */

/**
 * הזמנה לליווי בתוך תוכן הכלי, עם המספר שהכלי עצמו חישב.
 * `headline` הוא החיסכון הקונקרטי שנמצא בנתוני הלקוח, כשיש כזה.
 */
export function FamilyEconomyValueCard({
  headline,
  onContact,
  points = ADVISOR_VALUE_POINTS,
}: {
  headline?: string;
  onContact: () => void;
  points?: { icon: React.ElementType; text: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-l from-emerald-50 to-teal-50">
      <div className="flex flex-wrap items-center gap-2 border-b border-emerald-100 px-4 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
          <Sparkles className="h-4 w-4" />
        </span>
        <p className="text-[13px] font-black text-emerald-900">
          {headline ?? 'כמה מהכסף הזה אפשר להחזיר לכיס שלכם?'}
        </p>
      </div>

      <div className="space-y-2.5 p-4">
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-3">
          {points.map((point) => {
            const Icon = point.icon;
            return (
              <li
                key={point.text}
                className="flex items-start gap-2 rounded-xl border border-white bg-white/70 p-2.5"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[12px] leading-snug text-slate-700">{point.text}</span>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-[12px] font-bold leading-relaxed text-emerald-900">
            {ADVISOR_COST_NOTE}
          </p>
          <button
            type="button"
            onClick={onContact}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600 px-5 py-2.5 text-[13px] font-black text-white shadow-md transition-all hover:shadow-lg"
          >
            פנייה ליועץ כלכלת המשפחה
            <ArrowUpLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
