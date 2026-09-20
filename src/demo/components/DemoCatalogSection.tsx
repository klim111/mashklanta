'use client';

/**
 * "הכירו את הכלים של משכלנתא" — כרטיסי ההדגמות בדף הבית.
 *
 * הכרטיסים נבנים מקטלוג ההדגמות (לא מקודדים אחד-אחד): כל כלי שנוסף לקטלוג
 * עם `featured` מופיע כאן אוטומטית. לחיצה מפעילה את ההדגמה של אותו כלי בלבד.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, Play } from 'lucide-react';
import { featuredDemos } from '../catalog';
import { demoStore } from '../store';
import { demoId } from '../demo-attr';

export function DemoCatalogSection() {
  const demos = featuredDemos();
  return (
    <div dir="rtl" {...demoId('home-tool-demos')}>
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-[13px] font-black text-indigo-800">
          <Eye className="h-3.5 w-3.5" />
          רוצים לראות איך זה נראה מבפנים?
        </span>
        <h2 className="mt-3 text-3xl font-black text-slate-900 md:text-4xl">הכירו את הכלים של משכלנתא</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 md:text-base">
          בחרו כלי — וההדגמה תפעיל אותו מולכם על נתונים לדוגמה: איפה מזינים, מה כל שדה אומר, איך
          מזיזים את הסליידרים ומה התוצאות מספרות. בכל רגע אפשר לעצור ולנסות בעצמכם.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {demos.map((entry, index) => {
          const Icon = entry.icon;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
            >
              <button
                type="button"
                onClick={() => demoStore.start(entry.id, { returnTo: '/' })}
                className="group flex h-full w-full flex-col items-center rounded-3xl border-2 border-slate-200 bg-white p-6 text-center shadow-md transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl"
                {...demoId(`home-demo-card-${entry.id}`)}
              >
                <span className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${entry.gradient} shadow-lg transition-transform group-hover:scale-110`}>
                  <Icon className="h-7 w-7 text-white" />
                </span>
                <span className="text-lg font-black leading-snug text-slate-900">{entry.title}</span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{entry.description}</span>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                  <Play className="h-4 w-4" />
                  הפעילו הדגמה · {entry.minutes} דק׳
                </span>
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-5 flex justify-center">
        <Link
          href="/demo"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-700"
        >
          לכל ההדגמות
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
