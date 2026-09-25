'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUpLeft,
  BookOpen,
  Compass,
  Eye,
  Layers3,
  ScanSearch,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Wallet,
} from 'lucide-react';
import NavBar from '@/components/ui/navbar';
import Footer from '@/components/ui/footer';
import { Button } from '@/components/ui/button';
import JourneyExplorer from '@/components/platform/JourneyExplorer';
import DefaultVsAdvisor from '@/components/platform/DefaultVsAdvisor';
import ToolsShowcase from '@/components/platform/ToolsShowcase';
import PlatformBridge from '@/components/platform/PlatformBridge';
import FlexibilityMixer from '@/components/platform/FlexibilityMixer';
import AnimatedNumber from '@/components/platform/AnimatedNumber';
import { journeyStages } from '@/data/platform/journey';
import { platformTools } from '@/data/platform/tools';
import { PLATFORM_PROCESS_PRICE, pricingPlans } from '@/data/platform/pricing';
import { ServiceFlowSteps } from '@/components/service-flow/ServiceFlowSteps';
import { PricingModelStrip } from '@/components/service-flow/PricingModelStrip';

const sectionNav = [
  { id: 'idea', label: 'הרעיון' },
  { id: 'start', label: 'איך מתחילים' },
  { id: 'journey', label: 'חמשת השלבים' },
  { id: 'modes', label: 'מסלולי שימוש' },
  { id: 'proof', label: 'ההשוואה' },
  { id: 'tools', label: 'הכלים' },
  { id: 'life', label: 'אחרי החתימה' },
];

const afterSigning = [
  {
    title: 'מעקב יתרות ותחזיות',
    description: 'רואים בכל רגע כמה נשאר בכל מסלול, מה הריבית המשוקללת, ואיך לוח הסילוקין ייראה בשנים הבאות.',
    href: '/mortgage-dashboard',
    label: 'דשבורד המשכנתא',
  },
  {
    title: 'ניירת ומסמכים',
    description: 'תיק דיגיטלי אחד לכל המסמכים — מהבקשה ועד הביטוחים — עם התראות כשמסמך פג תוקף.',
    href: '/dashboard',
    label: 'תיק המסמכים',
  },
  {
    title: 'תכנון הון עצמי והלוואות נלוות',
    description: 'מתכננים את המקדמה, מס הרכישה והוצאות הנלוות, ומנהלים הלוואות צרכניות שלא יפגעו ביחס ההחזר.',
    href: '/equity-planning',
    label: 'תכנון הון עצמי',
  },
  {
    title: 'בדיקת מיחזור ופירעון מוקדם',
    description: 'כשהריבית בשוק זזה — בודקים אם כדאי למחזר, לפרוע או להחליף מסלול, לפני שפונים לבנק.',
    href: '/mortgage-refinance',
    label: 'מיחזור משכנתא',
  },
];

const pillars = [
  {
    icon: Eye,
    title: 'שקיפות מלאה',
    description:
      'כל חישוב שהיועץ עושה גלוי לכם. אותו לוח סילוקין, אותו IRR, אותם מספרים — בלי קופסה שחורה.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: SlidersHorizontal,
    title: 'גמישות מוחלטת',
    description:
      'חמישה שלבים, ובכל אחד אתם מחליטים מחדש: לעשות לבד או להעביר ליועץ. גם באמצע התהליך.',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: ScanSearch,
    title: 'ביקורת על העבודה',
    description:
      'הפלטפורמה מציגה את תוצר היועץ מול ברירת המחדל של הבנק — כדי שתדעו בדיוק כמה הוא שווה.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: ShieldCheck,
    title: 'ליווי אחרי החתימה',
    description:
      'המשכנתא לא נגמרת ביום החתימה. מעקב יתרות, תחזיות, פירעונות מוקדמים ובדיקת מיחזור.',
    gradient: 'from-amber-500 to-orange-600',
  },
];

export default function HowItWorksPage() {
  const [activeSection, setActiveSection] = useState('idea');

  useEffect(() => {
    const sections = sectionNav
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.2, 0.5] }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <NavBar />
      </div>

      {/* ─────────────────────────── Hero ─────────────────────────── */}
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden bg-brand-dark px-4 text-white">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 right-[8%] h-[26rem] w-[26rem] rounded-full bg-blue-500/20 blur-3xl animate-blob" />
          <div className="absolute bottom-[-6rem] left-[6%] h-[30rem] w-[30rem] rounded-full bg-violet-500/20 blur-3xl animate-blob [animation-delay:3s]" />
          <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl animate-float-slow" />
          <div
            className="absolute bottom-0 left-0 right-0 h-64 opacity-25"
            style={{
              background:
                'linear-gradient(180deg, transparent, rgba(0,0,0,0.4)), repeating-linear-gradient(90deg, rgba(255,255,255,0.09) 0px, rgba(255,255,255,0.09) 1px, transparent 1px, transparent 64px), repeating-linear-gradient(0deg, rgba(255,255,255,0.09) 0px, rgba(255,255,255,0.09) 1px, transparent 1px, transparent 64px)',
              transform: 'perspective(420px) rotateX(62deg)',
              transformOrigin: 'bottom',
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 mx-auto max-w-4xl text-center"
        >
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
            <Compass className="h-4 w-4" />
            איך הפלטפורמה עובדת
          </div>

          <h1 className="mb-6 text-title font-black leading-[1.15] text-white">
            כל מה שיועץ משכנתאות עושה —
            <br />
            <span className="bg-gradient-to-l from-cyan-200 via-sky-100 to-violet-200 bg-clip-text text-transparent">
              גלוי, מדיד ובידיים שלכם
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-100 md:text-xl">
            משכלתנא היא צומת המפגש בין לקוח ליועץ. אתם בוחרים אילו שלבים לעשות לבד ואילו
            להעביר ליועץ, משלמים רק על מה שלקחתם — ורואים בכל רגע את ההפרש בין ברירת המחדל
            של הבנק לבין התוצר האמיתי.
          </p>

          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {journeyStages.map((stage, i) => (
              <motion.a
                key={stage.id}
                href="#journey"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.07 }}
                className="rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition-colors hover:bg-white/25"
              >
                {stage.number}. {stage.shortTitle}
              </motion.a>
            ))}
          </div>

          <div className="mb-14 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-white px-8 text-base font-bold text-indigo-900 shadow-xl hover:bg-blue-50 hover:text-indigo-900"
            >
              <a href="#journey">
                <Layers3 className="ml-2 h-5 w-5" />
                חמשת השלבים
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              className="border border-white/40 bg-white/15 px-8 text-base font-bold text-white shadow-none hover:bg-white/25 hover:text-white"
            >
              <Link href="/pricing">
                <Tag className="ml-2 h-5 w-5" />
                מודל התמחור
              </Link>
            </Button>
          </div>

          {/* Hero stats */}
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { value: journeyStages.length, suffix: '', label: 'שלבים לבחירה' },
              { value: platformTools.length, suffix: '', label: 'כלים בפלטפורמה' },
              { value: PLATFORM_PROCESS_PRICE, prefix: '₪', label: 'לתהליך משכנתא — גישה מלאה לפלטפורמה' },
              { value: 100, suffix: '%', label: 'מדמי הפלטפורמה מקוזזים כשמזמינים ליווי' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-4 backdrop-blur"
              >
                <div className="text-2xl font-black text-white md:text-3xl">
                  <AnimatedNumber value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </div>
                <div className="mt-1 text-xs text-slate-100 md:text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.a
          href="#idea"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="absolute bottom-6 text-white/60 transition-colors hover:text-white"
          aria-label="גלול למטה"
        >
          <ArrowDown className="h-8 w-8 animate-bounce" />
        </motion.a>
      </section>

      {/* ───────────────────── Sticky section nav ───────────────────── */}
      <nav className="sticky top-14 z-40 border-b border-slate-100 bg-white/90 shadow-sm backdrop-blur md:top-[73px]">
        <div className="mx-auto max-w-6xl overflow-x-auto px-4">
          <ul className="flex min-w-max justify-center gap-1 py-3">
            {sectionNav.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`block whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-all ${
                    activeSection === item.id
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/pricing"
                className="block whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold text-blue-600 transition-all hover:bg-blue-50"
              >
                תמחור ↗
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* ─────────────────────────── The idea ─────────────────────────── */}
      <section id="idea" className="scroll-mt-32 bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-14 max-w-3xl text-center"
          >
            <h2 className="mb-5 text-title font-black text-slate-900">
              פלטפורמה אחת, שני צדדים
            </h2>
            <p className="text-lg leading-relaxed text-slate-600">
              היועץ מנהל מכאן את הלקוחות שלו ומציג את תוצר העבודה. הלקוח עוקב אחרי כל שלב,
              מחשב הכל בעצמו, ומקבל גישה לאותם כלים בדיוק. אף צד לא עובד באפלה.
            </p>
          </motion.div>

          <PlatformBridge />

          {/* Pillars */}
          <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar, i) => {
              const Icon = pillar.icon;
              return (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 26 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${pillar.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mb-2 text-subtitle font-bold text-slate-900">{pillar.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {pillar.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────── How to start ─────────────────────────── */}
      <section id="start" className="scroll-mt-32 bg-brand-dark py-20 text-white md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-12 max-w-3xl text-center"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur">
              <Compass className="h-4 w-4" />
              איך מתחילים
            </div>
            <h2 className="mb-5 text-title font-black text-white">
              שתי שאלות, ואתם בדרך
            </h2>
            <p className="text-lg leading-relaxed text-slate-100">
              באזור האישי ובעמוד הבית שואלים אתכם רק מה תרצו לעשות וכמה עזרה תרצו. מכאן הפלטפורמה
              יודעת אם לפתוח לכם את הכלי, להתחיל בסיור, או להעביר את הבקשה ליועץ.
            </p>
          </motion.div>

          <ServiceFlowSteps tone="dark" />

          <div className="mt-10 text-center">
            <Button
              asChild
              size="lg"
              className="bg-white px-8 text-base font-bold text-indigo-900 shadow-xl hover:bg-blue-50 hover:text-indigo-900"
            >
              <Link href="/#start">
                מה תרצו לעשות?
                <ArrowUpLeft className="mr-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────── Journey ─────────────────────────── */}
      <section
        id="journey"
        className="scroll-mt-32 bg-hero-soft py-20 md:py-28"
      >
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-14 max-w-3xl text-center"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
              <Layers3 className="h-4 w-4" />
              עבודת היועץ, שלב אחר שלב
            </div>
            <h2 className="mb-5 text-title font-black text-slate-900">
              חמישה שלבים. בכל אחד — אתם בוחרים
            </h2>
            <p className="text-lg leading-relaxed text-slate-600">
              לחצו על כל שלב כדי לראות מה היועץ עושה בפועל, מה הערך שאתם מקבלים, ואיך
              הפלטפורמה מאפשרת לכם לבצע את אותו שלב בעצמכם.
            </p>
          </motion.div>

          <JourneyExplorer />
        </div>
      </section>

      {/* ─────────────────────────── Modes ─────────────────────────── */}
      <section id="modes" className="scroll-mt-32 bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-14 max-w-3xl text-center"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">
              <Wallet className="h-4 w-4" />
              מודל התמחור
            </div>
            <h2 className="mb-5 text-title font-black text-slate-900">
              משלמים רק על מה שלקחתם — ותמיד מתחת לממוצע בשוק
            </h2>
            <p className="text-lg leading-relaxed text-slate-600">
              אין חבילה אחת שמתאימה לכולם. בכל שלב מחליטים מחדש — לבד, או עם יועץ משלב אחד ועד כל
              שלבי התכנון. מה ששילמתם על הפלטפורמה מקוזז, והגישה אליה כלולה בכל ליווי.
            </p>
          </motion.div>

          <div className="mb-14">
            <PricingModelStrip />
          </div>

          <div className="mb-16">
            <FlexibilityMixer />
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {pricingPlans.map((plan, i) => {
              const Icon = plan.icon;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative flex flex-col rounded-3xl border-2 bg-white p-7 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                    plan.popular ? 'border-violet-400' : 'border-slate-200'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3.5 right-7 rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 px-4 py-1 text-xs font-black text-white shadow-lg">
                      הבחירה של רוב הלקוחות
                    </span>
                  )}

                  <div
                    className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${plan.gradient} shadow-lg`}
                  >
                    <Icon className="h-7 w-7 text-white" />
                  </div>

                  <h3 className="text-subtitle font-black text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {plan.tagline}
                  </p>

                  <div className="my-6 border-y border-slate-100 py-5">
                    <div
                      className={`font-black text-slate-900 ${
                        plan.id === 'full' ? 'text-subtitle leading-snug' : 'text-4xl'
                      }`}
                    >
                      {plan.price}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{plan.priceNote}</div>
                  </div>

                  <ul className="mb-6 flex-1 space-y-2.5">
                    {plan.features.slice(0, 4).map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                    <strong className="text-slate-900">מתאים ל:</strong> {plan.bestFor}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Button
              asChild
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 px-8 text-base font-bold text-white shadow-xl hover:text-white"
            >
              <Link href="/pricing">
                לעמוד התמחור המלא
                <ArrowUpLeft className="mr-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────── Proof ─────────────────────────── */}
      <section
        id="proof"
        className="scroll-mt-32 bg-slate-50 py-20 md:py-28"
      >
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-14 max-w-3xl text-center"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
              <ScanSearch className="h-4 w-4" />
              מדידת איכות העבודה
            </div>
            <h2 className="mb-5 text-title font-black text-slate-900">
              ברירת המחדל מול התוצר האמיתי
            </h2>
            <p className="text-lg leading-relaxed text-slate-600">
              זה הלב של הפלטפורמה. כל תמהיל וכל הצעה שהתקבלה מהבנק נמדדים מול נקודת הפתיחה —
              כדי שתראו במספרים מה בדיוק הרוויחה העבודה שנעשתה.
            </p>
          </motion.div>

          <DefaultVsAdvisor />
        </div>
      </section>

      {/* ─────────────────────────── Tools ─────────────────────────── */}
      <section id="tools" className="scroll-mt-32 bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-12 max-w-3xl text-center"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
              <SlidersHorizontal className="h-4 w-4" />
              ארגז הכלים המלא
            </div>
            <h2 className="mb-5 text-title font-black text-slate-900">
              {platformTools.length} כלים — כולם פתוחים בפניכם
            </h2>
            <p className="text-lg leading-relaxed text-slate-600">
              אלה בדיוק הכלים שיועץ משכנתאות עובד איתם ביום-יום. במסלול העצמאי כולם זמינים
              לכם ללא הגבלה, ובמסלול עם יועץ אתם רואים כל חישוב שהוא מבצע.
            </p>
          </motion.div>

          <ToolsShowcase />
        </div>
      </section>

      {/* ─────────────────────────── After signing ─────────────────────────── */}
      <section
        id="life"
        className="scroll-mt-32 bg-brand-dark py-20 text-white md:py-28"
      >
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-14 max-w-3xl text-center"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              המשכנתא לא נגמרת בחתימה
            </div>
            <h2 className="mb-5 text-title font-black text-white">
              מעקב, תחזיות ותכנון — גם אחרי שהבנק חתם
            </h2>
            <p className="text-lg leading-relaxed text-slate-100">
              הפלטפורמה נשארת איתכם: לעקוב אחרי היתרות, לנהל את הניירת, לתכנן הון עצמי והלוואות נלוות,
              ולבדוק מתי כדאי למחזר.
            </p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2">
            {afterSigning.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  href={item.href}
                  className="group flex h-full flex-col rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur transition-all hover:-translate-y-1 hover:bg-white/10 hover:shadow-2xl"
                >
                  <h3 className="mb-2 text-subtitle font-black text-white">{item.title}</h3>
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-100">
                    {item.description}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-cyan-200">
                    {item.label}
                    <ArrowUpLeft className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────── CTA ─────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-dark py-20 text-white md:py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float" />
          <div className="absolute -bottom-24 left-1/4 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl animate-float-slow" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-3xl px-4 text-center"
        >
          <h2 className="mb-5 text-title font-black text-white">
            מוכנים להתחיל?
          </h2>
          <p className="mb-10 text-lg leading-relaxed text-slate-100">
            בחרו מה תרצו לעשות, התחילו בסיור בכלי או בקשו ליווי — והחליטו בהמשך אילו שלבים
            להעביר ליועץ. אפשר לשנות את ההרכב בכל רגע.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-white px-8 text-base font-bold text-indigo-900 shadow-xl hover:bg-blue-50 hover:text-indigo-900"
            >
              <Link href="/#start">מה תרצו לעשות?</Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="border border-white/40 bg-white/15 px-8 text-base font-bold text-white shadow-none hover:bg-white/25 hover:text-white"
            >
              <Link href="/pricing">
                <Tag className="ml-2 h-5 w-5" />
                מסלולי התמחור
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="bg-transparent px-8 text-base font-bold text-white shadow-none hover:bg-white/15 hover:text-white"
            >
              <Link href="/learn">
                <BookOpen className="ml-2 h-5 w-5" />
                מרכז הלמידה
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
