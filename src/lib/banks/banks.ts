/**
 * Israeli banking corporations, by their official Bank of Israel institution code.
 * Branch lists live in the `BankBranch` table and are loaded on demand — see
 * `scripts/sync-bank-branches.mjs` and `/api/banks/branches`.
 */

export interface BankDefinition {
  code: string;
  name: string;
  shortName: string;
  active: boolean;
}

export const BANKS: BankDefinition[] = [
  { code: '4', name: 'בנק יהב לעובדי המדינה', shortName: 'יהב', active: true },
  { code: '9', name: 'בנק הדואר', shortName: 'דואר', active: true },
  { code: '10', name: 'בנק לאומי לישראל', shortName: 'לאומי', active: true },
  { code: '11', name: 'בנק דיסקונט לישראל', shortName: 'דיסקונט', active: true },
  { code: '12', name: 'בנק הפועלים', shortName: 'הפועלים', active: true },
  { code: '13', name: 'בנק איגוד לישראל', shortName: 'איגוד', active: false },
  { code: '14', name: 'בנק אוצר החייל', shortName: 'אוצר החייל', active: false },
  { code: '17', name: 'בנק מרכנתיל דיסקונט', shortName: 'מרכנתיל', active: true },
  { code: '18', name: 'ONE ZERO הבנק הדיגיטלי', shortName: 'ONE ZERO', active: true },
  { code: '20', name: 'בנק מזרחי טפחות', shortName: 'מזרחי טפחות', active: true },
  { code: '22', name: 'Citibank N.A.', shortName: 'Citibank', active: true },
  { code: '23', name: 'HSBC Bank plc', shortName: 'HSBC', active: true },
  { code: '31', name: 'הבנק הבינלאומי הראשון לישראל', shortName: 'הבינלאומי', active: true },
  { code: '34', name: 'בנק ערבי ישראלי', shortName: 'ערבי ישראלי', active: true },
  { code: '39', name: 'בנק SBI (State Bank of India)', shortName: 'SBI', active: true },
  { code: '46', name: 'בנק מסד', shortName: 'מסד', active: true },
  { code: '52', name: 'בנק פועלי אגודת ישראל', shortName: 'פאג"י', active: true },
  { code: '54', name: 'בנק ירושלים', shortName: 'ירושלים', active: true },
  { code: '68', name: 'בנק דקסיה ישראל', shortName: 'דקסיה', active: true },
];

export const ACTIVE_BANKS = BANKS.filter((b) => b.active);

export function getBank(code: string | null | undefined): BankDefinition | undefined {
  if (!code) return undefined;
  return BANKS.find((b) => b.code === String(code));
}

export function bankLabel(code: string | null | undefined): string {
  const bank = getBank(code);
  return bank ? `${bank.name} (${bank.code})` : '—';
}
