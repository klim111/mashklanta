import type { DEAL_TYPES } from '@/components/mortgage-advisor/types';
import type { ClientDocumentStatus, ClientStage } from '@/lib/client-process';

/**
 * כרטיס הלקוח כפי שהוא מגיע מ-`/api/clients/[id]`.
 *
 * הטיפוס יושב כאן ולא בדף עצמו, כי גם דף הלקוח וגם תיק המסמכים שלו קוראים את
 * אותה תשובה מהשרת ומציגים ממנה חלקים שונים.
 */

export interface ClientDocumentView {
  id: string;
  key: string;
  name: string;
  stage: ClientStage;
  status: ClientDocumentStatus;
  required: boolean;
  note: string | null;
  submittedAt: string | null;
}

export interface ClientDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  stage: ClientStage;
  progress: number;
  household: 'SINGLE' | 'COUPLE';
  age: number | null;
  partnerName: string | null;
  partnerAge: number | null;
  income: number | null;
  partnerIncome: number | null;
  expenses: number | null;
  existingLoans: number | null;
  creditScore: number | null;
  downPayment: number | null;
  propertyValue: number | null;
  propertyAddress: string | null;
  mortgageAmount: number | null;
  dealType: keyof typeof DEAL_TYPES | null;
  notes: string | null;
  plannedMonthlyPayment: number | null;
  projectedCashFlow: number | null;
  documents: ClientDocumentView[];
}
