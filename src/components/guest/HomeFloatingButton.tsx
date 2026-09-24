'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import { ConversationDockSlot } from '@/components/conversation/ClientChatDock';

/**
 * כפתור צף לחזרה לעמוד הבית.
 *
 * הכלים הפתוחים (כושר החזר, מיחזור, הלוואות) הם מסכים ארוכים, ומי שנכנס אליהם
 * מעמוד הבית נשאר בלי דרך חזרה אחרי גלילה. הכפתור נשאר בפינה בכל מסך של הכלי,
 * באותו פורמט של כפתורי הניווט הצפים של המשתמש הרשום ("חזרה לדאשבורד").
 */
export function HomeFloatingButton({
  href = '/',
  label = 'חזרה לדף הבית',
  side = 'right',
}: {
  href?: string;
  label?: string;
  /** צד המסך. ברירת המחדל ימין — הצד שבו אין את כפתור הפנייה ליועץ */
  side?: 'right' | 'left';
}) {
  const link = (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-info font-black text-white shadow-xl shadow-blue-600/30 transition-transform hover:-translate-y-0.5"
    >
      <Home className="h-5 w-5" />
      {label}
    </Link>
  );
  return (
    <div
      className={`fixed bottom-5 z-40 flex flex-col gap-2.5 print:hidden ${
        side === 'right' ? 'right-5 items-end' : 'left-5 items-start'
      }`}
    >
      {/* למשתמש מחובר — שורת ההתכתבות עם היועץ, מעל הכפתור ובאותה פינה */}
      {side === 'right' && <ConversationDockSlot />}
      {link}
    </div>
  );
}
