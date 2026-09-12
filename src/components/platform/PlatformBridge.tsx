'use client';

import { motion } from 'framer-motion';
import { Eye, Gauge, Handshake, LineChart, Users, Video, Wallet, Wrench } from 'lucide-react';

const clientPoints = [
  { icon: Eye, text: 'רואה כל שלב בתהליך בזמן אמת' },
  { icon: Wrench, text: 'מקבל גישה לכל הכלים שיש ליועץ' },
  { icon: Gauge, text: 'יודע לכמת את איכות העבודה שנעשתה' },
  { icon: LineChart, text: 'עוקב אחרי המשכנתא ותחזיות לעתיד' },
];

const advisorPoints = [
  { icon: Users, text: 'מנהל את כל הלקוחות במקום אחד' },
  { icon: Handshake, text: 'מציג את תוצר העבודה מול ברירת המחדל' },
  { icon: Video, text: 'שיחות וידאו ומסמכים מתוך המערכת' },
  { icon: Wallet, text: 'מתומחר לפי השלבים שהלקוח בחר' },
];

function FlowLine({ delay = 0 }: { delay?: number }) {
  return (
    <div className="relative hidden h-px flex-1 bg-gradient-to-l from-blue-200 via-violet-300 to-blue-200 lg:block">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.9)]"
          animate={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: 'linear',
            delay: delay + i * 0.9,
          }}
        />
      ))}
    </div>
  );
}

export default function PlatformBridge() {
  return (
    <div dir="rtl" className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-center">
      {/* Client */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex-1 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-7 shadow-lg"
      >
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-1.5 text-sm font-bold text-white shadow-md">
          הלקוח
        </div>
        <ul className="space-y-3">
          {clientPoints.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                <Icon className="h-4 w-4 text-blue-700" />
              </span>
              <span className="text-gray-700">{text}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      <FlowLine />

      {/* Hub */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.2 }}
        className="relative mx-auto flex h-40 w-40 shrink-0 items-center justify-center"
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border-2 border-violet-400/40"
            animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.85, ease: 'easeOut' }}
          />
        ))}
        <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-center shadow-2xl">
          <span className="text-xl font-black text-white">משכלתנא</span>
          <span className="text-[11px] font-semibold text-white">צומת המפגש</span>
        </div>
      </motion.div>

      <FlowLine delay={1.4} />

      {/* Advisor */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex-1 rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-7 shadow-lg"
      >
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-1.5 text-sm font-bold text-white shadow-md">
          היועץ
        </div>
        <ul className="space-y-3">
          {advisorPoints.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                <Icon className="h-4 w-4 text-violet-700" />
              </span>
              <span className="text-gray-700">{text}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
