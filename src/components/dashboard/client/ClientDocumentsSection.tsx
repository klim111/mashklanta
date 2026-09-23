'use client';

import { useEffect, useState } from 'react';
import { FolderOpen, Loader2, MapPin } from 'lucide-react';
import { DocumentVault } from '@/components/plan/documents/DocumentVault';
import { planHeadline } from '@/lib/client-agenda';
import type { DocumentsMode } from '@/lib/mortgage-plan';
import type { ClientDashboardData } from './useClientDashboard';
import { DashCard } from './ui';

/**
 * תיק המסמכים באזור האישי.
 *
 * זו אותה רשימה בדיוק שמוצגת בתוך התהליך — אותם מסמכים, אותו מצב הגשה, אותו
 * אחסון — כדי שמסמך שהועלה כאן ייחשב מוגש גם בשלב שדורש אותו, ולהפך. כשיש
 * יותר ממשכנתא אחת בוחרים באיזו תיק מסתכלים.
 */
export function ClientDocumentsSection({ data }: { data: ClientDashboardData }) {
  const plans = data.plansState.plans.filter((plan) => plan.status !== 'ARCHIVED');
  const [planId, setPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (plans.length === 0) {
      setPlanId(null);
      return;
    }
    setPlanId((current) => (current && plans.some((plan) => plan.id === current) ? current : plans[0].id));
  }, [plans]);

  if (!data.plansState.ready) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <DashCard demoId="dash-documents-card" title="תיק המסמכים" icon={<FolderOpen className="h-5 w-5 text-blue-600" />}>
        <p className="py-6 text-center text-info font-medium text-slate-600">
          תיק המסמכים נפתח יחד עם המשכנתא הראשונה. פתחו תהליך, והרשימה תיבנה לפי הפרופיל שלכם.
        </p>
      </DashCard>
    );
  }

  const plan = plans.find((item) => item.id === planId) ?? plans[0];

  return (
    <div className="space-y-4">
      {plans.length > 1 && (
        <DashCard title="באיזו משכנתא" icon={<MapPin className="h-5 w-5 text-blue-600" />}>
          <div className="flex flex-wrap justify-center gap-2">
            {plans.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPlanId(item.id)}
                className={`rounded-2xl border-2 px-4 py-2 text-info font-black transition-colors ${
                  item.id === plan.id
                    ? 'border-blue-500 bg-blue-50 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                }`}
              >
                {planHeadline(item)}
              </button>
            ))}
          </div>
        </DashCard>
      )}

      <DocumentVault
        planId={plan.id}
        data={plan.data}
        mode={plan.data.ANALYSIS.documentsMode as DocumentsMode | null}
        onModeChange={() => undefined}
        hideModes
      />
    </div>
  );
}
