'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, CheckCheck, Loader2, Send } from 'lucide-react';
import type { ChatMessageView, ConversationRole } from '@/lib/conversation';
import { MAX_CHAT_LENGTH } from '@/lib/conversation';
import { useChat } from './useConversation';
import { accentFor } from './ConversationWindow';

const TIME = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });
const DAY = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'היום';
  if (date.toDateString() === yesterday.toDateString()) return 'אתמול';
  return DAY.format(date);
}

/** הצ'אט עצמו: ההודעות, ושורת כתיבה בתחתית. Enter שולח, Shift+Enter יורד שורה */
export function ChatPane({ role, clientUserId }: { role: ConversationRole; clientUserId?: string | null }) {
  const { messages, ready, sending, error, send } = useChat(clientUserId, true);
  const [draft, setDraft] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const accent = accentFor(role);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages.length]);

  const submit = async () => {
    if (await send(draft)) setDraft('');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={list} className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-3">
        {!ready ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-info font-black text-slate-900">
              {role === 'CLIENT' ? 'כתבו ליועץ כל שאלה' : 'עדיין אין הודעות בשיחה'}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {role === 'CLIENT'
                ? 'ההודעה נשמרת כאן, והיועץ מקבל התראה במייל. התשובה תופיע בחלון הזה.'
                : 'הודעה שתכתבו תופיע ללקוח באזור האישי, והוא יקבל התראה במייל.'}
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              mine={message.authorRole === role}
              mineClass={accent.solid.split(' ')[0]}
              showDay={index === 0 || dayLabel(messages[index - 1].createdAt) !== dayLabel(message.createdAt)}
            />
          ))
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="border-t border-slate-200 bg-white p-2"
      >
        {error && <p className="mb-1 px-1 text-sm font-bold text-rose-600">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, MAX_CHAT_LENGTH))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void submit();
              }
            }}
            rows={1}
            placeholder={role === 'CLIENT' ? 'כתבו הודעה ליועץ…' : 'כתבו הודעה ללקוח…'}
            className={`max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-xl border-2 border-slate-200 px-3 py-2 text-info text-slate-900 focus:outline-none ${accent.ring}`}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="שליחה"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition-colors disabled:opacity-50 ${accent.solid}`}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 -scale-x-100" />}
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  mine,
  mineClass,
  showDay,
}: {
  message: ChatMessageView;
  mine: boolean;
  mineClass: string;
  showDay: boolean;
}) {
  return (
    <>
      {showDay && (
        <p className="py-1 text-center text-2xs font-bold text-slate-400">{dayLabel(message.createdAt)}</p>
      )}
      <div className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
        <div
          className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${
            mine ? `${mineClass} rounded-br-md text-white` : 'rounded-bl-md border border-slate-200 bg-white text-slate-900'
          }`}
        >
          {!mine && (
            <p className="text-2xs font-black text-slate-500">
              {message.authorName || (message.authorRole === 'ADVISOR' ? 'היועץ' : 'הלקוח')}
            </p>
          )}
          <p className="whitespace-pre-wrap break-words text-info leading-snug">{message.body}</p>
          <p className={`mt-0.5 flex items-center gap-1 text-2xs ${mine ? 'text-white/70' : 'text-slate-400'}`}>
            {TIME.format(new Date(message.createdAt))}
            {mine && (message.readAt ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
          </p>
        </div>
      </div>
    </>
  );
}
