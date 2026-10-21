'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, ChevronDown, HeartHandshake, Mail, Phone, Sparkles, Users } from 'lucide-react';
import Mashkalanta from '@/components/ui/mashkalanta';
import { Button } from '@/components/ui/button';
import { AdvisorLeadDialog } from '@/components/plan/advisor/AdvisorLeadDialog';
import { FamilyEconomyLeadDialog } from '@/components/advisor/FamilyEconomyAdvisor';
import { SITE_CONTACT } from '@/lib/site-contact';
import { LandingModeProvider } from './LandingMode';
import { LANDING_TOOLS, LANDING_TOOL_ORDER, platformUrl } from './landingTools';
import type { LandingToolId } from './landingTools';
import { listItems } from '@/lib/landing-content';
import type { LandingContent } from '@/lib/landing-content';

/**
 * דף נחיתה של כלי חינמי אחד — אתר עצמאי שנפתח ישר בכלי.
 *
 * למעלה כותרת קצרה עם הלוגו, הקישור לקהילה וכפתור הייעוץ. מתחת שורת פתיחה
 * קצרה ואז הכלי עצמו, בלי סרגל הניווט של הפלטפורמה. אחרי הכלי: הזמנה להצטרף
 * לקהילת משכלנתא בפלטפורמה המלאה, שלושת הכלים האחרים, ושורת פרטי קשר.
 */
export function LandingShell({
  toolId,
  content,
  children,
}: {
  toolId: LandingToolId;
  /** הטקסטים של כל דפי הנחיתה, כפי שהיועץ ערך אותם */
  content: LandingContent;
  children: React.ReactNode;
}) {
  const tool = LANDING_TOOLS[toolId];
  const Icon = tool.icon;
  const [leadOpen, setLeadOpen] = useState(false);
  const text = content[toolId];
  const advisorLabel = text.consultLabel;
  const others = LANDING_TOOL_ORDER.filter((id) => id !== toolId).map((id) => LANDING_TOOLS[id]);

  const scrollToTool = () => document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <LandingModeProvider>
      <div dir="rtl" className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur-md print:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <a href={platformUrl('/')} className="shrink-0" aria-label="משכלנתא — הפלטפורמה המלאה">
                <Mashkalanta variant="nav" autoPlay />
              </a>
              <span className="hidden h-8 w-px bg-slate-200 md:block" aria-hidden />
              <span className="hidden min-w-0 items-center gap-2 md:inline-flex">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tool.gradient}`}>
                  <Icon className="h-4 w-4 text-white" aria-hidden />
                </span>
                <span className="truncate text-button font-bold text-slate-700">{text.name}</span>
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <a
                href={platformUrl('/')}
                className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-button font-bold text-blue-700 transition-colors hover:bg-blue-50 lg:inline-flex"
              >
                <Users className="h-4 w-4" aria-hidden />
                הצטרפו לקהילת משכלנתא
              </a>
              <Button
                size="lg"
                onClick={() => setLeadOpen(true)}
                className="bg-violet-600 px-3 font-semibold text-white shadow-lg hover:bg-violet-700 sm:px-5"
              >
                <HeartHandshake className="ml-1.5 h-4 w-4" aria-hidden />
                {advisorLabel}
              </Button>
            </div>
          </div>
        </header>

        <main id="main">
          {/* שורת הפתיחה — קצרה בכוונה, כדי שהכלי עצמו ייראה כבר במסך הראשון */}
          <section className="relative overflow-hidden bg-hero-soft">
            <div
              className={`pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br ${tool.gradient} opacity-15 blur-3xl`}
              aria-hidden
            />
            <div className="relative mx-auto max-w-5xl px-4 pb-5 pt-5 text-center md:px-6 md:pb-8 md:pt-10">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-800">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  חינם · בלי הרשמה
                </span>
                <h1 className="mx-auto mt-3 max-w-3xl text-balance text-title font-black text-slate-900">{text.headline}</h1>
                <p className="mx-auto mt-2 max-w-2xl text-balance text-sm leading-relaxed text-slate-600 md:mt-3 md:text-lg">
                  {text.subtitle}
                </p>
                <ul className="mt-5 hidden flex-wrap sm:flex items-center justify-center gap-2">
                  {listItems(text.highlights).map((item) => (
                    <li
                      key={item}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={scrollToTool}
                  className="mt-5 hidden items-center gap-1 text-button sm:inline-flex font-bold text-blue-700 hover:text-blue-900"
                >
                  מתחילים כאן
                  <ChevronDown className="h-4 w-4 animate-bounce" aria-hidden />
                </button>
              </motion.div>
            </div>
          </section>

          <div id="tool" className="scroll-mt-16">
            {children}
          </div>

          {/* הקהילה — הדרך מהכלי הבודד לפלטפורמה המלאה */}
          <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 px-4 py-14 text-white md:px-6 md:py-20 print:hidden">
            <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" aria-hidden />
            <div className="relative mx-auto max-w-4xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white">
                <Users className="h-4 w-4" aria-hidden />
                קהילת משכלנתא
              </span>
              <h2 className="mx-auto mt-4 max-w-3xl text-balance text-title font-black text-white">
                {text.communityTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-balance text-base leading-relaxed text-blue-100 md:text-lg">
                {text.communityText}
              </p>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-white px-8 py-4 text-cta font-bold text-blue-800 shadow-xl hover:bg-blue-50"
                >
                  <a href={platformUrl('/')}>
                    לפלטפורמה המלאה
                    <ArrowLeft className="mr-2 h-5 w-5" aria-hidden />
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setLeadOpen(true)}
                  className="border-white/40 bg-white/10 px-8 py-4 text-cta font-bold text-white hover:bg-white/20 hover:text-white"
                >
                  <HeartHandshake className="ml-2 h-5 w-5" aria-hidden />
                  {advisorLabel}
                </Button>
              </div>
            </div>
          </section>

          {/* שלושת הכלים החינמיים האחרים — כל אחד דף נחיתה משלו */}
          <section className="bg-white px-4 py-12 md:px-6 md:py-16 print:hidden">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-center text-subtitle font-black text-slate-900">עוד כלים חינמיים של משכלנתא</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {others.map((other) => {
                  const OtherIcon = other.icon;
                  return (
                    <Link
                      key={other.id}
                      href={platformUrl(other.path)}
                      className="group flex h-full flex-col items-center rounded-3xl border-2 border-slate-200 bg-white p-6 text-center shadow-md transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"
                    >
                      <span
                        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${other.gradient} shadow-lg transition-transform group-hover:scale-110`}
                      >
                        <OtherIcon className="h-6 w-6 text-white" aria-hidden />
                      </span>
                      <span className="text-lg font-black leading-snug text-slate-900">{content[other.id].name}</span>
                      <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{content[other.id].headline}</span>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-600">
                        לכלי
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        </main>

        <LandingFooter />

        {tool.advisor === 'family' ? (
          <FamilyEconomyLeadDialog open={leadOpen} onOpenChange={setLeadOpen} />
        ) : (
          <AdvisorLeadDialog open={leadOpen} onOpenChange={setLeadOpen} topic={tool.leadTopic} />
        )}
      </div>
    </LandingModeProvider>
  );
}

/** שורת פרטי הקשר והקישורים המשפטיים בתחתית דפי הנחיתה */
export function LandingFooter() {
  return (
    <footer className="bg-slate-900 px-4 py-8 text-sm text-slate-300 md:px-6 print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <p>
          © {new Date().getFullYear()} {SITE_CONTACT.brand}. המחשבונים מציגים הערכה ואינם מהווים ייעוץ או הצעת אשראי.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a href={SITE_CONTACT.phoneHref} className="inline-flex items-center gap-1.5 hover:text-white">
            <Phone className="h-4 w-4" aria-hidden />
            <span dir="ltr">{SITE_CONTACT.phone}</span>
          </a>
          <a href={SITE_CONTACT.emailHref} className="inline-flex items-center gap-1.5 hover:text-white">
            <Mail className="h-4 w-4" aria-hidden />
            {SITE_CONTACT.email}
          </a>
          <a href={platformUrl('/terms')} className="hover:text-white">
            תנאי שימוש
          </a>
          <a href={platformUrl('/privacy')} className="hover:text-white">
            מדיניות פרטיות
          </a>
        </div>
      </div>
    </footer>
  );
}
