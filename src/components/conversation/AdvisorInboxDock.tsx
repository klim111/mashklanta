'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageCircle, Search } from 'lucide-react';
import type { AdvisorInboxRow } from '@/lib/conversation';
import type { ConversationMode } from './ConversationWindow';
import { ConversationWindow } from './ConversationWindow';
import { useAdvisorInbox, useConversationSummary } from './useConversation';

const WHEN = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' });

/**
 * ההתכתבות אצל היועץ: כפתור צף עם מספר ההודעות שממתינות, רשימת השיחות עם
 * הלקוחות, ובחירה בשיחה פותחת את אותו חלון שהלקוח רואה — צ'אט ומיילים.
 *
 * `client` פותח ישר את השיחה של לקוח מסוים — מדף הלקוח.
 */
export function AdvisorInboxDock({
  client,
  openSignal = 0,
}: {
  client?: { userId: string; name: string } | null;
  /** מספר שעולה בכל לחיצה על "התכתבות" בדף הלקוח — פותח את החלון */
  openSignal?: number;
}) {
  const [mode, setMode] = useState<ConversationMode>('closed');
  const [selected, setSelected] = useState<{ userId: string; name: string } | null>(client ?? null);
  const [search, setSearch] = useState('');
  const { rows, ready, refresh } = useAdvisorInbox(true, mode === 'closed' ? 45000 : 15000);

  // רק לחיצה חדשה פותחת — לא כל רינדור של דף הלקוח
  const clientRef = useRef(client);
  clientRef.current = client;
  useEffect(() => {
    if (openSignal > 0) {
      if (clientRef.current) setSelected(clientRef.current);
      setMode('open');
    }
  }, [openSignal]);

  const unread = rows.reduce((sum, row) => sum + row.unreadChat + row.unreadEmails, 0);
  const current = selected ? rows.find((row) => row.clientUserId === selected.userId) : undefined;
  const { summary } = useConversationSummary(selected?.userId ?? null, Boolean(selected) && mode !== 'closed', 20000);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) => row.name.toLowerCase().includes(term) || (row.email ?? '').toLowerCase().includes(term)
    );
  }, [rows, search]);

  const changeMode = (next: ConversationMode) => {
    setMode(next);
    if (next !== 'open') void refresh();
  };

  if (mode === 'closed') {
    return (
      <button
        type="button"
        onClick={() => setMode('open')}
        className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 text-button font-black text-white shadow-xl shadow-violet-600/30 transition-transform hover:-translate-y-0.5"
      >
        <MessageCircle className="h-5 w-5" />
        הודעות מלקוחות
        {unread > 0 && (
          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-2xs font-black">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>
    );
  }

  if (selected) {
    return (
      <ConversationWindow
        role="ADVISOR"
        clientUserId={selected.userId}
        title={selected.name}
        subtitle={current?.unassigned ? 'לקוח שעדיין לא שויך ליועץ' : current?.email ?? null}
        mode={mode}
        onMode={changeMode}
        onBack={() => {
          setSelected(null);
          void refresh();
        }}
        unreadChat={mode === 'open' ? 0 : current?.unreadChat}
        unreadEmails={current?.unreadEmails}
        mailboxAddress={summary?.mailboxAddress ?? null}
        receivesEmail={summary?.receivesEmail ?? false}
      />
    );
  }

  return (
    <ConversationWindow
      role="ADVISOR"
      title="הודעות מלקוחות"
      subtitle={unread > 0 ? `${unread} ממתינות לתשובה` : 'כל השיחות עם הלקוחות'}
      mode={mode}
      onMode={changeMode}
      unreadChat={unread}
    >
      <div className="border-b border-slate-100 p-2">
        <label className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-3 py-1.5 focus-within:border-violet-400">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="חיפוש לקוח"
            className="min-w-0 flex-1 bg-transparent text-info text-slate-900 focus:outline-none"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
        {!ready ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">אין עדיין שיחות</p>
        ) : (
          filtered.map((row) => (
            <InboxRow key={row.clientUserId} row={row} onOpen={() => setSelected({ userId: row.clientUserId, name: row.name })} />
          ))
        )}
      </div>
    </ConversationWindow>
  );
}

function InboxRow({ row, onOpen }: { row: AdvisorInboxRow; onOpen: () => void }) {
  const unread = row.unreadChat + row.unreadEmails;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-b border-slate-100 bg-white px-3 py-2.5 text-right hover:bg-violet-50/60"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-black text-violet-700">
        {row.name.slice(0, 1)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-button ${unread > 0 ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}>
            {row.name}
          </span>
          {row.unassigned && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-bold text-amber-800">לא שויך</span>
          )}
        </span>
        <span className="block truncate text-sm text-slate-500">{row.lastPreview ?? 'אין עדיין הודעות'}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {row.lastAt && <span className="text-2xs text-slate-400">{WHEN.format(new Date(row.lastAt))}</span>}
        {unread > 0 && (
          <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-2xs font-black leading-none text-white">{unread}</span>
        )}
      </span>
    </button>
  );
}
