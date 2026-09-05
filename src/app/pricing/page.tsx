'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowUpLeft,
  BadgeCheck,
  Calculator,
  Check,
  Compass,
  Minus,
  Sparkles,
  Tag,
  Wallet,
} from 'lucide-react';
import NavBar from '@/components/ui/navbar';
import Footer from '@/components/ui/footer';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import PackageBuilder from '@/components/platform/PackageBuilder';
import { journeyStages, stagesTotalPrice } from '@/data/platform/journey';
import {
  BUNDLE_SAVING,
  FULL_SERVICE_PRICE,
  PLATFORM_MONTHLY_PRICE,
  comparisonRows,
  pricingFaq,
  pricingPlans,
} from '@/data/platform/pricing';

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
        <Check className="h-4 w-4 text-emerald-600" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
        <Minus className="h-4 w-4 text-gray-400" />
      </span>
    );
  }
  return <span className="text-sm font-semibold text-gray-700">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <div className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-md">
        <NavBar />
      </div>

      {/* ─────────────────────────── Hero ─────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-4 py-24 text-white md:py-32">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 right-[10%] h-96 w-96 rounded-full bg-violet-500/25 blur-3xl animate-blob" />
          <div className="absolute -bottom-24 left-[10%] h-96 w-96 rounded-full bg-blue-500/25 blur-3xl animate-blob [animation-delay:3s]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative mx-auto max-w-4xl text-center"
        >
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
            <Tag className="h-4 w-4" />
            מודל התמחור
          </div>

          <h1 className="mb-6 text-4xl font-black leading-[1.15] text-white md:text-6xl">
            משלמים על עבודה,
            <br />
            <span className="bg-gradient-to-l from-cyan-200 via-sky-100 to-fuchsia-200 bg-clip-text text-transparent">
              לא על חבילה
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-100 md:text-xl">
            כל אחד מחמשת שלבי המשכנתא מתומחר בנפרד. עשיתם שלב לבד — לא שילמתם עליו.
            רוצים שהיועץ ייקח את כולם — מקבלים מחיר חבילה.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-white px-8 text-base font-bold text-indigo-900 shadow-xl hover:bg-blue-50 hover:text-indigo-900"
            >
              <a href="#builder">
                <Calculator className="ml-2 h-5 w-5" />
                בנו את החבילה שלכם
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              className="border border-white/40 bg-white/15 px-8 text-base font-bold text-white shadow-none hover:bg-white/25 hover:text-white"
            >
              <Link href="/how-it-works">
                <Compass className="ml-2 h-5 w-5" />
                איך זה עובד
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ─────────────────────── Three plans ─────────────────────── */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-14 max-w-3xl text-center"
          >
            <h2 className="mb-5 text-3xl font-black text-gray-900 md:text-5xl">
              שלושה מסלולים, מעבר חופשי ביניהם
            </h2>
            <p className="text-lg leading-relaxed text-gray-600">
              רוב הלקוחות מתחילים לבד ומצרפים יועץ בשלב שבו זה באמת משתלם — התמהיל וההתמחרות.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
            {pricingPlans.map((plan, i) => {
              const Icon = plan.icon;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative flex h-full flex-col rounded-3xl border-2 bg-white p-5 shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl sm:p-8 ${
                    plan.popular
                      ? 'border-violet-400 lg:-mt-4 lg:pb-12 lg:shadow-2xl'
                      : 'border-gray-200'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3.5 right-8 rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 px-4 py-1 text-xs font-black text-white shadow-lg">
                      הכי נבחר
                    </span>
                  )}

                  <div
                    className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${plan.gradient} shadow-lg`}
                  >
                    <Icon className="h-7 w-7 text-white" />
                  </div>

                  <h3 className="text-2xl font-black text-gray-900">{plan.name}</h3>
                  <p className="mt-1.5 min-h-[3rem] text-sm leading-relaxed text-gray-600">
                    {plan.tagline}
                  </p>

                  <div className="my-6 border-y border-gray-100 py-5">
                    <div className="text-4xl font-black text-gray-900">{plan.price}</div>
                    <div className="mt-1 text-sm text-gray-600">{plan.priceNote}</div>
                  </div>

                  <ul className="mb-7 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="text-sm leading-relaxed text-gray-700">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mb-5 rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
                    <strong className="text-gray-900">מתאים ל:</strong> {plan.bestFor}
                  </div>

                  <Button
                    asChild
                    size="lg"
                    className={`w-full text-base font-bold text-white shadow-lg ${
                      plan.popular
                        ? 'bg-gradient-to-l from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 hover:text-white'
                        : 'bg-gray-900 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Link href={plan.ctaHref}>{plan.ctaLabel}</Link>
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────── Stage pricing ─────────────────────── */}
      <section
        id="builder"
        className="scroll-mt-24 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50 py-20 md:py-28"
      >
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-12 max-w-3xl text-center"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
              <Calculator className="h-4 w-4" />
              מחשבון החבילה
            </div>
            <h2 className="mb-5 text-3xl font-black text-gray-900 md:text-5xl">
              סמנו מה היועץ יעשה — ותראו מחיר מיד
            </h2>
            <p className="text-lg leading-relaxed text-gray-600">
              כל שלב שלא סימנתם הוא שלב שאתם מבצעים בעצמכם בפלטפורמה, ללא עלות מעבר למנוי
              החודשי. בחרתם את כל החמישה? המחיר יורד אוטומטית למחיר החבילה.
            </p>
          </motion.div>

          <PackageBuilder />

          {/* Price anchors */}
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              {
                label: 'סכום חמשת השלבים בנפרד',
                value: `₪${stagesTotalPrice.toLocaleString('he-IL')}`,
                note: 'כשרוכשים אותם אחד־אחד',
                tone: 'text-gray-900',
              },
              {
                label: 'מחיר חבילת הליווי המלא',
                value: `₪${FULL_SERVICE_PRICE.toLocaleString('he-IL')}`,
                note: 'כולל מנוי לפלטפורמה',
                tone: 'text-blue-700',
              },
              {
                label: 'החיסכון בחבילה',
                value: `₪${BUNDLE_SAVING.toLocaleString('he-IL')}`,
                note: `כ-${Math.round((BUNDLE_SAVING / stagesTotalPrice) * 100)}% הנחה`,
                tone: 'text-emerald-700',
              },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-md"
              >
                <div className="text-sm font-semibold text-gray-600">{item.label}</div>
                <div className={`my-1.5 text-3xl font-black ${item.tone}`}>{item.value}</div>
                <div className="text-xs text-gray-600">{item.note}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────── Stage price list ─────────────────────── */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-12 max-w-3xl text-center"
          >
            <h2 className="mb-5 text-3xl font-black text-gray-900 md:text-5xl">
              מחירון השלבים
            </h2>
            <p className="text-lg leading-relaxed text-gray-600">
              מה כלול בכל שלב, כמה הוא עולה עם יועץ, ומה מקבלים במקומו כשעושים אותו לבד.
            </p>
          </motion.div>

          <div className="space-y-4">
            {journeyStages.map((stage, i) => {
              const Icon = stage.icon;
              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition-shadow hover:shadow-xl"
                >
                  <div className={`h-1 w-full bg-gradient-to-l ${stage.gradient}`} />
                  <div className="grid gap-5 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${stage.gradient} shadow-lg`}
                    >
                      <Icon className="h-7 w-7 text-white" />
                    </div>

                    <div>
                      <div className="text-xs font-bold text-gray-600">
                        שלב {stage.number} · {stage.duration}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{stage.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">
                        {stage.valueHeadline} — {stage.tagline}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {stage.tools.map((tool) => (
                          <Link
                            key={tool.href + tool.label}
                            href={tool.href}
                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                          >
                            {tool.label}
                            <ArrowUpLeft className="h-3 w-3" />
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-row items-center gap-6 md:flex-col md:items-end md:gap-2">
                      <div className="text-right md:text-left">
                        <div className="text-2xl font-black text-gray-900">
                          ₪{stage.advisorPrice.toLocaleString('he-IL')}
                        </div>
                        <div className="text-xs font-semibold text-gray-600">עם יועץ</div>
                      </div>
                      <div className="text-right md:text-left">
                        <div className="text-sm font-black text-blue-700">כלול במנוי</div>
                        <div className="text-xs font-semibold text-gray-600">
                          בביצוע עצמי
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────── Comparison table ─────────────────────── */}
      <section className="bg-gradient-to-br from-gray-50 to-slate-100 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-12 max-w-3xl text-center"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">
              <BadgeCheck className="h-4 w-4" />
              השוואה מלאה
            </div>
            <h2 className="text-3xl font-black text-gray-900 md:text-5xl">
              מה כלול בכל מסלול
            </h2>
          </motion.div>

          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="overflow-x-auto overscroll-x-contain">
              <p className="mb-2 px-4 pt-3 text-center text-xs text-gray-500 md:hidden">גללו הצידה לצפייה בהשוואה המלאה</p>
              <table className="w-full min-w-[560px] text-right">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="px-6 py-4 text-sm font-bold">יכולת</th>
                    <th className="px-4 py-4 text-center text-sm font-bold">עצמאי</th>
                    <th className="bg-violet-700 px-4 py-4 text-center text-sm font-bold">
                      היברידי
                    </th>
                    <th className="px-4 py-4 text-center text-sm font-bold">ליווי מלא</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr
                      key={row.capability}
                      className={`border-t border-gray-100 ${
                        i === comparisonRows.length - 1 ? 'bg-gray-50 font-bold' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-sm text-gray-800">{row.capability}</td>
                      <td className="px-4 py-4 text-center">
                        <CellValue value={row.self} />
                      </td>
                      <td className="bg-violet-50/60 px-4 py-4 text-center">
                        <CellValue value={row.hybrid} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <CellValue value={row.full} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            מנוי הפלטפורמה בסך ₪{PLATFORM_MONTHLY_PRICE} לחודש נגבה עד קבלת המשכנתא, וניתן
            לביטול בכל עת. במסלול הליווי המלא הגישה כלולה במחיר.
          </p>
        </div>
      </section>

      {/* ─────────────────────────── FAQ ─────────────────────────── */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="text-3xl font-black text-gray-900 md:text-5xl">שאלות נפוצות</h2>
          </motion.div>

          <Accordion type="single" collapsible className="w-full">
            {pricingFaq.map((item, i) => (
              <AccordionItem
                key={item.question}
                value={`faq-${i}`}
                className="border-b border-gray-200"
              >
                <AccordionTrigger className="gap-4 text-right text-base font-bold text-gray-900 hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-gray-600">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ─────────────────────────── CTA ─────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-800 to-violet-900 py-20 text-white md:py-24">
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
          <Sparkles className="mx-auto mb-5 h-10 w-10 text-blue-100" />
          <h2 className="mb-5 text-3xl font-black text-white md:text-5xl">
            החודש הראשון מתחיל בבניית תמהיל
          </h2>
          <p className="mb-10 text-lg leading-relaxed text-slate-100">
            פתחו חשבון, הריצו את הנתונים שלכם בכלים, וראו כמה שווה כל שלב לפני שאתם מחליטים
            על מי להשאיר אותו.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-white px-8 text-base font-bold text-indigo-900 shadow-xl hover:bg-blue-50 hover:text-indigo-900"
            >
              <Link href="/auth/register">
                <Wallet className="ml-2 h-5 w-5" />
                פתיחת חשבון
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="border border-white/40 bg-white/15 px-8 text-base font-bold text-white shadow-none hover:bg-white/25 hover:text-white"
            >
              <Link href="/custom-mix-builder">נסו את בונה התמהיל</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
