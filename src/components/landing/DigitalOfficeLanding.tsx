'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FolderOpen,
  Gavel,
  Landmark,
  Layers,
  MessagesSquare,
  Scale,
  Sparkles,
  Users,
  Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Mashkalanta from '@/components/ui/mashkalanta';
import { Button } from '@/components/ui/button';
import { LandingFooter } from './LandingShell';
import { OfficeLeadForm } from './OfficeLeadForm';
import { LANDING_TOOLS, LANDING_TOOL_ORDER, platformUrl } from './landingTools';
import { listItems } from '@/lib/landing-content';
import type { LandingContent } from '@/lib/landing-content';


/** הסמל והצבע של כל כרטיס ב"מה המשרד הדיגיטלי עושה". הטקסטים נערכים מלוח היועץ */
const FEATURE_STYLES: Array<{ icon: LucideIcon; tone: string }> = [
  { icon: Landmark, tone: 'from-blue-500 to-cyan-500' },
  { icon: Scale, tone: 'from-violet-500 to-purple-600' },
  { icon: Video, tone: 'from-emerald-500 to-teal-600' },
  { icon: FolderOpen, tone: 'from-amber-500 to-orange-600' },
  { icon: Layers, tone: 'from-sky-500 to-indigo-600' },
  { icon: Gavel, tone: 'from-rose-500 to-pink-600' },
];

const STEP_NUMBERS = [1, 2, 3, 4];


/**
 * "משרד משכנתאות דיגיטלי" — דף נחיתה לשירות הייעוץ עצמו, לא לכלי אחד.
 *
 * הדגש: כל תהליך המשכנתא, כולל התקשורת עם הבנקים, עורך הדין והשמאי, מתנהל
 * מהפלטפורמה. בראש הדף טופס פנייה ליועץ (משכנתא חדשה או מיחזור), מתחתיו מה
 * המשרד הדיגיטלי עושה ואיך התהליך נראה, ובסוף הכלים החינמיים והגישה לפלטפורמה.
 */
export function DigitalOfficeLanding({ content }: { content: LandingContent }) {
  const text = content.office;
  const features = FEATURE_STYLES.map((style, index) => ({
    ...style,
    title: text[`feature${index + 1}Title`],
    text: text[`feature${index + 1}Text`],
  }));
  const scrollToForm = () => document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <a href={platformUrl('/')} className="shrink-0" aria-label="משכלנתא — הפלטפורמה המלאה">
              <Mashkalanta variant="nav" autoPlay />
            </a>
            <span className="hidden h-8 w-px bg-slate-200 md:block" aria-hidden />
            <span className="hidden text-button font-bold text-slate-700 md:inline">משרד משכנתאות דיגיטלי</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href="#free-tools"
              className="hidden rounded-full px-3 py-2 text-button font-bold text-slate-700 transition-colors hover:bg-slate-100 lg:inline-flex"
            >
              הכלים החינמיים
            </a>
            <a
              href={platformUrl('/')}
              className="hidden rounded-full px-3 py-2 text-button font-bold text-blue-700 transition-colors hover:bg-blue-50 lg:inline-flex"
            >
              לפלטפורמה המלאה
            </a>
            <Button
              size="lg"
              onClick={scrollToForm}
              className="bg-violet-600 px-4 font-semibold text-white shadow-lg hover:bg-violet-700 sm:px-5"
            >
              דברו עם יועץ
            </Button>
          </div>
        </div>
      </header>

      <main id="main">
        {/* הפתיחה: המסר משמאל לטופס — הטופס הוא הדבר הראשון שרואים */}
        <section className="relative overflow-hidden bg-hero-soft">
          <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-violet-300/30 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-40 left-10 h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl" aria-hidden />
          <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-8 md:px-6 md:py-14 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-12">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-sm font-black text-violet-800">
                <Building2 className="h-4 w-4" aria-hidden />
                {text.badge}
              </span>
              <h1 className="mt-4 text-balance text-title font-black text-slate-900">
                {text.title} <span className="text-violet-700">{text.titleAccent}</span>
              </h1>
              <p className="mt-4 max-w-xl text-balance text-base leading-relaxed text-slate-600 md:text-lg">
                יועץ משכנתאות אישי, ואיתו כל מי שהעסקה צריכה: הבנקים, עורך הדין, השמאי והבנקאי. הכול מתנהל ישירות
                מהפלטפורמה של משכלנתא, מהבקשה הראשונה ועד החתימה בבנק.
              </p>
              <ul className="mt-6 hidden space-y-2.5 sm:block">
                {listItems(text.heroPoints).map((point) => (
                  <li key={point} className="flex items-start gap-2 text-base font-semibold text-slate-800">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              id="lead-form"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="scroll-mt-20 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7"
            >
              <h2 className="text-subtitle font-black text-slate-900">{text.formTitle}</h2>
              <p className="mb-4 mt-1 text-sm leading-relaxed text-slate-500">
                {text.formSubtitle}
              </p>
              <OfficeLeadForm
                newMortgageLabel={text.newMortgageLabel}
                refinanceLabel={text.refinanceLabel}
                submitLabel={text.submitLabel}
              />
            </motion.div>
          </div>
        </section>

        {/* מה המשרד הדיגיטלי עושה */}
        <section className="px-4 py-14 md:px-6 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-title font-black text-slate-900">{text.featuresTitle}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-balance text-base leading-relaxed text-slate-600 md:text-lg">
                {text.featuresSubtitle}
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-3xl border-2 border-slate-100 bg-white p-6 shadow-md transition-shadow hover:shadow-xl"
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.tone} shadow-lg`}
                    >
                      <Icon className="h-6 w-6 text-white" aria-hidden />
                    </span>
                    <h3 className="mt-4 text-lg font-black text-slate-900">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.text}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* איך זה עובד */}
        <section className="bg-slate-50 px-4 py-14 md:px-6 md:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-title font-black text-slate-900">{text.stepsTitle}</h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-4">
              {STEP_NUMBERS.map((n) => (
                <li key={n} className="relative rounded-3xl bg-white p-6 text-center shadow-md">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-lg font-black text-white shadow-lg">
                    {n}
                  </span>
                  <h3 className="mt-3 text-lg font-black text-slate-900">{text[`step${n}Title`]}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text[`step${n}Text`]}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                onClick={scrollToForm}
                className="bg-violet-600 px-8 py-4 text-cta font-bold text-white shadow-lg hover:bg-violet-700"
              >
                <MessagesSquare className="ml-2 h-5 w-5" aria-hidden />
                {text.stepsCta}
              </Button>
            </div>
          </div>
        </section>

        {/* הכלים החינמיים — כל אחד דף נחיתה משלו */}
        <section id="free-tools" className="scroll-mt-16 px-4 py-14 md:px-6 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-800">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                חינם · בלי הרשמה
              </span>
              <h2 className="mt-3 text-title font-black text-slate-900">{text.toolsTitle}</h2>
              <p className="mx-auto mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
                {text.toolsSubtitle}
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {LANDING_TOOL_ORDER.map((id) => {
                const tool = LANDING_TOOLS[id];
                const Icon = tool.icon;
                return (
                  <Link
                    key={id}
                    href={platformUrl(tool.path)}
                    className="group flex h-full flex-col items-center rounded-3xl border-2 border-slate-200 bg-white p-6 text-center shadow-md transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"
                  >
                    <span
                      className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tool.gradient} shadow-lg transition-transform group-hover:scale-110`}
                    >
                      <Icon className="h-6 w-6 text-white" aria-hidden />
                    </span>
                    <span className="text-lg font-black leading-snug text-slate-900">{content[id].name}</span>
                    <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{content[id].headline}</span>
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

        {/* הפלטפורמה המלאה והקהילה */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 px-4 py-14 text-white md:px-6 md:py-20">
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
              <Button asChild size="lg" className="bg-white px-8 py-4 text-cta font-bold text-blue-800 shadow-xl hover:bg-blue-50">
                <a href={platformUrl('/')}>
                  לפלטפורמה המלאה
                  <ArrowLeft className="mr-2 h-5 w-5" aria-hidden />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={scrollToForm}
                className="border-white/40 bg-white/10 px-8 py-4 text-cta font-bold text-white hover:bg-white/20 hover:text-white"
              >
                {text.formTitle}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
