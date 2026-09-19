'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { AlertCircle, ArrowLeft, CheckCircle2, LayoutDashboard, Loader2, Lock, Mail, Sparkles, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';

/**
 * ההרשמה שנפתחת מתוך הכלים הפתוחים.
 *
 * הלקוח שסיים לשחק עם הכלי ורוצה להמשיך לתכנון ולקיחת המשכנתא לא נשלח לעמוד
 * הרשמה נפרד — הוא נפתח כאן, מעל התוצאות שהוא כבר רואה. עם השליחה נוצר
 * חשבון הלקוח בבסיס הנתונים, ההתחברות מתבצעת מיד אחריה, והלקוח נכנס לדאשבורד
 * של האזור האישי שלו — בלי מסך התחברות באמצע.
 */

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

export interface GuestRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** הכתובת שנפתחת אחרי ההרשמה — ברירת המחדל: האזור האישי */
  redirectTo?: string;
  title?: string;
  description?: string;
}

/** שם משתמש ראשוני מתוך המייל, כדי שלא נבקש מהלקוח שדה נוסף */
function usernameFromEmail(email: string): string {
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9._֐-׿-]/g, '');
  const padded = base.length >= 3 ? base : `${base}user`;
  return padded.slice(0, 24);
}

export function GuestRegistrationDialog({
  open,
  onOpenChange,
  redirectTo = '/dashboard',
  title = 'עוד שלב אחד — ונמשיך לתכנון ולקיחת המשכנתא',
  description = 'פתיחת חשבון לוקחת פחות מדקה, והיא חינמית. מיד לאחריה נפתח האזור האישי שלכם עם כל שלבי התהליך, והנתונים שהזנתם בכלי ממשיכים איתכם.',
}: GuestRegistrationDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // כל פתיחה מתחילה נקייה, כדי שלא יוצג אישור של הרשמה קודמת
  useEffect(() => {
    if (!open) return;
    setError(null);
    setBusy(false);
    setDone(false);
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('השם חייב להכיל לפחות 2 תווים');
      return;
    }
    if (!email.includes('@')) {
      setError('כתובת המייל אינה תקינה');
      return;
    }
    if (password.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }

    setBusy(true);
    try {
      /**
       * שם המשתמש נגזר מהמייל ולא נשאל מהלקוח, ולכן ייתכן שהוא תפוס בידי חשבון
       * אחר. במקרה כזה מנסים שוב עם סיומת מספרית, במקום להציג ללקוח שגיאה על
       * שדה שהוא לא מילא.
       */
      const register = (username: string) =>
        fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            username,
            email: email.trim(),
            password,
            role: 'CLIENT',
          }),
        });

      const baseUsername = usernameFromEmail(email);
      let response = await register(baseUsername);
      let body = await response.json().catch(() => null);
      for (let attempt = 1; attempt <= 2 && !response.ok; attempt += 1) {
        if (!String(body?.error ?? '').includes('שם המשתמש')) break;
        response = await register(`${baseUsername}${Math.floor(Math.random() * 9000) + 1000}`);
        body = await response.json().catch(() => null);
      }

      if (!response.ok) {
        setError(body?.error ?? 'ההרשמה נכשלה. נסו שוב.');
        return;
      }

      // ההתחברות מתבצעת מיד אחרי יצירת החשבון — הלקוח לא עובר במסך התחברות
      const signedIn = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (signedIn?.error) {
        setError('החשבון נוצר, אך ההתחברות נכשלה. התחברו עם המייל והסיסמה שבחרתם.');
        return;
      }

      setDone(true);
      router.push(redirectTo);
    } catch {
      setError('ההרשמה נכשלה. בדקו את החיבור ונסו שוב.');
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
        {done ? (
          <div className="px-8 py-10 text-center">
            <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </span>
            <DialogTitle className="text-xl font-black text-slate-900">
              החשבון נוצר — פותחים את האזור האישי
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-slate-500">
              עוד רגע והדאשבורד שלכם ייטען, עם שלבי תכנון ולקיחת המשכנתא.
            </DialogDescription>
            <Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-blue-500" />
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 md:p-7">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black leading-snug text-slate-900">
                  {title}
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] leading-relaxed text-slate-500">
                  {description}
                </DialogDescription>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 px-3.5 py-2.5 text-[12px] font-bold text-blue-900">
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              מיד לאחר ההרשמה נפתח הדאשבורד של האזור האישי, עם חמשת שלבי התהליך
            </div>

            <label className="block text-xs font-bold text-slate-600">
              שם מלא
              <span className="relative mt-1 block">
                <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={`${inputClass} pr-9`}
                  placeholder="איך לפנות אליכם"
                  autoComplete="name"
                />
              </span>
            </label>

            <label className="mt-3 block text-xs font-bold text-slate-600">
              אימייל
              <span className="relative mt-1 block">
                <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={`${inputClass} pr-9`}
                  placeholder="name@example.com"
                  autoComplete="email"
                  dir="ltr"
                />
              </span>
            </label>

            <label className="mt-3 block text-xs font-bold text-slate-600">
              סיסמה <span className="font-normal text-slate-400">(8 תווים לפחות)</span>
              <span className="relative mt-1 block">
                <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${inputClass} pr-9`}
                  placeholder="בחרו סיסמה"
                  autoComplete="new-password"
                  dir="ltr"
                />
              </span>
            </label>

            {error && (
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-blue-600 to-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
              הרשמה והמשך לאזור האישי
            </button>

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-bold text-slate-400">או</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <GoogleAuthButton label="הרשמה עם Google" callbackUrl={redirectTo} />

            <p className="mt-4 text-center text-[12px] text-slate-500">
              כבר יש לכם חשבון?{' '}
              <Link
                href={`/auth/login?callbackUrl=${encodeURIComponent(redirectTo)}`}
                className="font-black text-blue-600 hover:underline"
              >
                התחברו והמשיכו לאזור האישי
              </Link>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
