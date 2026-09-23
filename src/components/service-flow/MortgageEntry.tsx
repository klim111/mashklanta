'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { BadgeCheck, Compass, Home, RefreshCw, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { GOAL_LABELS, isServiceType } from '@/lib/service-flow';
import type { MortgageGoal, ServiceType } from '@/lib/service-flow';
import { ServiceChooser } from './ServiceChooser';
import { GuidanceRequestDialog } from './GuidanceRequestDialog';
import { usePlatformAccess } from './usePlatformAccess';

type FlowGoal = 'NEW_MORTGAGE' | 'REFINANCE';

export interface MortgageEntryProps {
  /**
   * `hero` — הכרטיס הכהה הגדול במסך הראשון; `sidebar` — שלושת הכפתורים בתפריט
   * הצד; `dialog` — רק החלון הצף, לפתיחה מ"הוסף משכנתא חדשה".
   */
  variant: 'hero' | 'sidebar' | 'dialog';
  /** פתיחת תהליך חדש ומעבר אליו (מ-useStartPlan) */
  onStart: () => void;
  busy: boolean;
  hasPlans: boolean;
  /** לגרסת החלון הצף */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** המשך בחירה שנעשתה לפני ההתחברות או לפני התשלום (`?goal=&service=`) */
  initialGoal?: FlowGoal | null;
  autoService?: ServiceType | null;
}

const GOAL_ICONS: Record<MortgageGoal, { icon: LucideIcon; gradient: string }> = {
  NEW_MORTGAGE: { icon: Home, gradient: 'from-blue-500 to-cyan-500' },
  REFINANCE: { icon: RefreshCw, gradient: 'from-violet-500 to-purple-600' },
  ADVICE: { icon: Compass, gradient: 'from-emerald-500 to-teal-600' },
};

/** `?goal=NEW_MORTGAGE&service=SELF` בכתובת הדאשבורד */
export function readEntryQuery(): { goal: FlowGoal | null; service: ServiceType | null } {
  const params = new URLSearchParams(window.location.search);
  const goal = params.get('goal');
  const service = params.get('service');
  return {
    goal: goal === 'NEW_MORTGAGE' || goal === 'REFINANCE' ? goal : null,
    service: isServiceType(service) ? service : null,
  };
}

/**
 * "מה תרצו לעשות?" — נקודת הכניסה באזור האישי.
 *
 * הבחירה: משכנתא חדשה / מיחזור / ייעוץ. מי ששילם על הגישה נכנס מיד לתהליך:
 * משכנתא חדשה נפתחת בשלב הראשון (בניית הפרופיל), ומיחזור בכלי המיחזור — השלב
 * הראשון שלו. מי שעוד לא שילם בוחר בין עצמאי / היברידי (מסך התשלום, ומשם ישר
 * לתהליך) לבין ליווי מלא. כל בחירה בליווי או בייעוץ הופכת לבקשה שמגיעה
 * ליועצים, עם הערה רשות של הלקוח.
 */
export function MortgageEntry({
  variant,
  onStart,
  busy,
  hasPlans,
  open,
  onOpenChange,
  initialGoal = null,
  autoService = null,
}: MortgageEntryProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { access, ready: accessReady } = usePlatformAccess();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogGoal, setDialogGoal] = useState<FlowGoal | null>(initialGoal);
  const [request, setRequest] = useState<{ goal: MortgageGoal; service: ServiceType } | null>(null);
  const autoHandled = useRef(false);

  const isOpen = variant === 'dialog' ? Boolean(open) : dialogOpen;
  const setOpen = (next: boolean) => {
    if (variant === 'dialog') onOpenChange?.(next);
    else setDialogOpen(next);
  };

  const onSelf = (goal: FlowGoal) => {
    setOpen(false);
    // עוד לא שולם — ₪49 לתהליך, ומשם חוזרים לכאן והתהליך נפתח
    if (!access.active) {
      router.push(`/dashboard/checkout?next=plan&goal=${goal}`);
      return;
    }
    if (goal === 'REFINANCE') {
      router.push('/mortgage-refinance');
      return;
    }
    onStart();
  };

  const onAdvisor = (goal: MortgageGoal, service: ServiceType) => {
    setOpen(false);
    setRequest({ goal, service });
  };

  // המשך אוטומטי של בחירה מעמוד הבית או ממסך התשלום
  useEffect(() => {
    if (!initialGoal || !autoService || !accessReady || autoHandled.current) return;
    autoHandled.current = true;
    if (autoService === 'SELF') onSelf(initialGoal);
    else if (autoService !== 'GUIDANCE') setRequest({ goal: initialGoal, service: autoService });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGoal, autoService, accessReady]);

  const dialogs = (
    <>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-4xl rounded-3xl bg-white p-6 md:p-8">
          <DialogTitle className="sr-only">מה תרצו לעשות?</DialogTitle>
          <ServiceChooser
            hasAccess={access.active}
            initialGoal={variant === 'dialog' ? initialGoal : dialogGoal}
            busy={busy}
            onSelf={onSelf}
            onAdvisor={onAdvisor}
          />
        </DialogContent>
      </Dialog>

      {request && (
        <GuidanceRequestDialog
          open
          onOpenChange={(next) => {
            if (!next) setRequest(null);
          }}
          goal={request.goal}
          serviceType={request.service}
          mode="member"
          memberName={session?.user?.name ?? undefined}
          memberEmail={session?.user?.email ?? undefined}
        />
      )}
    </>
  );

  if (variant === 'dialog') return dialogs;

  if (variant === 'sidebar') {
    return (
      <>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="mb-2.5 px-1 text-center text-sm font-black text-white/70">
            {hasPlans ? 'מתכננים משכנתא נוספת?' : 'מה תרצו לעשות?'}
          </p>
          <div className="space-y-2">
            {(Object.keys(GOAL_LABELS) as MortgageGoal[]).map((goal) => {
              const meta = GOAL_ICONS[goal];
              const Icon = meta.icon;
              return (
                <button
                  key={goal}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (goal === 'ADVICE') {
                      setRequest({ goal, service: 'GUIDANCE' });
                      return;
                    }
                    // שילמו כבר — התהליך נפתח ישר, בלי מסך המסלולים
                    if (access.active) {
                      onSelf(goal);
                      return;
                    }
                    setDialogGoal(goal);
                    setDialogOpen(true);
                  }}
                  className="group flex w-full items-center gap-3 rounded-2xl border-2 border-white/20 bg-white/10 px-3.5 py-3 text-right text-white transition-all hover:border-white/45 hover:bg-white/15 disabled:opacity-60"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient}`}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </span>
                  <span className="text-info font-black leading-snug">{GOAL_LABELS[goal].title}</span>
                </button>
              );
            })}
          </div>
          {access.active && (
            <p className="mt-2.5 flex items-center justify-center gap-1 text-2xs font-bold text-emerald-200">
              <BadgeCheck className="h-3.5 w-3.5" />
              התשלום התקבל · התהליך ייפתח מיד
            </p>
          )}
        </div>
        {dialogs}
      </>
    );
  }

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-brand-dark p-6 shadow-xl md:p-10"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/30 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-violet-600/25 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>
        <div className="relative">
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-black text-white/80 backdrop-blur">
              {access.active ? (
                <>
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-300" />
                  התשלום התקבל. בחרו משכנתא חדשה או מיחזור, והתהליך נפתח מיד
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  משכלנתא מלווה אתכם מהצעד הראשון ועד החתימה
                </>
              )}
            </span>
          </div>
          <ServiceChooser
            tone="dark"
            hasAccess={access.active}
            initialGoal={initialGoal}
            busy={busy}
            onSelf={onSelf}
            onAdvisor={onAdvisor}
          />
        </div>
      </motion.section>
      {dialogs}
    </>
  );
}
