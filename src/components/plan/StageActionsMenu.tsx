'use client';

import { useEffect, useState } from 'react';
import { CalendarPlus, FolderOpen, LayoutDashboard, MessageCircle } from 'lucide-react';
import type { PlanData, PlanStageId, SigningData } from '@/lib/mortgage-plan';
import { DocumentVaultDialog, useDocumentProgress } from './documents/DocumentVaultDialog';
import { useClientConversation } from '@/components/conversation/ClientChatDock';
import { CHAT_TITLE } from '@/lib/conversation';
import { CountBadge, FloatingActions } from '@/components/actions/FloatingActions';
import type { FloatingAction } from '@/components/actions/FloatingActions';
import { AddTaskDialog } from './tasks/AddTaskDialog';
import { useClientTasks } from './tasks/useClientTasks';

/**
 * כפתור הפעולות העגול של שלבי המשכנתא, בפינה הימנית התחתונה.
 *
 * במקום כפתורים צפים נפרדים — הוספת משימה, תיק המסמכים, הצ׳אט עם נציג
 * משכלנתא והחזרה לדאשבורד — יש עיגול אחד (`FloatingActions`). הפינה השמאלית
 * נשארת לכפתור «פנו ליועץ» של השלב, וכך הם אינם עולים זה על זה. בשאר מסכי
 * הלקוח אותו עיגול מגיע מ-`ClientActionsMenu`.
 */
export function StageActionsMenu({
  planId,
  data,
  stage,
  tour = false,
  onSigningChange,
}: {
  planId: string;
  data: PlanData;
  stage: PlanStageId;
  /** שמירת בחירת סוג העסקה מתיק המסמכים */
  onSigningChange?: (next: SigningData) => void;
  /** בסיור ההיכרות אין תיק מסמכים ואין צ׳אט — רק החזרה לדאשבורד */
  tour?: boolean;
}) {
  const [vaultOpen, setVaultOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const { add: addTask } = useClientTasks({ planId });
  // הצ׳אט עצמו יושב בשורש האפליקציה; כאן רק פותחים אותו ומציגים את המספר.
  // הרישום מסתיר את עיגול הפעולות הכללי, גם בסיור, כדי שלא יהיו שניים בפינה
  const conversation = useClientConversation();
  const registerActionsHost = conversation?.registerActionsHost;
  useEffect(() => registerActionsHost?.(), [registerActionsHost]);
  const unread = !tour && conversation?.enabled ? conversation.unread : 0;
  const chatOpen = conversation?.mode === 'open';
  const { progress } = useDocumentProgress(planId, data);

  const items: FloatingAction[] = [];
  if (!tour) {
    items.push({
      key: 'task',
      label: 'הוספת משימה',
      icon: <CalendarPlus className="h-6 w-6" />,
      onClick: () => setTaskOpen(true),
    });
  }
  items.push({ key: 'dashboard', label: 'חזרה לדאשבורד', icon: <LayoutDashboard className="h-6 w-6" />, href: '/dashboard' });
  if (!tour) {
    items.push({
      key: 'chat',
      // חלון הצ׳אט המלא יושב בדיוק מעל העיגול
      label: chatOpen ? 'הקטנת הצ׳אט' : CHAT_TITLE,
      icon: <MessageCircle className="h-6 w-6" />,
      badge: unread > 0 ? <CountBadge value={unread} /> : null,
      onClick: () => conversation?.toggle(),
    });
    items.push({
      key: 'vault',
      label: 'תיק המסמכים',
      icon: <FolderOpen className="h-6 w-6" />,
      badge: (
        <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-2xs font-black leading-none text-white ring-2 ring-white">
          {progress.overall.percent}%
        </span>
      ),
      onClick: () => setVaultOpen(true),
      demo: 'vault-button',
    });
  }

  return (
    <>
      <FloatingActions
        items={items}
        unread={unread}
        menuId="stage-actions"
        ariaLabel="פתיחת תפריט הפעולות: הוספת משימה, תיק המסמכים, צ׳אט וחזרה לדאשבורד"
      />

      {!tour && (
        <>
          <DocumentVaultDialog
            open={vaultOpen}
            onOpenChange={setVaultOpen}
            planId={planId}
            data={data}
            stage={stage}
            onSigningChange={onSigningChange}
          />
          <AddTaskDialog open={taskOpen} onOpenChange={setTaskOpen} planId={planId} stage={stage} onSubmit={addTask} />
        </>
      )}
    </>
  );
}
