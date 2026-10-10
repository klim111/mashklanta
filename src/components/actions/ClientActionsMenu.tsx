'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { CalendarPlus, FolderOpen, LayoutDashboard, Loader2, MessageCircle } from 'lucide-react';
import { CHAT_MENU_LABEL } from '@/lib/conversation';
import { fetchPlans } from '@/components/plan/usePlan';
import type { PlanView } from '@/components/plan/usePlan';
import { DocumentVaultDialog } from '@/components/plan/documents/DocumentVaultDialog';
import { AddTaskDialog } from '@/components/plan/tasks/AddTaskDialog';
import { useClientTasks } from '@/components/plan/tasks/useClientTasks';
import { CountBadge, FloatingActions } from './FloatingActions';
import type { FloatingAction } from './FloatingActions';

/**
 * עיגול הפעולות של הלקוח המחובר בכל המסכים שאינם שלבי משכנתא: הדאשבורד,
 * הכלים המהירים, עמוד הבית ועוד. אותו עיגול ואותם פריטים כמו בשלבי המשכנתא:
 * הוספת משימה, חזרה לדאשבורד, צ׳אט עם נציג משכלנתא ותיק המסמכים.
 *
 * תיק המסמכים שייך למשכנתא, ולכן נפתח התיק של המשכנתא הפעילה; כשאין עדיין
 * משכנתא — אזור המסמכים בדאשבורד, שמסביר מתי התיק נפתח.
 */
export function ClientActionsMenu({
  unread,
  chatOpen,
  onToggleChat,
  inline = false,
}: {
  unread: number;
  chatOpen: boolean;
  onToggleChat: () => void;
  inline?: boolean;
}) {
  const pathname = usePathname() || '/';
  const onDashboard = pathname === '/dashboard';
  const [plan, setPlan] = useState<PlanView | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  /** המשכנתא הפעילה — נטענת רק כשצריך אותה, לא בכל מסך */
  const activePlan = async (): Promise<PlanView | null> => {
    if (plan) return plan;
    setLoadingPlan(true);
    try {
      const plans = (await fetchPlans()).filter((item) => item.status !== 'ARCHIVED');
      const found = plans.find((item) => item.status === 'IN_PROGRESS') ?? plans[0] ?? null;
      setPlan(found);
      return found;
    } catch {
      return null;
    } finally {
      setLoadingPlan(false);
    }
  };

  const openVault = async () => {
    const found = await activePlan();
    if (found) setVaultOpen(true);
    // גם בדאשבורד עצמו — שינוי ה-hash מעביר לאזור המסמכים
    else window.location.href = '/dashboard#documents';
  };

  const openTask = async () => {
    await activePlan();
    setTaskOpen(true);
  };

  const items: FloatingAction[] = [
    { key: 'task', label: 'הוספת משימה', icon: <CalendarPlus className="h-6 w-6" />, onClick: () => void openTask() },
    {
      key: 'chat',
      label: chatOpen ? 'הקטנת הצ׳אט' : CHAT_MENU_LABEL,
      icon: <MessageCircle className="h-6 w-6" />,
      badge: unread > 0 ? <CountBadge value={unread} /> : null,
      onClick: onToggleChat,
    },
    {
      key: 'vault',
      label: 'תיק המסמכים',
      icon: loadingPlan ? <Loader2 className="h-6 w-6 animate-spin" /> : <FolderOpen className="h-6 w-6" />,
      onClick: () => void openVault(),
    },
    // החזרה לדאשבורד הכי למטה, צמודה לעיגול
    onDashboard
      ? {
          key: 'dashboard',
          label: 'חזרה לדאשבורד',
          icon: <LayoutDashboard className="h-6 w-6" />,
          onClick: () => {
            window.location.hash = 'overview';
            window.scrollTo({ top: 0, behavior: 'smooth' });
          },
        }
      : { key: 'dashboard', label: 'חזרה לדאשבורד', icon: <LayoutDashboard className="h-6 w-6" />, href: '/dashboard' },
  ];

  return (
    <>
      <FloatingActions
        items={items}
        unread={unread}
        inline={inline}
        menuId="client-actions"
        ariaLabel="פתיחת תפריט הפעולות: הוספת משימה, תיק המסמכים, צ׳אט וחזרה לדאשבורד"
      />
      {plan && (
        <DocumentVaultDialog open={vaultOpen} onOpenChange={setVaultOpen} planId={plan.id} data={plan.data} stage={null} />
      )}
      {taskOpen && <GeneralTaskDialog documentPlanId={plan?.id ?? null} onClose={() => setTaskOpen(false)} />}
    </>
  );
}

/** משימה כללית, כמו מלוח השנה. מסמך שמצורף אליה נכנס לתיק של המשכנתא הפעילה */
function GeneralTaskDialog({ documentPlanId, onClose }: { documentPlanId: string | null; onClose: () => void }) {
  const { add } = useClientTasks({});
  return (
    <AddTaskDialog
      open
      onOpenChange={(next) => !next && onClose()}
      planId={null}
      stage={null}
      documentPlanId={documentPlanId}
      onSubmit={add}
    />
  );
}
