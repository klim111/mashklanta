import type { PlanStageId } from './mortgage-plan';

/**
 * טיוטת היועץ בשלב של לקוח.
 *
 * מה שהיועץ משנה בעמוד של שלב בתהליך של הלקוח לא מגיע ללקוח מיד. השינויים
 * נשמרים כטיוטה של היועץ: אילו שדות שינה, לאיזה ערך, ומה היה אצל הלקוח בשדה
 * ברגע שהיועץ התחיל לערוך אותו. היועץ רואה את העמוד של הלקוח ומעליו את
 * הטיוטה שלו. בשדות שלא נגע בהם הוא רואה תמיד את הערכים העדכניים של הלקוח.
 *
 * "שדר" מחיל את הטיוטה על נתוני השלב: כל שדה שהיועץ שינה נדרס בערך שלו, וכל
 * השאר נשאר כפי שהלקוח השאיר אותו.
 *
 * שדה מזוהה בנתיב — `negotiation.round`, `checklist.appraisal` — כך ששינוי של
 * היועץ בשדה אחד בתוך אובייקט לא דורס שדה אחר שהלקוח שינה באותו אובייקט.
 * רשימות נחשבות שדה אחד.
 */

export interface StageDraft {
  /** הערכים שהיועץ קבע, לפי נתיב */
  values: Record<string, unknown>;
  /** מה היה אצל הלקוח בכל נתיב כשהיועץ התחיל לערוך אותו */
  base: Record<string, unknown>;
  updatedAt: string | null;
}

export type PlanDrafts = Partial<Record<PlanStageId, StageDraft>>;

export const emptyDraft = (): StageDraft => ({ values: {}, base: {}, updatedAt: null });

/**
 * שדות ניווט — באיזה מסך פנימי של השלב עומדים. היועץ מנווט בהם בחופשיות,
 * והם אינם חלק ממה שמשודר ללקוח.
 */
export const NAVIGATION_KEYS: Partial<Record<PlanStageId, readonly string[]>> = {
  ANALYSIS: ['profileScreen', 'planningStep'],
  SIGNING: ['screen', 'collateralShown'],
};

export function isNavigationPath(stage: PlanStageId, path: string): boolean {
  const root = path.split('.')[0];
  return (NAVIGATION_KEYS[stage] ?? []).includes(root);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function readPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const key of path.split('.')) {
    if (!isPlainObject(current)) return undefined;
    current = current[key];
  }
  return current;
}

function writePath<T>(source: T, path: string, value: unknown): T {
  const [key, ...rest] = path.split('.');
  const base: Record<string, unknown> = isPlainObject(source) ? source : {};
  if (rest.length === 0) return { ...base, [key]: value } as T;
  return { ...base, [key]: writePath(base[key], rest.join('.'), value) } as T;
}

/** הנתיבים שבהם `next` שונה מ-`previous` — עד לרמה של ערך בודד או רשימה */
export function changedPaths(previous: unknown, next: unknown, prefix = ''): string[] {
  if (sameValue(previous, next)) return [];
  if (isPlainObject(previous) && isPlainObject(next)) {
    const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
    return Array.from(keys).flatMap((key) =>
      changedPaths(previous[key], next[key], prefix ? `${prefix}.${key}` : key)
    );
  }
  return [prefix];
}

const isWithin = (path: string, ancestor: string) => path === ancestor || path.startsWith(`${ancestor}.`);

/** נתוני השלב כפי שהיועץ רואה אותם: מה שאצל הלקוח, ועליו הטיוטה */
export function applyDraft<T>(clientData: T, draft: StageDraft | null | undefined): T {
  if (!draft) return clientData;
  return Object.keys(draft.values)
    .sort((a, b) => a.split('.').length - b.split('.').length)
    .reduce((data, path) => writePath(data, path, draft.values[path]), clientData);
}

/**
 * עריכה של היועץ: `shown` הוא מה שהוצג לו, `next` מה שהעורך החזיר. כל נתיב
 * שהשתנה נרשם בטיוטה, ונתיב שחזר לערך של הלקוח יוצא ממנה.
 */
export function recordEdit<T>(
  stage: PlanStageId,
  draft: StageDraft,
  clientData: T,
  shown: T,
  next: T
): StageDraft {
  const values = { ...draft.values };
  const base = { ...draft.base };

  changedPaths(shown, next).forEach((path) => {
    if (!path || isNavigationPath(stage, path)) return;
    const value = readPath(next, path);

    // נתיב שכבר נמצא בתוך שדה שנרשם בשלמותו מעדכן את אותו שדה
    const ancestor = Object.keys(values).find((key) => key !== path && isWithin(path, key));
    if (ancestor) {
      values[ancestor] = readPath(next, ancestor);
      if (sameValue(values[ancestor], readPath(clientData, ancestor))) {
        delete values[ancestor];
        delete base[ancestor];
      }
      return;
    }

    Object.keys(values)
      .filter((key) => key !== path && isWithin(key, path))
      .forEach((key) => {
        delete values[key];
        delete base[key];
      });

    const client = readPath(clientData, path);
    if (sameValue(value, client)) {
      delete values[path];
      delete base[path];
      return;
    }
    values[path] = value;
    if (!(path in base)) base[path] = client;
  });

  return { values, base, updatedAt: new Date().toISOString() };
}

/** השדות שהיועץ שינה ועוד לא שודרו */
export function pendingPaths(draft: StageDraft | null | undefined): string[] {
  return draft ? Object.keys(draft.values) : [];
}

/**
 * שדות שהלקוח שינה אחרי שהיועץ התחיל לערוך אותם — "שדר" ידרוס אותם, ולכן
 * היועץ רואה אותם לפני השידור.
 */
export function clientChangedPaths<T>(draft: StageDraft | null | undefined, clientData: T): string[] {
  if (!draft) return [];
  return Object.keys(draft.base).filter((path) => !sameValue(draft.base[path], readPath(clientData, path)));
}

/** קריאת טיוטה שנשמרה — תמיד מחזירה מבנה שלם */
export function parseDraft(raw: unknown): StageDraft | null {
  if (!isPlainObject(raw)) return null;
  const values = isPlainObject(raw.values) ? raw.values : {};
  const base = isPlainObject(raw.base) ? raw.base : {};
  if (Object.keys(values).length === 0) return null;
  return { values, base, updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null };
}
