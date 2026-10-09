'use client';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { SigningData } from '@/lib/mortgage-plan';
import { ScenarioPicker, resolveSelection } from '../stages/signing/ScenarioPicker';
import { DocumentsChecklist } from '../stages/signing/DocumentsChecklist';

/**
 * "בחרו סוג עסקה" מתיק המסמכים: חלון צף עם האפשרויות של סוג העסקה ואופן
 * הרישום. כשנבחר תרחיש מוצגת רשימת המסמכים שלו, והמסמכים להעלאה בתיק
 * מתעדכנים לפיו (הבחירה נשמרת בשלב החתימה, וממנה נגזרת רשימת המסמכים).
 */
export function DealTypeDialog({
  open,
  onOpenChange,
  signing,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signing: SigningData;
  onChange: (patch: Partial<SigningData>) => void;
}) {
  const { deal, registry, scenario } = resolveSelection(signing);

  const toggleDocument = (key: string) => {
    const documents = { ...signing.documents };
    if (documents[key]) delete documents[key];
    else documents[key] = true;
    onChange({ documents });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-3xl bg-slate-50 p-5 md:p-7">
        <DialogTitle className="text-center text-subtitle font-black text-slate-900">בחרו סוג עסקה</DialogTitle>
        <DialogDescription className="text-center text-sm text-slate-600">
          לפי סוג העסקה נקבעת רשימת המסמכים שהבנק ידרוש, והיא מתעדכנת גם בתיק המסמכים.
        </DialogDescription>
        <div className="mt-2 space-y-5">
          <ScenarioPicker
            value={{ dealTypeId: signing.dealTypeId, registryId: signing.registryId, scenarioId: signing.scenarioId }}
            onChange={(next) => onChange(next)}
          />
          {deal && scenario && (
            <DocumentsChecklist
              deal={deal}
              registry={registry}
              scenario={scenario}
              collected={signing.documents}
              onToggle={toggleDocument}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
