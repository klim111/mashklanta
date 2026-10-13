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

/**
 * מה שנשמר בעמודה מעבר לכלים עצמם:
 *   • equity — טיוטת תכנון ההון העצמי מההרשמה, עד שהיא עוברת לטבלה שלה;
 *   • resume — הכלים שהלקוח התחיל לפני ההרשמה והשלב שבו עצר בכל אחד, להודעה
 *     "תרצו להמשיך?" בכניסה הראשונה לדאשבורד. נמחק כשבוחרים או סוגרים.
 */
export const STORED_KEYS = [...TOOL_DATA_KEYS, 'equity', 'resume'] as const;

export type StoredKey = (typeof STORED_KEYS)[number];

/** מה שכל כלי שומר — הכלי עצמו יודע לקרוא אותו */
export type AccountToolData = Partial<Record<StoredKey, unknown>>;

/** גודל מרבי לכלי אחד — כמה מאות מסלולים או הלוואות, הרבה מעבר לשימוש אמיתי */
export const MAX_TOOL_DATA_BYTES = 200_000;

export function isToolDataKey(value: unknown): value is ToolDataKey {
  return typeof value === 'string' && (TOOL_DATA_KEYS as readonly string[]).includes(value);
}

export function isStoredKey(value: unknown): value is StoredKey {
  return typeof value === 'string' && (STORED_KEYS as readonly string[]).includes(value);
}

/** קריאת העמודה מבסיס הנתונים: רק מפתחות מוכרים, ורק ערכים שהם אובייקט */
export function parseToolData(raw: unknown): AccountToolData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: AccountToolData = {};
  for (const key of STORED_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (value && typeof value === 'object') result[key] = value;
  }
  return result;
}

export type ToolDataWrite =
  | { ok: true; key: StoredKey; data: Record<string, unknown> | null }
  | { ok: false; error: string };

/** בדיקת גוף הבקשה לשמירת כלי אחד. data: null מוחק את מה ששמור לכלי */
export function parseToolDataWrite(body: unknown): ToolDataWrite {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid payload' };
  const { key, data } = body as { key?: unknown; data?: unknown };
  if (!isStoredKey(key)) return { ok: false, error: 'Unknown tool' };
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

/* ---------------- הכלים שהתחילו לפני ההרשמה ---------------- */

/** הכלים החינמיים, לפי הסדר שבו ההודעה מציעה להמשיך בהם */
export const RESUME_TOOLS = ['affordability', 'refinance', 'equity', 'consumerLoans'] as const;

export type ResumeTool = (typeof RESUME_TOOLS)[number];

export interface ResumeInfo {
  tools: ResumeTool[];
  /** השלב שבו הלקוח עצר בכל כלי, כפי שהכלי עצמו קורא לו */
  steps: Partial<Record<ResumeTool, string>>;
  savedAt: string;
}

function isResumeTool(value: unknown): value is ResumeTool {
  return typeof value === 'string' && (RESUME_TOOLS as readonly string[]).includes(value);
}

export function parseResume(value: unknown): ResumeInfo | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as { tools?: unknown; steps?: unknown; savedAt?: unknown };
  const listed: unknown[] = Array.isArray(raw.tools) ? raw.tools : [];
  const tools = RESUME_TOOLS.filter((tool) => listed.includes(tool));
  if (tools.length === 0) return null;
  const steps: ResumeInfo['steps'] = {};
  if (raw.steps && typeof raw.steps === 'object') {
    for (const [tool, step] of Object.entries(raw.steps as Record<string, unknown>)) {
      if (isResumeTool(tool) && typeof step === 'string' && step.length <= 40) steps[tool] = step;
    }
  }
  return { tools, steps, savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : '' };
}

/** תכנון הון עצמי: הוזן מחיר נכס או הוצאה */
export function equityHasContent(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const raw = value as { propertyData?: { price?: unknown }; expenses?: unknown };
  if (positive(raw.propertyData?.price)) return true;
  return (
    Array.isArray(raw.expenses) &&
    raw.expenses.some((expense) => {
      const item = (expense ?? {}) as { amount?: unknown; description?: unknown };
      return positive(item.amount) || (typeof item.description === 'string' && item.description.trim().length > 0);
    })
  );
}

const RESUME_HAS_CONTENT: Record<ResumeTool, (value: unknown) => boolean> = {
  ...TOOL_HAS_CONTENT,
  equity: equityHasContent,
};

/** כל מה שאורח הזין בכלים החינמיים, יחד, בגבול סביר לבקשת הרשמה אחת */
export const MAX_GUEST_SNAPSHOT_BYTES = 600_000;

/**
 * מה שהדפדפן שולח עם ההרשמה: הנתונים של כל כלי שהתחיל בו, והשלב שבו עצר.
 * מחזיר את מה שנשמר על ההרשמה הממתינה ועובר לחשבון באישור המייל — רק כלים
 * שבאמת הוזן בהם משהו — או null כשאין כלום.
 */
export function guestSnapshotToToolData(raw: unknown, now: Date = new Date()): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (JSON.stringify(raw).length > MAX_GUEST_SNAPSHOT_BYTES) return null;
  const input = raw as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const tools: ResumeTool[] = [];
  for (const tool of RESUME_TOOLS) {
    const value = input[tool];
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    if (!RESUME_HAS_CONTENT[tool](value)) continue;
    result[tool] = value;
    tools.push(tool);
  }
  if (tools.length === 0) return null;
  const resume = parseResume({ tools, steps: input.steps, savedAt: now.toISOString() });
  if (resume) result.resume = resume;
  return result;
}
