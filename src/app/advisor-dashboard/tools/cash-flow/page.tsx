'use client';

import Link from 'next/link';
import { ArrowRight, LineChart } from 'lucide-react';
import NavBar from '@/components/ui/navbar';
import { CashFlowTool } from '@/components/cash-flow/CashFlowTool';

/**
 * כלי מצב הון ותזרים, כפי שהוא אצל הלקוח, לשימוש של היועץ מהגישה המהירה.
 * אצל הלקוח הכלי מוטמע באזור האישי; כאן הוא עומד לבד, והנתונים שהיועץ מזין
 * נשמרים בחשבון שלו.
 */
export default function AdvisorCashFlowPage() {
  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="relative z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm">
        <NavBar />
      </div>
      <div className="container mx-auto space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-title font-black text-slate-900">
            <LineChart className="h-6 w-6 text-orange-500" />
            כלי מצב הון ותזרים
          </h1>
          <Link
            href="/advisor-dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowRight className="h-4 w-4" />
            ללוח הבקרה
          </Link>
        </div>
        <CashFlowTool plan={null} />
      </div>
    </div>
  );
}
