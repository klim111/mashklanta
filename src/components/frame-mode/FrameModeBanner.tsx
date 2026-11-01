'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FolderOpen, MonitorPlay, Timer } from 'lucide-react';
import { useFrameMode } from './frameMode';

/**
 * הכותרת של חלונות הפגישה (src/components/frame-mode/frameMode.ts): בביקור
 * הווירטואלי — "הדגמה"; בכלים של האורח — שהם לזמן הפגישה בלבד; ובתיק לקוח
 * מתעניין — של מי התיק, וחזרה לבחירת הכלי.
 */
export function FrameModeBanner() {
  const frame = useFrameMode();
  const { data: session } = useSession();
  if (!frame) return null;

  const base =
    'pointer-events-auto fixed left-1/2 top-2 z-[70] flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black text-white shadow-lg';

  if (frame.kind === 'visit') {
    return (
      <div dir="rtl" className={`${base} bg-violet-600`} role="status">
        <MonitorPlay className="h-4 w-4 shrink-0" />
        <span className="truncate">הדגמה · כך נראית הפלטפורמה אצל לקוח רשום</span>
      </div>
    );
  }

  if (frame.kind === 'guest') {
    return (
      <div dir="rtl" className={`${base} bg-slate-800`} role="status">
        <Timer className="h-4 w-4 shrink-0" />
        <span className="truncate">כלים לזמן הפגישה · שום דבר שתזינו לא נשמר</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className={`${base} bg-emerald-700`} role="status">
      <FolderOpen className="h-4 w-4 shrink-0" />
      <span className="truncate">
        תיק לקוח מתעניין{session?.user?.name ? `: ${session.user.name}` : ''} · מה שמוזן נשמר בתיק
      </span>
      <Link href="/dashboard/client-file" className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 hover:bg-white/30">
        לבחירת כלי
      </Link>
    </div>
  );
}
