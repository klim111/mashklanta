'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Building2, CheckCircle2, Loader2, Lock, Palette, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FEATURES = [
  {
    icon: Palette,
    title: 'משרד בשם שלכם',
    text: 'דף משרד עם הלוגו, הצבעים והשם שלכם, וקישור קבוע לשלוח ללקוחות.',
  },
  {
    icon: Users,
    title: 'אזור אישי ללקוחות',
    text: 'הלקוחות נרשמים דרך הדף שלכם, ממלאים פרטים ומעלים מסמכים, ורואים רק את הכלים שפתחתם.',
  },
  {
    icon: Building2,
    title: 'כל כלי העבודה',
    text: 'תמהילים, מכרז ריביות מול הבנקים, כתבי הסמכה, יומן ומשימות, במקום אחד.',
  },
  {
    icon: Lock,
    title: 'הלקוחות שלכם נשארים שלכם',
    text: 'כל משרד נפרד לגמרי. אף יועץ אחר לא רואה את הלקוחות או הפניות שלכם.',
  },
];

type FormState = {
  name: string;
  email: string;
  phone: string;
  officeName: string;
  licenseNumber: string;
  website: string;
  message: string;
  company: string;
};

const EMPTY: FormState = {
  name: '',
  email: '',
  phone: '',
  officeName: '',
  licenseNumber: '',
  website: '',
  message: '',
  company: '',
};

/** דף ההצטרפות ליועצים: מה מקבלים, וטופס בקשה שמחכה לאישור ידני */
export function AdvisorJoinPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const set = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/advisor-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? 'לא הצלחנו לשלוח. נסו שוב.');
        return;
      }
      setSent(true);
    } catch {
      setError('לא הצלחנו לשלוח. בדקו את החיבור ונסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-right">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-black text-blue-800">
            משכלנתא
          </Link>
          <span className="text-sm font-semibold text-slate-500">ליועצי משכנתאות</span>
        </div>
      </header>

      <main id="main-content" className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1.1fr_1fr]">
        <section className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-black leading-tight text-slate-900 md:text-4xl">
              משרד משכנתאות דיגיטלי, בשם שלכם
            </h1>
            <p className="text-lg text-slate-600">
              משכלנתא היא תוכנה ליועצי משכנתאות. כל יועץ מקבל משרד משלו, עם מיתוג משלו, והלקוחות שלו עובדים מולו בלבד.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <Icon className="mb-2 h-6 w-6 text-violet-600" />
                <p className="font-bold text-slate-900">{title}</p>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-2 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              אנחנו עוברים על כל בקשה בעצמנו, כדי לוודא שכל משרד בפלטפורמה שייך ליועץ אמיתי. אחרי האישור תקבלו מייל עם
              קישור לכניסה, ותוכלו לסדר את המשרד שלכם.
            </span>
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          {sent ? (
            <div className="space-y-3 py-10 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <p className="text-xl font-bold text-slate-900">הבקשה התקבלה</p>
              <p className="text-slate-600">
                שלחנו לכם מייל אישור. נחזור אליכם ברגע שהמשרד שלכם ייפתח.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4" noValidate>
              <h2 className="text-xl font-black text-slate-900">בקשת הצטרפות</h2>
              {error && (
                <p className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </p>
              )}
              <Field id="join-name" label="שם מלא" required>
                <Input id="join-name" value={form.name} onChange={set('name')} autoComplete="name" required maxLength={80} />
              </Field>
              <Field id="join-office" label="שם המשרד" hint="אפשר לשנות אחר כך" required>
                <Input id="join-office" value={form.officeName} onChange={set('officeName')} required maxLength={60} />
              </Field>
              <Field id="join-email" label="מייל" hint="המייל שבו תיכנסו לאזור היועץ" required>
                <Input
                  id="join-email"
                  type="email"
                  dir="ltr"
                  value={form.email}
                  onChange={set('email')}
                  autoComplete="email"
                  required
                  maxLength={120}
                />
              </Field>
              <Field id="join-phone" label="טלפון" required>
                <Input
                  id="join-phone"
                  type="tel"
                  dir="ltr"
                  value={form.phone}
                  onChange={set('phone')}
                  autoComplete="tel"
                  required
                  maxLength={20}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="join-license" label="מספר רישיון">
                  <Input id="join-license" value={form.licenseNumber} onChange={set('licenseNumber')} maxLength={30} />
                </Field>
                <Field id="join-website" label="אתר או עמוד פייסבוק">
                  <Input id="join-website" dir="ltr" value={form.website} onChange={set('website')} maxLength={200} />
                </Field>
              </div>
              <Field id="join-message" label="משהו שחשוב לכם שנדע">
                <textarea
                  id="join-message"
                  value={form.message}
                  onChange={set('message')}
                  rows={3}
                  maxLength={1000}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
              {/* שדה מלכודת לרובוטים: מוסתר מבני אדם ומקוראי מסך */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="join-company">Company</label>
                <input id="join-company" tabIndex={-1} autoComplete="off" value={form.company} onChange={set('company')} />
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-violet-600 py-6 text-base font-bold hover:bg-violet-700">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'שליחת בקשה'}
              </Button>
              <p className="text-center text-xs text-slate-500">
                בשליחה אתם מסכימים ל<Link href="/terms" className="underline">תנאי השימוש</Link> ול
                <Link href="/privacy" className="underline">מדיניות הפרטיות</Link>.
              </p>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  required = false,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="font-bold text-slate-800">
        {label}
        {required && <span className="text-rose-600"> *</span>}
        {hint && <span className="mr-2 text-xs font-normal text-slate-500">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}
