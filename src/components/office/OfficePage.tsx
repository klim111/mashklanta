import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Eye, LogIn, Mail, MessageCircle, Phone, Settings2, UserPlus } from 'lucide-react';
import { telHref, toolModule, whatsappHref, type PublicOffice } from '@/lib/office';
import { officeStyle } from './officeTheme';
import { OfficeAvatar, OfficeLogo } from './OfficeAvatar';
import { OfficeContactForm } from './OfficeContactForm';
import { OfficeVisitTracker } from './OfficeVisitTracker';
import { PoweredBy } from './PoweredBy';
import { TOOL_ICONS } from './toolIcons';

const STEPS = [
  { title: 'משאירים פרטים או פותחים תיק', text: 'כמה פרטים בסיסיים, ומקבלים אזור אישי מאובטח.' },
  { title: 'מעלים מסמכים ובונים תוכנית', text: 'המסמכים, התמהילים, ההודעות והפגישות במקום אחד.' },
  { title: 'ליווי עד החתימה', text: 'מכרז ריביות מול הבנקים, אישור עקרוני וליווי עד הכסף בחשבון.' },
];

/**
 * דף המשרד הציבורי של יועץ (/o/<slug>): המיתוג שלו — שם, לוגו, צבע, תמונה —
 * פרטי הקשר, השירותים, הכלים החינמיים שבחר, וטופס פנייה שמגיע ישר אליו.
 * "פתיחת תיק" מוביל להרשמה, והלקוח משויך למשרד (OfficeVisitTracker).
 */
export function OfficePage({
  office,
  published,
  ownerView,
}: {
  office: PublicOffice;
  published: boolean;
  /** היועץ עצמו צופה בדף — מוצג פס עם קישור להגדרות */
  ownerView: boolean;
}) {
  const { profile } = office;
  const advisor = profile.advisorName || office.name;
  const registerHref = `/auth/register?office=${encodeURIComponent(office.slug)}`;
  const whatsapp = whatsappHref(profile.whatsapp);
  const phone = telHref(profile.phone);
  const tools = office.publicTools.map(toolModule).filter((tool) => tool.publicHref);

  return (
    <div dir="rtl" style={officeStyle(profile.color)} className="start-aligned min-h-screen bg-white">
      {published && !ownerView && <OfficeVisitTracker slug={office.slug} />}

      {ownerView && (
        <div className="bg-slate-900 text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
            <span className="flex items-center gap-2 font-semibold">
              <Eye className="h-4 w-4 shrink-0" aria-hidden />
              {published
                ? 'כך הלקוחות רואים את המשרד שלכם.'
                : 'תצוגה מקדימה: המשרד עוד לא פעיל, ורק אתם רואים את הדף הזה.'}
            </span>
            <Link
              href="/advisor-dashboard?section=office"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-bold hover:bg-white/20"
            >
              <Settings2 className="h-4 w-4" aria-hidden />
              עריכת המשרד
            </Link>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <OfficeLogo
            name={office.name}
            logoUrl={profile.logoUrl}
            textClassName="truncate text-lg font-black text-slate-900"
          />
          <nav className="flex shrink-0 items-center gap-1.5">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-button font-bold text-slate-700 hover:bg-slate-100"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">כניסה ללקוחות</span>
              <span className="sm:hidden">כניסה</span>
            </Link>
            <Link
              href={registerHref}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--office)] px-4 py-2 text-button font-bold text-white shadow-sm hover:bg-[var(--office-dark)]"
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              פתיחת תיק
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* הפתיחה: מי היועץ ומה הוא מציע, ולצידה הטופס */}
        <section className="bg-[var(--office-soft)]">
          <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-10 md:py-14 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-12">
            <div>
              <div className="flex items-center gap-3">
                <OfficeAvatar name={advisor} photoUrl={profile.photoUrl} />
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-slate-900">{advisor}</p>
                  <p className="text-sm font-semibold text-slate-600">{profile.advisorTitle}</p>
                </div>
              </div>
              <h1 className="mt-6 text-balance text-title font-black text-slate-900">{profile.headline}</h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
                פותחים תיק אישי, ומשם כל התהליך מתנהל במקום אחד: המסמכים, החישובים, ההודעות והפגישות.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link
                  href={registerHref}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--office)] px-5 py-3 text-cta text-white shadow-md hover:bg-[var(--office-dark)]"
                >
                  פתיחת תיק אישי
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                </Link>
                {whatsapp && (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-600 bg-white px-4 py-2.5 text-cta text-emerald-700 hover:bg-emerald-50"
                  >
                    <MessageCircle className="h-5 w-5" aria-hidden />
                    וואטסאפ
                  </a>
                )}
                {phone && (
                  <a
                    href={phone}
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-cta text-slate-800 hover:bg-slate-50"
                  >
                    <Phone className="h-5 w-5" aria-hidden />
                    <span dir="ltr">{profile.phone}</span>
                  </a>
                )}
              </div>
              {profile.services.length > 0 && (
                <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">
                  {profile.services.map((service) => (
                    <li key={service} className="flex items-start gap-2 text-base font-semibold text-slate-800">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--office)]" aria-hidden />
                      {service}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              id="contact"
              className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
            >
              <h2 className="text-subtitle font-black text-slate-900">השאירו פרטים</h2>
              <p className="mb-4 mt-1 text-sm text-slate-500">{advisor} יחזור אליכם, בדרך כלל עוד באותו יום.</p>
              <OfficeContactForm slug={office.slug} advisorName={advisor} disabled={!published} />
            </div>
          </div>
        </section>

        {tools.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-12">
            <h2 className="text-subtitle font-black text-slate-900">כלים חינמיים לבדיקה עצמית</h2>
            <p className="mt-1 text-sm text-slate-500">בלי הרשמה. מה שתזינו יחכה לכם בתיק האישי אם תפתחו אותו.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => {
                const Icon = TOOL_ICONS[tool.id];
                return (
                  <Link
                    key={tool.id}
                    href={tool.publicHref!}
                    className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--office-soft)] text-[var(--office)]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-black text-slate-900">{tool.label}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-slate-500">{tool.hint}</span>
                    </span>
                    <ArrowLeft
                      className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-[var(--office)]"
                      aria-hidden
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="border-y border-slate-100 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 className="text-subtitle font-black text-slate-900">איך זה עובד</h2>
            <ol className="mt-5 grid gap-3 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--office)] text-base font-black text-white">
                    {index + 1}
                  </span>
                  <p className="mt-3 text-base font-black text-slate-900">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {profile.about && (
          <section className="mx-auto max-w-6xl px-4 py-12">
            <div className="flex flex-col gap-5 rounded-3xl border border-slate-200 p-6 sm:flex-row sm:items-start md:p-8">
              <OfficeAvatar name={advisor} photoUrl={profile.photoUrl} size="lg" />
              <div className="min-w-0">
                <h2 className="text-subtitle font-black text-slate-900">נעים להכיר, {advisor}</h2>
                <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-slate-700">{profile.about}</p>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center">
          <p className="text-base font-black text-slate-900">{office.name}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-slate-600">
            {phone && (
              <a href={phone} className="inline-flex items-center gap-1.5 hover:text-slate-900">
                <Phone className="h-4 w-4" aria-hidden />
                <span dir="ltr">{profile.phone}</span>
              </a>
            )}
            {profile.email && (
              <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-1.5 hover:text-slate-900">
                <Mail className="h-4 w-4" aria-hidden />
                <span dir="ltr">{profile.email}</span>
              </a>
            )}
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-slate-900"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                וואטסאפ
              </a>
            )}
          </div>
          <PoweredBy className="mt-2" />
        </div>
      </footer>
    </div>
  );
}
