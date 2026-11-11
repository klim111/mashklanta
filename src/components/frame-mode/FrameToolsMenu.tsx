'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calculator,
  CreditCard,
  FolderOpen,
  Home,
  LayoutDashboard,
  RefreshCw,
  Search,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { useFrameMode } from './frameMode';

interface FrameTool {
  key: string;
  label: string;
  icon: ReactNode;
  href: string;
}

/**
 * הכלים של חלון הפגישה, בגישה מהירה ולא כחלק משלבים: בונה התמהילים, המיחזור,
 * ההלוואות הצרכניות ועוד. בתיק לקוח מתעניין מה שמוזן בהם נשמר תחת הלקוח;
 * בביקור הווירטואלי ובכלי האורח — בזיכרון של החלון בלבד.
 */
function toolsFor(kind: 'visit' | 'guest' | 'act'): FrameTool[] {
  const home: FrameTool =
    kind === 'act'
      ? { key: 'file', label: 'בחירת כלי לתיק', icon: <FolderOpen className="h-5 w-5" />, href: '/dashboard/client-file' }
      : { key: 'dashboard', label: 'האזור האישי', icon: <LayoutDashboard className="h-5 w-5" />, href: '/demo/dashboard' };
  return [
    home,
    ...(kind === 'act'
      ? [{ key: 'personal', label: 'האזור האישי של הלקוח', icon: <LayoutDashboard className="h-5 w-5" />, href: '/dashboard' }]
      : [{ key: 'plan', label: 'חמשת שלבי המשכנתא', icon: <Home className="h-5 w-5" />, href: '/demo/plan' }]),
    { key: 'mix-builder', label: 'בונה התמהילים', icon: <Calculator className="h-5 w-5" />, href: '/mortgage-advisor' },
    { key: 'refinance', label: 'מיחזור משכנתא', icon: <RefreshCw className="h-5 w-5" />, href: '/mortgage-refinance' },
    { key: 'consumer-loans', label: 'הלוואות צרכניות', icon: <CreditCard className="h-5 w-5" />, href: '/consumer-loans' },
    { key: 'equity', label: 'תכנון הון עצמי', icon: <Wallet className="h-5 w-5" />, href: '/equity-planning' },
    {
      key: 'feasibility',
      label: 'בדיקת היתכנות',
      icon: <Search className="h-5 w-5" />,
      href: '/mortgage-planning?flow=affordability',
    },
  ];
}

export function FrameToolsMenu() {
  const frame = useFrameMode();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  if (!frame) return null;
  const tools = toolsFor(frame.kind);

  return (
    <div dir="rtl" className="fixed bottom-4 left-4 z-[65] flex flex-col items-start gap-2">
      {open && (
        <div className="w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
          <p className="px-2 pb-1 pt-0.5 text-2xs font-black text-slate-500">
            {frame.kind === 'act' ? 'כל הכלים · נשמר בתיק הלקוח' : 'כל הכלים'}
          </p>
          {tools.map((tool) => (
            <Link
              key={tool.key}
              href={tool.href}
              className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <span className="text-emerald-700">{tool.icon}</span>
              {tool.label}
            </Link>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-xl hover:bg-emerald-800"
      >
        {open ? <X className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
        כלים
      </button>
    </div>
  );
}
