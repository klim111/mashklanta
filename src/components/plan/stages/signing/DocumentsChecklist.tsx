'use client';

import { motion } from 'framer-motion';
import { Check, FileText, FolderCheck } from 'lucide-react';
import { signingDocumentKey } from '@/lib/signing-documents';
import type { SigningDealType, SigningRegistry, SigningScenario } from '@/lib/signing-documents';
import { Panel } from '../../ui';

/**
 * רשימת המסמכים של התרחיש שנבחר.
 *
 * כל שורה היא מסמך שהבנק ידרוש, עם הדגשים שמסבירים מה בדיוק צריך להופיע בו.
 * הסימון נשמר לפי מפתח שכולל את מזהה התרחיש, כך שמעבר לתרחיש אחר אינו מוחק
 * את מה שכבר נאסף.
 */
export function DocumentsChecklist({
  deal,
  registry,
  scenario,
  collected,
  onToggle,
}: {
  deal: SigningDealType;
  registry: SigningRegistry | null;
  scenario: SigningScenario;
  collected: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const done = scenario.documents.filter(
    (document) => collected[signingDocumentKey(scenario.id, document.key)]
  ).length;
  const total = scenario.documents.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <Panel
      centered
      title="המסמכים שהבנק ידרוש בתרחיש שלכם"
      description={
        registry
          ? `${deal.title} · ${registry.title}. סמנו כל מסמך שכבר בידיכם — כך רואים במבט אחד מה עוד חסר לפני מועד החתימה.`
          : `${deal.title}. סמנו כל מסמך שכבר בידיכם — כך רואים במבט אחד מה עוד חסר לפני מועד החתימה.`
      }
      action={
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
            <FolderCheck className="h-3.5 w-3.5" />
            {done} / {total}
          </span>
        </div>
      }
    >
      <div className="mb-5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-l ${deal.gradient}`}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          />
        </div>
        <div className="mt-1.5 text-sm font-bold text-slate-500">
          {done === total
            ? 'כל המסמכים נאספו — אפשר לקבוע את מועד החתימה.'
            : `נאספו ${percent}% מהמסמכים. חסרים עוד ${total - done}.`}
        </div>
      </div>

      <div className="space-y-2.5">
        {scenario.documents.map((document, index) => {
          const key = signingDocumentKey(scenario.id, document.key);
          const checked = Boolean(collected[key]);
          return (
            <motion.button
              key={key}
              type="button"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index * 0.035, 0.4), duration: 0.28 }}
              onClick={() => onToggle(key)}
              className={`flex w-full items-start gap-3.5 rounded-2xl border-2 p-4 transition-all ${
                checked
                  ? 'border-emerald-300 bg-emerald-50/60'
                  : 'border-slate-200 bg-white hover:-translate-x-0.5 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 text-2xs font-black transition-colors ${
                  checked
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                {checked ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-info font-black leading-snug ${
                    checked ? 'text-emerald-900' : 'text-slate-900'
                  }`}
                >
                  {document.name}
                </span>
                <span
                  className={`mt-1 block text-sm font-medium leading-relaxed ${
                    checked ? 'text-emerald-800/80' : 'text-slate-600'
                  }`}
                >
                  {document.note}
                </span>
              </span>
              <FileText
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  checked ? 'text-emerald-400' : 'text-slate-300'
                }`}
              />
            </motion.button>
          );
        })}
      </div>
    </Panel>
  );
}
