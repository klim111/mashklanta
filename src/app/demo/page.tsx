'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Compass, FlaskConical, Play } from 'lucide-react';
import NavBar from '@/components/ui/navbar';
import Footer from '@/components/ui/footer';
import { DEMO_CATALOG, DEMO_CATEGORY_LABELS, demoById } from '@/demo/catalog';
import type { DemoCategory } from '@/demo/types';
import { demoStore } from '@/demo/store';
import { demoId } from '@/demo/demo-attr';

const CATEGORY_ORDER: DemoCategory[] = ['overview', 'planning', 'mix', 'process', 'client'];

function AutoStart() {
  const params = useSearchParams();
  useEffect(() => {
    const flow = params.get('flow');
    if (flow && demoById(flow)) demoStore.start(flow, { returnTo: '/demo' });
  }, [params]);
  return null;
}

/**
 * מסך ההדגמות — הקטלוג המלא.
 *
 * כל הדגמה רצה על הממשק האמיתי של משכלנתא עם נתונים בדויים: אפשר לצפות,
 * לעצור ולנסות בעצמכם, ושום דבר לא נשמר ולא נשלח.
 */
export default function DemoLandingPage() {
  const overview = demoById('overview');
  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <Suspense fallback={null}>
        <AutoStart />
      </Suspense>
      <div className="relative z-50 bg-white/98 backdrop-blur-sm shadow-sm border-b border-slate-100">
        <NavBar />
      </div>

      <main className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-sm font-black text-indigo-800">
            <FlaskConical className="h-3.5 w-3.5" />
            הדגמות אינטראקטיביות · נתונים לדוגמה בלבד
          </span>
          <h1 className="mt-4 text-title font-black text-slate-900">הכירו את משכלנתא מבפנים</h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
            ההדגמה מפעילה את הכלים האמיתיים מולכם — לוחצת, מקלידה ומזיזה סליידרים — ומסבירה כל
            פעולה בדרך. בכל רגע אפשר לעצור, לנסות בעצמכם ולהמשיך.
          </p>
          {overview && (
            <button
              type="button"
              onClick={() => demoStore.start('overview', { returnTo: '/demo' })}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-7 py-3.5 text-cta font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-700"
              {...demoId('demo-landing-overview')}
            >
              <Play className="h-5 w-5" />
              {overview.title} — סיור של {overview.minutes} דקות
            </button>
          )}
        </div>

        {CATEGORY_ORDER.filter((category) => category !== 'overview').map((category) => {
          const entries = DEMO_CATALOG.filter((entry) => entry.category === category).sort((a, b) => a.order - b.order);
          if (entries.length === 0) return null;
          return (
            <section key={category} className="mt-12">
              <h2 className="mb-4 flex items-center gap-2 text-subtitle font-black text-slate-900">
                <Compass className="h-5 w-5 text-blue-600" />
                {DEMO_CATEGORY_LABELS[category]}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry, index) => {
                  const Icon = entry.icon;
                  return (
                    <motion.button
                      key={entry.id}
                      type="button"
                      onClick={() => demoStore.start(entry.id, { returnTo: '/demo' })}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.06 }}
                      className="group flex h-full flex-col rounded-3xl border-2 border-slate-200 bg-white p-6 text-right shadow-md transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"
                    >
                      <span className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${entry.gradient} shadow-lg transition-transform group-hover:scale-110`}>
                        <Icon className="h-7 w-7 text-white" />
                      </span>
                      <span className="text-lg font-black leading-snug text-slate-900">{entry.title}</span>
                      <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{entry.description}</span>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-600">
                        <Play className="h-4 w-4" />
                        הפעילו הדגמה · כ-{entry.minutes} דק׳
                        <ArrowLeft className="mr-auto h-4 w-4 transition-transform group-hover:-translate-x-1" />
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </section>
          );
        })}

        <p className="mt-12 text-center text-sm text-slate-500">
          מעדיפים להתחיל לבד?{' '}
          <Link href="/" className="font-bold text-blue-600 hover:underline">
            חזרה לדף הבית ולכלים החינמיים
          </Link>
        </p>
      </main>

      <div className="bg-slate-900 text-white">
        <Footer />
      </div>
    </div>
  );
}
