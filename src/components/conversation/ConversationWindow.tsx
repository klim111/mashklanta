'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Mail, MessageCircle, X } from 'lucide-react';
import type { ConversationRole } from '@/lib/conversation';
import { ChatPane } from './ChatPane';
import { EmailsPane } from './EmailsPane';

export type ConversationMode = 'closed' | 'bar' | 'open';
type Tab = 'chat' | 'emails';

/**
 * הצבע של הצד שמסתכל: כחול ללקוח, סגול ליועץ — כמו בשאר הפלטפורמה, שבה סגול
 * שמור לפעולות של היועץ.
 */
export function accentFor(role: ConversationRole) {
  return role === 'ADVISOR'
    ? { solid: 'bg-violet-600 hover:bg-violet-700', text: 'text-violet-700', soft: 'bg-violet-50', ring: 'focus:border-violet-400' }
    : { solid: 'bg-blue-600 hover:bg-blue-700', text: 'text-blue-700', soft: 'bg-blue-50', ring: 'focus:border-blue-400' };
}

function Badge({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span className="min-w-[1.25rem] rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-2xs font-black leading-none text-white">
      {value > 99 ? '99+' : value}
    </span>
  );
}

/**
 * חלון ההתכתבות — צ'אט ומיילים בשני טאבים.
 *
 * שני מצבים גלויים: שורה אחת מוקטנת בתחתית המסך, או חלון מלא. במסך צר החלון
 * המלא תופס את כל המסך. `onBack` מציג חץ חזרה — אצל היועץ הוא מחזיר לרשימת
 * השיחות.
 */
export function ConversationWindow({
  role,
  clientUserId,
  title,
  subtitle,
  mode,
  onMode,
  onBack,
  unreadChat = 0,
  unreadEmails = 0,
  mailboxAddress = null,
  receivesEmail = false,
  side = 'left',
  docked = false,
  offset = 0,
  children,
}: {
  role: ConversationRole;
  clientUserId?: string | null;
  title: string;
  subtitle?: string | null;
  mode: Exclude<ConversationMode, 'closed'>;
  onMode: (mode: ConversationMode) => void;
  onBack?: () => void;
  unreadChat?: number;
  unreadEmails?: number;
  mailboxAddress?: string | null;
  receivesEmail?: boolean;
  /** הפינה שבה החלון יושב */
  side?: 'left' | 'right';
  /**
   * השורה המוקטנת יושבת בתוך עמודת הכפתורים הצפים של המסך, ולא בפינה משלה —
   * והיא תמיד שם, ולכן אין לה כפתור סגירה
   */
  docked?: boolean;
  /** מרחק החלון המלא מהקצה, במסך רחב — כדי לא לכסות תפריט צד */
  offset?: number;
  /** תוכן במקום הטאבים — רשימת השיחות אצל היועץ */
  children?: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>('chat');
  const accent = accentFor(role);
  const open = mode === 'open';
  const unread = unreadChat + unreadEmails;

  if (!open) {
    return (
      <div
        dir="rtl"
        className={`${
          docked ? '' : `fixed bottom-4 z-50 ${side === 'right' ? 'right-4' : 'left-4'}`
        } flex items-center gap-2 border border-slate-200 bg-white text-right shadow-2xl shadow-slate-900/15 print:hidden ${
          // במסך צר השורה הצמודה מתכווצת לעיגול עם המספר, כדי לא לכסות כפתורים אחרים
          docked
            ? 'rounded-full p-1 sm:w-[320px] sm:rounded-2xl sm:p-1.5'
            : 'w-[min(320px,calc(100vw-2.5rem))] rounded-2xl p-1.5'
        }`}
      >
        <button
          type="button"
          onClick={() => onMode('open')}
          aria-label={docked ? title : undefined}
          className={`relative flex min-w-0 flex-1 items-center gap-2 rounded-xl text-right hover:bg-slate-50 ${
            docked ? 'p-0.5 sm:px-2 sm:py-1.5' : 'px-2 py-1.5'
          }`}
        >
          <span
            className={`flex shrink-0 items-center justify-center rounded-full text-white ${accent.solid} ${
              docked ? 'h-11 w-11 sm:h-8 sm:w-8' : 'h-8 w-8'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
          </span>
          <span
            className={`min-w-0 flex-1 truncate text-button font-black text-slate-900 ${docked ? 'hidden sm:block' : ''}`}
          >
            {title}
          </span>
          <span className={docked ? 'absolute -top-1 -left-1 sm:static' : ''}>
            <Badge value={unread} />
          </span>
        </button>
        <button
          type="button"
          onClick={() => onMode('open')}
          aria-label="פתיחת חלון מלא"
          className={`rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 ${docked ? 'hidden sm:block' : ''}`}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        {!docked && (
          <button
            type="button"
            onClick={() => onMode('closed')}
            aria-label="סגירה"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-label={title}
      style={offset ? { [side]: offset } : undefined}
      className={`fixed inset-0 z-50 flex flex-col overflow-hidden bg-white text-right sm:inset-auto sm:bottom-4 ${
        side === 'right' ? 'sm:right-4' : 'sm:left-4'
      } sm:h-[min(640px,calc(100vh-2rem))] sm:w-[420px] sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-2xl sm:shadow-slate-900/20 print:hidden`}
    >
      <header className={`flex items-center gap-2 px-3 py-2.5 text-white ${role === 'ADVISOR' ? 'bg-violet-700' : 'bg-brand-dark'}`}>
        {onBack && (
          <button type="button" onClick={onBack} aria-label="חזרה לרשימה" className="rounded-lg p-1.5 hover:bg-white/10">
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-button font-black leading-tight">{title}</p>
          {subtitle && <p className="truncate text-2xs font-semibold text-white/70">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => onMode('bar')}
          aria-label="מזעור לשורה"
          className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        {!docked && (
          <button
            type="button"
            onClick={() => onMode('closed')}
            aria-label="סגירה"
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </header>

      {children ?? (
        <>
          <nav className="flex gap-1 border-b border-slate-200 bg-slate-50 px-2 pt-2">
            {(
              [
                { id: 'chat', label: "צ'אט", icon: MessageCircle, unread: unreadChat },
                { id: 'emails', label: 'מיילים', icon: Mail, unread: unreadEmails },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-t-xl px-3 py-2 text-button font-black transition-colors ${
                    active ? `bg-white ${accent.text} shadow-[0_-1px_0_0_#e2e8f0]` : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {!active && <Badge value={item.unread} />}
                </button>
              );
            })}
          </nav>
          {tab === 'chat' ? (
            <ChatPane role={role} clientUserId={clientUserId} />
          ) : (
            <EmailsPane
              role={role}
              clientUserId={clientUserId}
              mailboxAddress={mailboxAddress}
              receivesEmail={receivesEmail}
            />
          )}
        </>
      )}
    </div>
  );
}
