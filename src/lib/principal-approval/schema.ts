/**
 * The single source of truth for the principal-approval (אישור עקרוני) intake.
 *
 * The form renderer, the server-side validation, the completeness meter, the
 * conflict detector and the printable report all read these definitions, so a
 * field only ever has to be declared once.
 */

import type { FieldKind, ValidatableField } from './validation';
import { COUNTRIES } from './countries';

export type EntityType =
  | 'case'
  | 'borrower'
  | 'guarantor'
  | 'income'
  | 'prevEmployment'
  | 'bankAccount'
  | 'fundingSource';

export const ENTITY_TYPES: EntityType[] = [
  'case',
  'borrower',
  'guarantor',
  'income',
  'prevEmployment',
  'bankAccount',
  'fundingSource',
];

/** Entities whose rows a user may add / remove. */
export const REPEATABLE_ENTITIES: EntityType[] = [
  'borrower',
  'guarantor',
  'income',
  'prevEmployment',
  'bankAccount',
  'fundingSource',
];

export interface Option {
  value: string;
  label: string;
}

export type Condition = {
  field: string;
  /** value must equal this */
  equals?: string | number | boolean;
  /** value must be one of these */
  in?: (string | number | boolean)[];
  /** value must be truthy / non-empty */
  truthy?: boolean;
};

export interface FieldDef extends ValidatableField {
  key: string;
  kind: FieldKind;
  label: string;
  placeholder?: string;
  help?: string;
  required?: boolean;
  options?: Option[];
  /** Options that must be resolved at runtime (banks, branches, people). */
  optionsSource?: 'banks' | 'branches' | 'countries' | 'people';
  /** For branch drop-downs: the sibling field holding the bank code. */
  dependsOn?: string;
  /** Rendered only while the condition holds. */
  visibleWhen?: Condition;
  /** Becomes mandatory only while the condition holds. */
  requiredWhen?: Condition;
  /** Grid width, 1–3 columns. */
  span?: 1 | 2 | 3;
  suffix?: string;
  min?: number;
  max?: number;
}

export interface SectionDef {
  id: string;
  title: string;
  subtitle?: string;
  entityType: EntityType;
  fields: FieldDef[];
}

/* -------------------------------------------------------------------------- */
/* Option lists                                                                */
/* -------------------------------------------------------------------------- */

export const GENDER_OPTIONS: Option[] = [
  { value: 'male', label: 'זכר' },
  { value: 'female', label: 'נקבה' },
  { value: 'other', label: 'אחר / מעדיף/ה לא לציין' },
];

export const EMPLOYMENT_STATUS_OPTIONS: Option[] = [
  { value: 'employee', label: 'שכיר' },
  { value: 'self_employed', label: 'עצמאי' },
  { value: 'employee_and_self', label: 'שכיר ועצמאי' },
  { value: 'unemployed', label: 'לא מועסק' },
  { value: 'pensioner', label: 'פנסיונר' },
];

export const MARITAL_STATUS_OPTIONS: Option[] = [
  { value: 'single', label: 'רווק/ה' },
  { value: 'married', label: 'נשוי/אה' },
  { value: 'cohabiting', label: 'ידוע/ה בציבור' },
  { value: 'divorced', label: 'גרוש/ה' },
  { value: 'separated', label: 'פרוד/ה' },
  { value: 'widowed', label: 'אלמן/ה' },
];

export const EDUCATION_OPTIONS: Option[] = [
  { value: 'elementary', label: 'יסודית' },
  { value: 'high_school', label: 'תיכונית' },
  { value: 'post_secondary', label: 'על-תיכונית / הנדסאי' },
  { value: 'bachelor', label: 'תואר ראשון' },
  { value: 'master', label: 'תואר שני' },
  { value: 'doctorate', label: 'תואר שלישי' },
  { value: 'other', label: 'אחר' },
];

export const BORROWERS_RELATION_OPTIONS: Option[] = [
  { value: 'married', label: 'נשואים' },
  { value: 'family', label: 'בני משפחה' },
  { value: 'partners', label: 'שותפים' },
  { value: 'cohabiting', label: 'ידועים בציבור' },
];

export const GUARANTOR_RELATION_OPTIONS: Option[] = [
  { value: 'spouse', label: 'בן/בת זוג' },
  { value: 'parent', label: 'הורה' },
  { value: 'child', label: 'ילד/ה' },
  { value: 'sibling', label: 'אח/אחות' },
  { value: 'relative', label: 'קרוב/ת משפחה אחר/ת' },
  { value: 'friend', label: 'חבר/ה' },
  { value: 'business_partner', label: 'שותף/ה עסקי/ת' },
  { value: 'other', label: 'אחר' },
];

export const INCOME_TYPE_OPTIONS: Option[] = [
  { value: 'salary', label: 'שכיר' },
  { value: 'self_employed', label: 'עצמאי' },
  { value: 'pension', label: 'פנסיה' },
  { value: 'alimony', label: 'מזונות' },
  { value: 'scholarship', label: 'מלגה' },
  { value: 'rent', label: 'שכירות' },
];

export const LOAN_TIMEFRAME_OPTIONS: Option[] = [
  { value: '1m', label: 'בתוך חודש' },
  { value: '2m', label: 'בתוך חודשיים' },
  { value: '3m', label: 'בתוך שלושה חודשים' },
  { value: '3m_plus', label: 'מעל שלושה חודשים' },
];

export const FUNDING_SOURCE_OPTIONS: Option[] = [
  { value: 'apartment_sale', label: 'מכירת דירה' },
  { value: 'other_loans', label: 'הלוואות אחרות' },
  { value: 'gift_from_family', label: 'הון עצמי — מתנה ממשפחה' },
  { value: 'savings', label: 'הון עצמי — חסכונות' },
];

export const YES_NO_OPTIONS: Option[] = [
  { value: 'true', label: 'כן' },
  { value: 'false', label: 'לא' },
];

/* -------------------------------------------------------------------------- */
/* Person (borrower / guarantor)                                               */
/* -------------------------------------------------------------------------- */

const personIdentityFields: FieldDef[] = [
  { key: 'firstName', kind: 'name', label: 'שם פרטי', required: true, placeholder: 'ישראל' },
  { key: 'lastName', kind: 'name', label: 'שם משפחה', required: true, placeholder: 'ישראלי' },
  { key: 'idNumber', kind: 'israeliId', label: 'תעודת זהות', required: true, placeholder: '9 ספרות', help: 'כולל ספרת ביקורת' },
  { key: 'birthDate', kind: 'pastDate', label: 'תאריך לידה', required: true },
  { key: 'idIssueDate', kind: 'pastDate', label: 'תאריך הנפקת תעודת זהות', required: true },
  { key: 'idExpiryDate', kind: 'date', label: 'תוקף תעודת זהות', required: true, help: 'התאריך המופיע בתעודה' },
  { key: 'gender', kind: 'select', label: 'מגדר', required: true, options: GENDER_OPTIONS },
  {
    key: 'hasForeignCitizenship',
    kind: 'boolean',
    label: 'אזרחות זרה',
    required: true,
    help: 'האם קיימת אזרחות נוספת מלבד האזרחות הישראלית',
  },
  {
    key: 'foreignCitizenshipCountries',
    kind: 'multiselect',
    label: 'מדינות האזרחות הזרה',
    optionsSource: 'countries',
    options: COUNTRIES,
    visibleWhen: { field: 'hasForeignCitizenship', equals: true },
    requiredWhen: { field: 'hasForeignCitizenship', equals: true },
    span: 2,
  },
];

const personContactFields: FieldDef[] = [
  { key: 'phone', kind: 'phone', label: 'טלפון', required: true, placeholder: '050-1234567' },
  { key: 'email', kind: 'email', label: 'אימייל', required: true, placeholder: 'name@example.com' },
  { key: 'city', kind: 'text', label: 'עיר מגורים', required: true },
  { key: 'address', kind: 'text', label: 'כתובת מגורים', required: true, placeholder: 'רחוב, מספר, דירה', span: 2 },
  { key: 'zipCode', kind: 'zip', label: 'מיקוד', required: true, placeholder: '7 ספרות' },
];

const personStatusFields: FieldDef[] = [
  { key: 'employmentStatus', kind: 'select', label: 'מצב תעסוקתי', required: true, options: EMPLOYMENT_STATUS_OPTIONS },
  { key: 'maritalStatus', kind: 'select', label: 'מצב משפחתי', required: true, options: MARITAL_STATUS_OPTIONS },
  {
    key: 'childrenUnder21',
    kind: 'integer',
    label: 'מספר ילדים מתחת לגיל 21',
    required: true,
    min: 0,
    max: 20,
  },
  {
    key: 'childrenAges',
    kind: 'multiselect',
    label: 'גיל הילדים',
    help: 'גיל לכל ילד מתחת לגיל 21',
    visibleWhen: { field: 'childrenUnder21', truthy: true },
    span: 2,
  },
  { key: 'onMaternityLeave', kind: 'boolean', label: 'בחופשת לידה', required: true },
  { key: 'education', kind: 'select', label: 'השכלה', required: true, options: EDUCATION_OPTIONS },
  {
    key: 'publicFigureRelation',
    kind: 'boolean',
    label: 'קרבה לאיש ציבור',
    required: true,
    help: 'קרבה משפחתית או עסקית לאיש ציבור (PEP)',
  },
  {
    key: 'publicFigureDetails',
    kind: 'text',
    label: 'פירוט הקרבה לאיש ציבור',
    visibleWhen: { field: 'publicFigureRelation', equals: true },
    requiredWhen: { field: 'publicFigureRelation', equals: true },
    span: 2,
  },
];

export const BORROWER_FIELDS: FieldDef[] = [
  ...personIdentityFields,
  ...personContactFields,
  ...personStatusFields,
];

export const GUARANTOR_FIELDS: FieldDef[] = [
  ...personIdentityFields,
  ...personContactFields,
  ...personStatusFields,
  {
    key: 'relationToBorrower',
    kind: 'select',
    label: 'קרבה ללווה',
    required: true,
    options: GUARANTOR_RELATION_OPTIONS,
  },
  {
    key: 'relatedBorrowerId',
    kind: 'select',
    label: 'הערבות ניתנת עבור',
    optionsSource: 'people',
    required: true,
  },
];

/* -------------------------------------------------------------------------- */
/* Income                                                                      */
/* -------------------------------------------------------------------------- */

const EMPLOYED_INCOME: Condition = { field: 'incomeType', in: ['salary', 'self_employed'] };

export const INCOME_FIELDS: FieldDef[] = [
  { key: 'incomeType', kind: 'select', label: 'סוג הכנסה', required: true, options: INCOME_TYPE_OPTIONS },
  { key: 'monthlyAmount', kind: 'money', label: 'סכום חודשי נטו', required: true, suffix: '₪' },
  {
    key: 'employerName',
    kind: 'text',
    label: 'שם המעסיק / העסק',
    visibleWhen: EMPLOYED_INCOME,
    requiredWhen: EMPLOYED_INCOME,
  },
  {
    key: 'position',
    kind: 'text',
    label: 'תפקיד / תחום עיסוק',
    visibleWhen: EMPLOYED_INCOME,
  },
  {
    key: 'employmentStartDate',
    kind: 'pastDate',
    label: 'תאריך תחילת העסקה',
    required: true,
    help: 'ותק של פחות משנה מחייב פירוט מקום עבודה קודם',
  },
  {
    key: 'employerPhone',
    kind: 'phone',
    label: 'טלפון במקום העבודה',
    visibleWhen: EMPLOYED_INCOME,
  },
  {
    key: 'employerCity',
    kind: 'text',
    label: 'עיר מקום התעסוקה',
    visibleWhen: EMPLOYED_INCOME,
    requiredWhen: EMPLOYED_INCOME,
  },
  {
    key: 'employerAddress',
    kind: 'text',
    label: 'כתובת מקום התעסוקה',
    visibleWhen: EMPLOYED_INCOME,
    requiredWhen: EMPLOYED_INCOME,
    span: 2,
  },
  {
    key: 'employerZipCode',
    kind: 'zip',
    label: 'מיקוד מקום התעסוקה',
    visibleWhen: EMPLOYED_INCOME,
    requiredWhen: EMPLOYED_INCOME,
  },
  {
    key: 'incomeNotes',
    kind: 'textarea',
    label: 'הערות',
    span: 3,
  },
];

/** Previous employment — collected when seniority at the current employer < 12 months. */
export const PREV_EMPLOYMENT_FIELDS: FieldDef[] = [
  { key: 'employerName', kind: 'text', label: 'שם המעסיק הקודם', required: true },
  { key: 'position', kind: 'text', label: 'תפקיד' },
  { key: 'monthlyAmount', kind: 'money', label: 'שכר חודשי נטו', required: true, suffix: '₪' },
  { key: 'employmentStartDate', kind: 'pastDate', label: 'תאריך תחילת העסקה', required: true },
  { key: 'employmentEndDate', kind: 'pastDate', label: 'תאריך סיום העסקה', required: true },
  { key: 'employerPhone', kind: 'phone', label: 'טלפון במקום העבודה' },
  { key: 'employerCity', kind: 'text', label: 'עיר מקום התעסוקה', required: true },
  { key: 'employerAddress', kind: 'text', label: 'כתובת מקום התעסוקה', required: true, span: 2 },
  { key: 'employerZipCode', kind: 'zip', label: 'מיקוד מקום התעסוקה', required: true },
];

/* -------------------------------------------------------------------------- */
/* Bank accounts                                                               */
/* -------------------------------------------------------------------------- */

export const BANK_ACCOUNT_FIELDS: FieldDef[] = [
  { key: 'bankCode', kind: 'select', label: 'בנק', required: true, optionsSource: 'banks' },
  {
    key: 'branchCode',
    kind: 'select',
    label: 'סניף',
    required: true,
    optionsSource: 'branches',
    dependsOn: 'bankCode',
    help: 'מספר הסניף ושמו',
  },
  { key: 'accountNumber', kind: 'bankAccount', label: 'מספר חשבון', required: true },
  {
    key: 'ownerIds',
    kind: 'multiselect',
    label: 'בעלי החשבון',
    required: true,
    optionsSource: 'people',
    help: 'ניתן לשייך את החשבון למספר לווים',
    span: 2,
  },
  { key: 'isPrimary', kind: 'boolean', label: 'חשבון עיקרי (משכורת)' },
];

/* -------------------------------------------------------------------------- */
/* Funding sources                                                             */
/* -------------------------------------------------------------------------- */

export const FUNDING_SOURCE_FIELDS: FieldDef[] = [
  { key: 'sourceType', kind: 'select', label: 'מקור מימון', required: true, options: FUNDING_SOURCE_OPTIONS },
  { key: 'amount', kind: 'money', label: 'סכום', required: true, suffix: '₪' },
  { key: 'expectedDate', kind: 'date', label: 'מועד זמינות צפוי' },
  { key: 'details', kind: 'text', label: 'פירוט', span: 2, placeholder: 'לדוגמה: מכירת דירה ברחוב הרצל 5' },
];

/* -------------------------------------------------------------------------- */
/* Case-level                                                                  */
/* -------------------------------------------------------------------------- */

export const CASE_FIELDS: FieldDef[] = [
  {
    key: 'loanTimeframe',
    kind: 'select',
    label: 'בעוד כמה זמן תצטרכו את ההלוואה?',
    required: true,
    options: LOAN_TIMEFRAME_OPTIONS,
  },
  {
    key: 'borrowersRelation',
    kind: 'select',
    label: 'הקשר בין הלווים',
    options: BORROWERS_RELATION_OPTIONS,
    help: 'רלוונטי כאשר יש יותר מלווה אחד',
  },
  { key: 'hasEligibility', kind: 'boolean', label: 'קיימת זכאות למשכנתא', required: true },
  {
    key: 'eligibilityAmount',
    kind: 'money',
    label: 'סכום הזכאות',
    suffix: '₪',
    visibleWhen: { field: 'hasEligibility', equals: true },
    requiredWhen: { field: 'hasEligibility', equals: true },
  },
  {
    key: 'eligibilityCertificateDate',
    kind: 'pastDate',
    label: 'תאריך תעודת הזכאות',
    visibleWhen: { field: 'hasEligibility', equals: true },
  },
  {
    key: 'totalEquity',
    kind: 'money',
    label: 'סך ההון העצמי של כל הלווים',
    required: true,
    suffix: '₪',
    help: 'סך מקורות המימון חייב להשתוות לסכום זה',
  },
  { key: 'propertyPrice', kind: 'money', label: 'מחיר הנכס', suffix: '₪' },
  { key: 'propertyCity', kind: 'text', label: 'עיר הנכס' },
  { key: 'propertyAddress', kind: 'text', label: 'כתובת הנכס', span: 2 },
  { key: 'propertyZipCode', kind: 'zip', label: 'מיקוד הנכס' },
  {
    key: 'propertyAtWorkplace',
    kind: 'boolean',
    label: 'הדירה נקנתה במקום התעסוקה',
    required: true,
    help: 'האם הנכס נרכש ביישוב שבו נמצא מקום העבודה',
  },
];

/* -------------------------------------------------------------------------- */
/* Sections                                                                    */
/* -------------------------------------------------------------------------- */

export const SECTIONS: SectionDef[] = [
  {
    id: 'borrowers',
    title: 'פרטי הלווים',
    subtitle: 'פרטים אישיים מלאים לכל אחד מהלווים',
    entityType: 'borrower',
    fields: BORROWER_FIELDS,
  },
  {
    id: 'income',
    title: 'הכנסות ותעסוקה',
    subtitle: 'כל מקורות ההכנסה של כל לווה',
    entityType: 'income',
    fields: INCOME_FIELDS,
  },
  {
    id: 'bank-accounts',
    title: 'חשבונות בנק',
    subtitle: 'בנק, סניף ומספר חשבון — עם שיוך לבעלי החשבון',
    entityType: 'bankAccount',
    fields: BANK_ACCOUNT_FIELDS,
  },
  {
    id: 'loan-details',
    title: 'פרטי ההלוואה והנכס',
    subtitle: 'לוח זמנים, זכאות, הון עצמי ופרטי הנכס',
    entityType: 'case',
    fields: CASE_FIELDS,
  },
  {
    id: 'funding',
    title: 'מקורות מימון',
    subtitle: 'פירוט ההון העצמי לפי מקור',
    entityType: 'fundingSource',
    fields: FUNDING_SOURCE_FIELDS,
  },
  {
    id: 'guarantors',
    title: 'ערבים',
    subtitle: 'לכל ערב נאספים אותם פרטים כמו ללווה, בתוספת הקרבה ללווה',
    entityType: 'guarantor',
    fields: GUARANTOR_FIELDS,
  },
];

export function fieldsFor(entityType: EntityType): FieldDef[] {
  switch (entityType) {
    case 'case':
      return CASE_FIELDS;
    case 'borrower':
      return BORROWER_FIELDS;
    case 'guarantor':
      return GUARANTOR_FIELDS;
    case 'income':
      return INCOME_FIELDS;
    case 'prevEmployment':
      return PREV_EMPLOYMENT_FIELDS;
    case 'bankAccount':
      return BANK_ACCOUNT_FIELDS;
    case 'fundingSource':
      return FUNDING_SOURCE_FIELDS;
    default:
      return [];
  }
}

export function getFieldDef(entityType: EntityType, key: string): FieldDef | undefined {
  return fieldsFor(entityType).find((f) => f.key === key);
}

/* -------------------------------------------------------------------------- */
/* Conditions & completeness                                                   */
/* -------------------------------------------------------------------------- */

function isEmptyValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function conditionHolds(condition: Condition | undefined, values: Record<string, unknown>): boolean {
  if (!condition) return true;
  const value = values[condition.field];
  if (condition.truthy) {
    if (isEmptyValue(value)) return false;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'boolean') return value;
    return true;
  }
  if (condition.in) return condition.in.some((v) => v === value);
  if (condition.equals !== undefined) return value === condition.equals;
  return true;
}

export function isFieldVisible(field: FieldDef, values: Record<string, unknown>): boolean {
  return conditionHolds(field.visibleWhen, values);
}

export function isFieldRequired(field: FieldDef, values: Record<string, unknown>): boolean {
  if (!isFieldVisible(field, values)) return false;
  if (field.required) return true;
  return field.requiredWhen ? conditionHolds(field.requiredWhen, values) : false;
}

/** Fraction of the currently-visible required fields that carry a value. */
export function completeness(
  entityType: EntityType,
  values: Record<string, unknown>,
): { filled: number; total: number; ratio: number; missing: FieldDef[] } {
  const required = fieldsFor(entityType).filter((f) => isFieldRequired(f, values));
  const missing = required.filter((f) => isEmptyValue(values[f.key]));
  const filled = required.length - missing.length;
  return {
    filled,
    total: required.length,
    ratio: required.length === 0 ? 1 : filled / required.length,
    missing,
  };
}

/** Seniority below this many months triggers the previous-employment block. */
export const PREV_EMPLOYMENT_THRESHOLD_MONTHS = 12;
