'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Bot, Compass, Handshake, Home, RefreshCw, UserCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FULL_SERVICE_PRICE, PLATFORM_MONTHLY_PRICE } from '@/lib/service-flow';

type Chip = { icon: LucideIcon; label: string; tone: string };

const STEPS: Array<{ number: number; title: string; description: string; chips: Chip[] }> = [
  {
    number: 1,
    title: 'מה תרצו לעשות?',
    description: 'משכנתא חדשה, מיחזור של משכנתא קיימת, או ייעוץ והכוונה לפני שמתחילים.',
    chips: [
      { icon: Home, label: 'משכנתא חדשה', tone: 'bg-blue-100 text-blue-700' },
      { icon: RefreshCw, label: 'מיחזור', tone: 'bg-violet-100 text-violet-700' },
      { icon: Compass, label: 'ייעוץ והכוונה', tone: 'bg-emerald-100 text-emerald-700' },
    ],
  },
  {
    number: 2,
    title: 'כמה עזרה תרצו?',
    description: 'לבד עם כל הכלים, ליווי משולב בשלבים שתבחרו, או ליווי מלא עד לחתימה.',
    chips: [
      { icon: Bot, label: `עצמאי · ₪${PLATFORM_MONTHLY_PRICE}/חודש`, tone: 'bg-blue-100 text-blue-700' },
      { icon: Handshake, label: 'משולב · לפי שלב', tone: 'bg-violet-100 text-violet-700' },
      { icon: UserCheck, label: `מלא · ₪${FULL_SERVICE_PRICE.toLocaleString('he-IL')}`, tone: 'bg-amber-100 text-amber-800' },
    ],
  },
  {
    number: 3,
    title: 'מתחילים — ומשנים בכל שלב',
    description:
      'המסלול העצמאי פותח סיור בכלי ואז גישה מלאה; ליווי מגיע ליועץ שחוזר אליכם. בכל שלב אפשר לבחור מחדש, ותמיד משלמים את המחיר הנמוך.',
    chips: [],
  },
];

/** שלושת הצעדים של הזרימה — לעמודי "איך זה עובד" והתמחור */
export function ServiceFlowSteps({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <div dir="rtl" className="grid gap-4 md:grid-cols-3">
      {STEPS.map((step, index) => (
        <motion.div
          key={step.number}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className={`relative rounded-3xl p-6 ${
            dark ? 'border border-white/15 bg-white/5 text-white backdrop-blur' : 'border border-gray-200 bg-white text-gray-900 shadow-lg'
          }`}
        >
          {index < STEPS.length - 1 && (
            <span
              className={`absolute -left-3 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full md:flex ${
                dark ? 'bg-white/15 text-white' : 'bg-gray-900 text-white shadow'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
            </span>
          )}
          <span
            className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black ${
              dark ? 'bg-white/15 text-cyan-200' : 'bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow'
            }`}
          >
            {step.number}
          </span>
          <h3 className="text-subtitle font-black">{step.title}</h3>
          <p className={`mt-2 text-sm leading-relaxed ${dark ? 'text-white/70' : 'text-gray-600'}`}>
            {step.description}
          </p>
          {step.chips.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {step.chips.map((chip) => {
                const Icon = chip.icon;
                return (
                  <span
                    key={chip.label}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-black ${
                      dark ? 'bg-white/15 text-white' : chip.tone
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {chip.label}
                  </span>
                );
              })}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
