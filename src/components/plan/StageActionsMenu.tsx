'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { FolderOpen, LayoutDashboard, LayoutGrid, MessageCircle, X } from 'lucide-react';
import type { PlanData, PlanStageId } from '@/lib/mortgage-plan';
import { DocumentVaultDialog, useDocumentProgress } from './documents/DocumentVaultDialog';
import { ClientChatDock } from '@/components/conversation/ClientChatDock';
import type { ConversationMode } from '@/components/conversation/ConversationWindow';
import { demoId } from '@/demo/demo-attr';

/**
 * כפתור הפעולות העגול של שלבי המשכנתא, בפינה הימנית התחתונה.
 *
 * במקום שלושה כפתורים צפים נפרדים — תיק המסמכים, ההתכתבות עם היועץ והחזרה
 * לדאשבורד — יש עיגול אחד. לחיצה עליו פורשת את השלושה כלפי מעלה, אחד אחרי השני,
 * כמו תפריט פעולות בטאבלט; כולם באותו גודל ובאותה צורה. הפינה השמאלית נשארת
 * לכפתור «פנו ליועץ» של השלב, וכך הם אינם עולים זה על זה.
 */
export function StageActionsMenu({
  planId,
  data,
  stage,
  tour = false,
}: {
  planId: string;
  data: PlanData;
  stage: PlanStageId;
  /** בסיור ההיכרות אין תיק מסמכים ואין התכתבות — רק החזרה לדאשבורד */
  tour?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ConversationMode>('closed');
  const [unread, setUnread] = useState(0);
  const { progress } = useDocumentProgress(planId, data);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // חלון ההתכתבות המלא יושב בדיוק מעל העיגול — התפריט נאסף כשהוא נפתח
  const openChat = () => {
    setOpen(false);
    setChatMode((mode) => (mode === 'open' ? 'bar' : 'open'));
  };

  const openVault = () => {
    setOpen(false);
    setVaultOpen(true);
  };

  const items: { key: string; node: ReactNode }[] = [];
  items.push({
    key: 'dashboard',
    node: (
      <ActionItem href="/dashboard" label="חזרה לדאשבורד" icon={<LayoutDashboard className="h-6 w-6" />} />
    ),
  });
  if (!tour) {
    items.push({
      key: 'chat',
      node: (
        <ActionItem
          onClick={openChat}
          label={chatMode === 'open' ? 'הקטנת ההתכתבות' : 'התכתבות עם היועץ'}
          icon={<MessageCircle className="h-6 w-6" />}
          badge={unread > 0 ? <CountBadge value={unread} /> : null}
        />
      ),
    });
    items.push({
      key: 'vault',
      node: (
        <ActionItem
          onClick={openVault}
          label="תיק המסמכים"
          icon={<FolderOpen className="h-6 w-6" />}
          badge={
            <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-2xs font-black leading-none text-white ring-2 ring-white">
              {progress.overall.percent}%
            </span>
          }
          demo="vault-button"
        />
      ),
    });
  }

  return (
    <>
      {/* שכבה שקופה-למחצה: לחיצה מחוץ לתפריט סוגרת אותו */}
      <AnimatePresence>
        {open && (
          <motion.button
            key="scrim"
            type="button"
            aria-label="סגירת תפריט הפעולות"
            tabIndex={-1}
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 cursor-default bg-slate-900/15 backdrop-blur-[1px] print:hidden"
          />
        )}
      </AnimatePresence>

      <div dir="rtl" className="fixed bottom-5 right-5 z-40 flex flex-col items-start gap-3 print:hidden">
        <AnimatePresence>
          {open && (
            <motion.ul
              key="items"
              id="stage-actions"
              className="flex flex-col items-start gap-3"
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                open: { transition: { staggerChildren: 0.06, staggerDirection: -1 } },
                closed: { transition: { staggerChildren: 0.04 } },
              }}
            >
              {items.map((item) => (
                <motion.li
                  key={item.key}
                  variants={{
                    open: { opacity: 1, y: 0, scale: 1 },
                    closed: { opacity: 0, y: 18, scale: 0.6 },
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  style={{ transformOrigin: 'right bottom' }}
                >
                  {item.node}
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setOpen((value) => !value)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          aria-expanded={open}
          aria-controls="stage-actions"
          aria-label={open ? 'סגירת תפריט הפעולות' : 'פתיחת תפריט הפעולות: תיק המסמכים, התכתבות וחזרה לדאשבורד'}
          className="relative flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/35 ring-4 ring-white transition-colors hover:bg-blue-700"
        >
          <motion.span
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="flex"
          >
            {open ? <X className="h-6 w-6" /> : <LayoutGrid className="h-6 w-6" />}
          </motion.span>
          <span className="text-2xs font-black leading-none">{open ? 'סגירה' : 'פעולות'}</span>
          {!open && unread > 0 && (
            <span className="absolute -top-1 -left-1">
              <CountBadge value={unread} />
            </span>
          )}
        </motion.button>
      </div>

      {!tour && (
        <>
          <DocumentVaultDialog
            open={vaultOpen}
            onOpenChange={setVaultOpen}
            planId={planId}
            data={data}
            stage={stage}
          />
          <ClientChatDock mode={chatMode} onMode={setChatMode} onSummary={setUnread} anchor="above-actions" />
        </>
      )}
    </>
  );
}

/**
 * פריט אחד בתפריט: עיגול זהה לכולם, ולצידו תווית בכדור לבן. כל השורה לחיצה,
 * כך שקל לפגוע בה באצבע בטאבלט.
 */
function ActionItem({
  label,
  icon,
  badge = null,
  href,
  onClick,
  demo,
}: {
  label: string;
  icon: ReactNode;
  badge?: ReactNode;
  href?: string;
  onClick?: () => void;
  demo?: string;
}) {
  const body = (
    <>
      <span className="rounded-full bg-white px-4 py-2 text-button font-black text-slate-900 shadow-lg ring-1 ring-slate-200 transition-colors group-hover:text-blue-700">
        {label}
      </span>
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white text-blue-600 shadow-lg ring-1 ring-slate-200 transition-colors group-hover:bg-blue-600 group-hover:text-white">
        {icon}
        {badge && <span className="absolute -top-1.5 -left-1.5">{badge}</span>}
      </span>
    </>
  );
  const className = 'group flex flex-row-reverse items-center gap-3 outline-none focus-visible:[&>span:last-child]:ring-4 focus-visible:[&>span:last-child]:ring-blue-300';

  if (href) {
    return (
      <Link href={href} className={className} {...(demo ? demoId(demo) : {})}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className} {...(demo ? demoId(demo) : {})}>
      {body}
    </button>
  );
}

function CountBadge({ value }: { value: number }) {
  return (
    <span className="block min-w-[1.25rem] rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-2xs font-black leading-none text-white ring-2 ring-white">
      {value > 99 ? '99+' : value}
    </span>
  );
}
