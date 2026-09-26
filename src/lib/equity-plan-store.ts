import { prisma } from './db';
import {
  FINANCING_PROFILES,
  isFinancingProfile,
  sanitizeExpenses,
} from './equity-planning';
import type { EquityExpense, EquityPlanView, FinancingProfileId } from './equity-planning';

/**
 * שכבת הגישה לתכנון ההון העצמי.
 *
 * לכל משתמש תכנון אחד, ורק הוא רואה ועורך אותו. הכלי שולח את הטבלה המלאה בכל
 * שמירה, והשרת גוזר ממנה את עמודות הסיכום — כך שהדאשבורד ולוח השנה קוראים
 * מספרים מוכנים בלי לפרש את ה-JSON.
 */

export interface SaveEquityPlanInput {
  propertyPrice: number;
  /** YYYY-MM-DD, או ריק */
  targetDate: string;
  financingProfile: FinancingProfileId;
  usesBroker: boolean;
  expenses: EquityExpense[];
}

interface PlanRow {
  id: string;
  propertyPrice: number;
  targetDate: Date | null;
  financingProfile: string;
  usesBroker: boolean;
  minEquityRequired: number;
  totalExpenses: number;
  totalRequired: number;
  expensesJson: unknown;
  updatedAt: Date;
}

function toView(row: PlanRow): EquityPlanView {
  const profile = isFinancingProfile(row.financingProfile) ? row.financingProfile : 'first-home';
  return {
    id: row.id,
    propertyPrice: row.propertyPrice,
    targetDate: row.targetDate ? row.targetDate.toISOString().split('T')[0] : '',
    financingProfile: profile,
    usesBroker: row.usesBroker,
    expenses: sanitizeExpenses(row.expensesJson),
    minEquityRequired: row.minEquityRequired,
    totalExpenses: row.totalExpenses,
    totalRequired: row.totalRequired,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getEquityPlan(ownerId: string): Promise<EquityPlanView | null> {
  const row = await prisma.equityPlan.findUnique({ where: { ownerId } });
  return row ? toView(row as PlanRow) : null;
}

/** תאריך היעד נשמר כחצות UTC, כדי שהיום לא יזוז בין אזורי זמן */
function toDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function saveEquityPlan(
  ownerId: string,
  input: SaveEquityPlanInput
): Promise<EquityPlanView> {
  const expenses = sanitizeExpenses(input.expenses);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const minEquityRequired =
    input.propertyPrice * FINANCING_PROFILES[input.financingProfile].minEquityPercent;

  const data = {
    propertyPrice: input.propertyPrice,
    targetDate: toDate(input.targetDate),
    financingProfile: input.financingProfile,
    usesBroker: input.usesBroker,
    minEquityRequired,
    totalExpenses,
    totalRequired: minEquityRequired + totalExpenses,
    expensesJson: expenses as unknown as object,
  };

  const row = await prisma.equityPlan.upsert({
    where: { ownerId },
    create: { ownerId, ...data },
    update: data,
  });
  return toView(row as PlanRow);
}

export async function deleteEquityPlan(ownerId: string): Promise<boolean> {
  const result = await prisma.equityPlan.deleteMany({ where: { ownerId } });
  return result.count > 0;
}
