'use client';

import { useEffect, useRef } from 'react';
import type { ConversationMode } from './ConversationWindow';
import { ConversationWindow } from './ConversationWindow';
import { useConversationSummary } from './useConversation';

/**
 * ההתכתבות עם היועץ באזור האישי של הלקוח. נפתחת מתפריט הצד, ויושבת בפינת
 * המסך — כשורה אחת מוקטנת או כחלון מלא. כשמגיעה הודעה חדשה והחלון סגור, הוא
 * עולה מעצמו כשורה, כדי שהלקוח יראה שהיועץ ענה.
 */
export function ClientChatDock({
  mode,
  onMode,
  onSummary,
  anchor = 'left',
}: {
  mode: ConversationMode;
  onMode: (mode: ConversationMode) => void;
  /** מספר ההודעות והמיילים שממתינים — לתג שבתפריט */
  onSummary?: (unread: number) => void;
  /** בשלבי המשכנתא החלון נפתח מעל כפתור הפעולות שבפינה הימנית */
  anchor?: 'left' | 'above-actions';
}) {
  const { summary, refresh } = useConversationSummary(null, true, mode === 'open' ? 10000 : 30000);
  const unread = (summary?.unreadChat ?? 0) + (summary?.unreadEmails ?? 0);
  const previous = useRef(0);

  useEffect(() => {
    onSummary?.(unread);
    if (unread > previous.current && mode === 'closed') onMode('bar');
    previous.current = unread;
  }, [unread, mode, onMode, onSummary]);

  // אחרי קריאה בחלון המלא המספרים מתאפסים — מרעננים כשהחלון נסגר או מוקטן
  useEffect(() => {
    if (mode !== 'open') void refresh();
  }, [mode, refresh]);

  if (mode === 'closed') return null;

  return (
    <ConversationWindow
      role="CLIENT"
      title={summary?.advisorName ? `התכתבות עם ${summary.advisorName}` : 'התכתבות עם היועץ'}
      subtitle={summary?.advisorName ? 'היועץ המלווה שלכם' : 'יועצי משכלנתא יענו כאן'}
      mode={mode}
      onMode={onMode}
      unreadChat={mode === 'open' ? 0 : summary?.unreadChat}
      unreadEmails={summary?.unreadEmails}
      mailboxAddress={summary?.mailboxAddress ?? null}
      receivesEmail={summary?.receivesEmail ?? false}
      anchor={anchor}
    />
  );
}
