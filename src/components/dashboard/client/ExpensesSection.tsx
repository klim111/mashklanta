'use client';

import EquityPlanningTool from '@/components/equity-planning/EquityPlanningTool';

/**
 * "תכנון הוצאות" באזור האישי — כלי תכנון ההון העצמי בגרסתו המעודכנת, בתוך
 * הדאשבורד. מה שנשמר כאן הוא אותו תכנון שמופיע בסקירה ושמועדי התשלום שלו
 * נכנסים ללוח השנה הראשי.
 */
export function ExpensesSection() {
  return <EquityPlanningTool embedded />;
}
