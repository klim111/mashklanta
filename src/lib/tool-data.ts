/**
 * מה שהלקוח הזין בכלים הפתוחים, שמור בחשבון שלו (User.toolDataJson).
 *
 * הכלים האלה פתוחים גם למי שלא נרשם, והאורח עובד על אחסון הדפדפן. כשהוא
 * נרשם ונכנס, מה שהזין עובר לחשבון (src/components/tool-data/toolData.ts),
 * ומשם הכלי נפתח עם אותם נתונים — בכל מכשיר, וגם אחרי שהדפדפן נוקה.
 *
 * הקובץ משותף לשרת ולדפדפן, ולכן אין בו גישה לבסיס הנתונים.
 */

import { migrateMortgagePlanningUserData } from './borrower-loans';
import { defaultMortgagePlanningUserData } from './mortgage-affordability';
import { analysisFromPlanning } from './mortgage-plan';
import type { AnalysisData } from './mortgage-plan';

export const TOOL_DATA_KEYS = ['refinance', 'affordability', 'consumerLoans'] as const;

export type ToolDataKey = (typeof TOOL_DATA_KEYS)[number];

/** מה שכל כלי שומר — הכלי עצמו יודע לקרוא אותו */
export type AccountToolData = Partial<Record<ToolDataKey, unknown>>;

/** גודל מרבי לכלי אחד — כמה מאות מסלולים או הלוואות, הרבה מעבר לשימוש אמיתי */
export const MAX_TOOL_DATA_BYTES = 200_000;

export function isToolDataKey(value: unknown): value is ToolDataKey {
  return typeof value === 'string' && (TOOL_DATA_KEYS as readonly string[]).includes(value);
}

/** קריאת העמודה מבסיס הנתונים: רק מפתחות מוכרים, ורק ערכים שהם אובייקט */
export function parseToolData(raw: unknown): AccountToolData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: AccountToolData = {};
  for (const key of TOOL_DATA_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (value && typeof value === 'object') result[key] = value;
  }
  return result;
}

export type ToolDataWrite =
  | { ok: true; key: ToolDataKey; data: Record<string, unknown> | null }
  | { ok: false; error: string };

/** בדיקת גוף הבקשה לשמירת כלי אחד. data: null מוחק את מה ששמור לכלי */
export function parseToolDataWrite(body: unknown): ToolDataWrite {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid payload' };
  const { key, data } = body as { key?: unknown; data?: unknown };
  if (!isToolDataKey(key)) return { ok: false, error: 'Unknown tool' };
  if (data === null) return { ok: true, key, data: null };
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'Invalid data' };
  }
  if (JSON.stringify(data).length > MAX_TOOL_DATA_BYTES) return { ok: false, error: 'Too large' };
  return { ok: true, key, data: data as Record<string, unknown> };
}

/* ---------------- מתי יש בכלי משהו ששווה לשמור ---------------- */

function positive(value: unknown): boolean {
  const number = typeof value === 'string' ? Number(value.replace(/[^\d.]/g, '')) : Number(value);
  return Number.isFinite(number) && number > 0;
}

/** בדיקת מיחזור: לפחות מסלול אחד */
export function refinanceHasContent(value: unknown): boolean {
  const tracks = (value as { tracks?: unknown } | null)?.tracks;
  return Array.isArray(tracks) && tracks.length > 0;
}

/** מה אני יכול להרשות לעצמי: הוזן לפחות סכום אחד — הכנסה, הון עצמי או מחיר */
export function affordabilityHasContent(value: unknown): boolean {
  const userData = (value as { userData?: Record<string, unknown> } | null)?.userData;
  if (!userData || typeof userData !== 'object') return false;
  const borrower = (key: string) => (userData[key] ?? {}) as Record<string, unknown>;
  return [
    userData.monthlyIncome,
    userData.ownCapital,
    userData.propertyPrice,
    userData.currentPropertyPrice,
    borrower('borrower1').monthlyIncome,
    borrower('borrower2').monthlyIncome,
  ].some(positive);
}

/** הלוואות צרכניות: לפחות הלוואה אחת */
export function consumerLoansHasContent(value: unknown): boolean {
  const loans = (value as { loans?: unknown } | null)?.loans;
  return Array.isArray(loans) && loans.length > 0;
}

export const TOOL_HAS_CONTENT: Record<ToolDataKey, (value: unknown) => boolean> = {
  refinance: refinanceHasContent,
  affordability: affordabilityHasContent,
  consumerLoans: consumerLoansHasContent,
};

/**
 * הפרופיל הפיננסי של תהליך חדש, ממה שהלקוח הזין ב«מה אני יכול להרשות
 * לעצמי» — גם אם הזין אותו לפני שנרשם. אותו מבנה שהכלי שומר בשלב הניתוח.
 */
export function analysisFromToolData(toolDataJson: unknown): AnalysisData | undefined {
  const affordability = parseToolData(toolDataJson).affordability as
    | { userData?: Record<string, unknown>; currentStep?: unknown }
    | undefined;
  if (!affordability?.userData || !affordabilityHasContent(affordability)) return undefined;
  const planning = migrateMortgagePlanningUserData({
    ...defaultMortgagePlanningUserData(),
    ...affordability.userData,
  });
  const step = typeof affordability.currentStep === 'string' ? affordability.currentStep : 'property-type';
  return analysisFromPlanning(planning, step);
}
