'use client';

import { useRouter } from 'next/navigation';
import { PieChart } from 'lucide-react';
import { SavedMixesBoard } from '@/components/mortgage-advisor/SavedMixesBoard';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import { isUnassociatedMix } from '@/components/plan/UnassignedMixes';
import type { PlanView } from '@/components/plan/usePlan';
import { mixBuilderHref } from './mixBuilderLink';

/**
 * התמהילים שהלקוח בנה ושמר בכלי בניית התמהילים — גם כאלה שעוד לא הוגשו
 * לבנקים. הצעות שהתקבלו מבנקים מוצגות מתחת לבקשה שלהן, ותמהילים בלי נכס
 * באזור משלהם, ולכן הם לא חוזרים כאן.
 */
export function savedBuilderMixes(saved: SavedMix[]): SavedMix[] {
  return saved.filter(
    (item) => !item.mix.quote && item.sharedWithClient !== false && !isUnassociatedMix(item)
  );
}

export function SavedMixesSection({
  plans,
  saved,
  ready,
  onDelete,
  onRename,
}: {
  plans: PlanView[];
  saved: SavedMix[];
  ready: boolean;
  onDelete: (mixId: string) => void;
  onRename: (mixId: string, name: string) => void;
}) {
  const router = useRouter();
  const mixes = savedBuilderMixes(saved);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-subtitle font-black text-slate-900">
          <PieChart className="h-5 w-5 text-blue-600" />
          התמהילים שבניתם
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
          כל תמהיל ששמרתם בכלי בניית התמהילים, גם לפני שהוגש לבנקים. פתיחה של תמהיל מחזירה אתכם
          לשלב בניית התמהיל בתהליך, עם הפרטים שהזנתם בשלבים.
        </p>
      </div>
      <SavedMixesBoard
        viewer="client"
        saved={mixes}
        ready={ready}
        onOpen={(item) =>
          router.push(
            mixBuilderHref(plans, {
              mixId: item.mix.id,
              planId: item.planId,
              propertyAddress: item.mix.propertyAddress,
            })
          )
        }
        onDelete={onDelete}
        onRename={onRename}
        emptyState={
          <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
            עוד לא נשמרו תמהילים. תמהיל שתשמרו בשלב בניית התמהיל יופיע כאן.
          </p>
        }
      />
    </section>
  );
}
