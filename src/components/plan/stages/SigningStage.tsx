'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ScanSearch } from 'lucide-react';
import { NEW_PLAN_FLOW } from '@/lib/mortgage-plan';
import type { PlanData, PlanFlow, SigningData, SigningScreen } from '@/lib/mortgage-plan';
import { SIGNING_VISITS } from '@/lib/signing-visits';
import { StageIntro } from '../StageIntro';
import { FinalTermsPanel } from './signing/FinalTermsPanel';
import { BankFileScreen } from './signing/BankFileScreen';
import { CollateralScreen } from './signing/CollateralScreen';
import { BranchVisitScreen, useSigningVisitSync } from './signing/BranchVisitScreen';

const reveal = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3 },
};

/**
 * שלב 5 — ההכנה לחתימה על תיק המשכנתא והחתימה עצמה.
 *
 * בכניסה לשלב מוצג עמוד ההסבר, ואחריו תת-השלבים לפי הסדר: האישור לבנק לפתיחת
 * התיק; הבטחונות וטופס הטיולים (שני טפסים שונים מהבנק); הגשת מקורות מסמכי
 * הבטחונות בסניף; והחתימה על תיק המשכנתא בבנק, עם התמהיל הסופי שאושר. שתי
 * ההגעות לסניף נכנסות ללוח השנה כמשימות. מסמכי התיק לפי סוג העסקה נמצאים
 * בתיק המסמכים.
 */
export function SigningStage({
  data,
  planId,
  onChange,
  flow = NEW_PLAN_FLOW,
  advisorRun = false,
  lead,
}: {
  data: PlanData;
  planId: string;
  onChange: (next: SigningData) => void;
  /** סוג התהליך — לכותרות של עמוד ההסבר */
  flow?: PlanFlow;
  /** יועץ מלווה את שלב החתימה — משנה את תת-השלב של פתיחת התיק */
  advisorRun?: boolean;
  /**
   * מסך פתיחה במקום עמוד ההסבר — במיחזור פנימי: אימות ההצעה של הבנק, ואחריו
   * תת-השלבים של החתימה כמו בשלב 5.
   */
  lead?: { label: string; content: ReactNode; continueLabel: string };
}) {
  const value = data.SIGNING;
  useSigningVisitSync(data, planId, onChange);

  const go = (screen: SigningScreen) => onChange({ ...value, screen });
  const screen = value.screen || 'overview';

  return (
    <div className="space-y-5">
      <ScreenRail current={screen} visits={value.visits} firstLabel={lead?.label} onSelect={go} />

      <AnimatePresence mode="wait" initial={false}>
        {screen === 'overview' ? (
          <motion.div key="overview" {...reveal}>
            {lead ? (
              <div className="space-y-5">
                {lead.content}
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => go('bank-file')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-button font-black text-white transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
                  >
                    {lead.continueLabel}
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <StageIntro stage="SIGNING" flow={flow} onStart={() => go('bank-file')} />
            )}
          </motion.div>
        ) : screen === 'bank-file' ? (
          <motion.div key="bank-file" {...reveal}>
            <BankFileScreen
              data={data}
              planId={planId}
              onChange={onChange}
              advisorRun={advisorRun}
              flow={flow}
              onContinue={() => go('collateral')}
            />
          </motion.div>
        ) : screen === 'collateral' ? (
          <motion.div key="collateral" {...reveal}>
            <CollateralScreen
              data={data}
              planId={planId}
              onChange={onChange}
              onContinue={() => go('collateral-submit')}
            />
          </motion.div>
        ) : screen === 'collateral-submit' ? (
          <motion.div key="collateral-submit" {...reveal}>
            <BranchVisitScreen
              data={data}
              planId={planId}
              onChange={onChange}
              visitKey="collateral-submit"
              explanation="כשעורך הדין והמוכרים סיימו להכין את מסמכי הבטחונות, מגישים את המקורות (לא העתקים) פיזית בסניף הבנק. קבעו מתי מגיעים לסניף, וסמנו כשהמקורות הוגשו."
              continueLabel="לחתימה על תיק המשכנתא"
              onContinue={() => go('bank-sign')}
            />
          </motion.div>
        ) : (
          <motion.div key="bank-sign" {...reveal}>
            <BranchVisitScreen
              data={data}
              planId={planId}
              onChange={onChange}
              visitKey="bank-sign"
              explanation="מגיעים לסניף הבנק לחתום על תיק המשכנתא. קבעו מתי, וסמנו כשהחתימה בוצעה. למטה מופיע התמהיל הסופי שאושר: ודאו שזה מה שמופיע בתיק לפני שחותמים."
            >
              <FinalTermsPanel
                data={data}
                planId={planId}
                title="התמהיל הסופי שאושר"
                description="אין צורך להזין כאן דבר. לפני החתימה ודאו שזה התמהיל שמופיע בתיק המשכנתא: אותם מסלולים, סכומים, ריביות ותקופות."
              />
              <p
                dir="rtl"
                className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm font-bold leading-relaxed text-amber-950"
              >
                <ScanSearch className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                ודאו שהתמהיל בתיק המשכנתא זהה לתמהיל הסופי שמופיע כאן. אם משהו שונה, עצרו ובקשו הסבר בכתב לפני
                החתימה: אחריה אין דרך חזרה.
              </p>
            </BranchVisitScreen>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** ניווט בין תת-המסכים של השלב, כמו בפרופיל הפיננסי */
function ScreenRail({
  current,
  visits,
  firstLabel,
  onSelect,
}: {
  current: SigningScreen;
  visits: SigningData['visits'];
  firstLabel?: string;
  onSelect: (screen: SigningScreen) => void;
}) {
  const items: Array<{ id: SigningScreen; label: string; done?: boolean }> = [
    { id: 'overview', label: firstLabel ?? 'על השלב' },
    { id: 'bank-file', label: 'אישור לבנק לפתיחת תיק' },
    { id: 'collateral', label: 'בטחונות וטופס טיולים' },
    { id: 'collateral-submit', label: SIGNING_VISITS['collateral-submit'].short, done: Boolean(visits['collateral-submit'].doneAt) },
    { id: 'bank-sign', label: SIGNING_VISITS['bank-sign'].short, done: Boolean(visits['bank-sign'].doneAt) },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => {
        const active = item.id === current;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
              active
                ? 'bg-slate-900 text-white shadow-md'
                : item.done
                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:ring-emerald-400'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-400'
            }`}
          >
            {index > 0 && (
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-2xs ${
                  active ? 'bg-white/20' : item.done ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {index}
              </span>
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
