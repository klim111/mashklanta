import { AdvisorPageFrame } from '@/components/advisor/shell/AdvisorPageFrame';

/**
 * כל מסכי היועץ: כיתוב מוגדל (advisor-type ב-globals.css), ובכל מסך שאינו
 * הלוח הראשי — שורת "חזרה" ו"לוח היועץ" בראש העמוד.
 */
export default function AdvisorDashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdvisorPageFrame>{children}</AdvisorPageFrame>;
}
