'use client';

import { Check, Info, RefreshCw } from 'lucide-react';
import { SIGNING_DEAL_TYPES, dealScenarios } from '@/lib/signing-documents';
import type { SigningData } from '@/lib/mortgage-plan';
import { resolveSelection } from '../signing/ScenarioPicker';
import type { ScenarioSelection } from '../signing/ScenarioPicker';

/**
 * בעלות הנכס ורישום הזכויות — שורה מתחת לסוג העסקה, באותו עיצוב.
 *
 * זו אותה בחירה בדיוק שנעשית בשלב החתימה (סוג העסקה, אופן רישום הזכויות
 * והתרחיש), והיא נשמרת על שלב החתימה עצמו — מקור אמת אחד. כל בחירה פותחת את
 * האפשרויות הבאות באותה שורה, לפי אותה לוגיקה: ביד 2 קודם אופן הרישום, ואז
 * התרחיש. זה לא חובה בשלב הזה; מי שממלא מקבל את רשימת המסמכים כבר עכשיו.
 */
export function OwnershipRow({
  signing,
  onChange,
}: {
  signing: SigningData;
  onChange: (next: SigningData) => void;
}) {
  const { deal, registry, scenario } = resolveSelection(signing);
  const select = (next: ScenarioSelection) => onChange({ ...signing, ...next });
  const reset = () => select({ dealTypeId: null, registryId: null, scenarioId: null });

  const scenarios = registry ? registry.scenarios : deal && !deal.registries ? dealScenarios(deal) : [];
  const step: 'deal' | 'registry' | 'scenario' = !deal
    ? 'deal'
    : deal.registries && !registry
      ? 'registry'
      : 'scenario';

  return (
    <div>
      <span className="mb-2 block text-center text-base font-black text-slate-800">
        בעלות הנכס ורישום הזכויות
      </span>

      <div className="flex flex-wrap justify-center gap-2">
        {step === 'deal' &&
          SIGNING_DEAL_TYPES.map((item) => (
            <OptionCard
              key={item.id}
              title={item.short}
              meta={`${dealScenarios(item).length} תרחישים`}
              onClick={() => select({ dealTypeId: item.id, registryId: null, scenarioId: null })}
            />
          ))}

        {deal && (
          <OptionCard selected title={deal.short} meta="לחצו לשינוי" onClick={reset} />
        )}

        {step === 'registry' &&
          deal?.registries?.map((item) => (
            <OptionCard
              key={item.id}
              title={item.title}
              meta={`${item.scenarios.length} תרחישים`}
              onClick={() =>
                select({ dealTypeId: deal.id, registryId: item.id, scenarioId: null })
              }
            />
          ))}

        {deal && registry && (
          <OptionCard
            selected
            title={registry.title}
            meta="לחצו לשינוי"
            onClick={() => select({ dealTypeId: deal.id, registryId: null, scenarioId: null })}
          />
        )}

        {step === 'scenario' &&
          !scenario &&
          deal &&
          scenarios.map((item) => (
            <OptionCard
              key={item.id}
              title={item.short}
              meta={`${item.documents.length} מסמכים`}
              onClick={() =>
                select({ dealTypeId: deal.id, registryId: registry?.id ?? null, scenarioId: item.id })
              }
            />
          ))}

        {deal && scenario && (
          <OptionCard
            selected
            title={scenario.short}
            meta={`${scenario.documents.length} מסמכים ידועים כבר עכשיו`}
            onClick={() =>
              select({ dealTypeId: deal.id, registryId: registry?.id ?? null, scenarioId: null })
            }
          />
        )}
      </div>

      <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[13px] font-medium text-slate-500">
        {scenario ? (
          <>
            <RefreshCw className="h-3.5 w-3.5" />
            רשימת המסמכים של התרחיש מחכה לכם בשלב החתימה
          </>
        ) : (
          <>
            <Info className="h-3.5 w-3.5" />
            לא חובה עכשיו — מילוי כבר בשלב הזה מקצר את איסוף המסמכים לחתימה
          </>
        )}
      </p>
    </div>
  );
}

/** כרטיס בחירה בשורה — בדיוק כמו כרטיסי סוג העסקה שמעליו */
function OptionCard({
  title,
  meta,
  selected = false,
  onClick,
}: {
  title: string;
  meta: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[10rem] max-w-[16rem] flex-1 rounded-2xl border-2 px-4 py-3 text-center transition-all sm:flex-none ${
        selected
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-blue-300'
      }`}
    >
      <span
        className={`flex items-center justify-center gap-1.5 text-sm font-black leading-snug ${
          selected ? 'text-blue-700' : 'text-slate-700'
        }`}
      >
        {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
        {title}
      </span>
      <span className="mt-0.5 block text-xs font-bold text-slate-500">{meta}</span>
    </button>
  );
}
