/**
 * הגשה לבנק דרך יועץ משכלנתא, בשלב האישור העקרוני.
 *
 * ליד כל בנק הלקוח בוחר בין "הגשה עצמית" ל"הגשה באמצעות יועץ משכלנתא". בבחירה
 * ביועץ נפתחת אצל היועץ משימה לאותו בנק, ופגישה אחת עם הלקוח להשלמת הפרטים
 * להגשה, שהיועץ רק קובע לה מועד. מכאן הבנקאי המטפל והאישור העקרוני מוזנים בצד
 * היועץ, והלקוח רואה אותם בכרטיס של הבנק.
 *
 * הקובץ טהור — בלי React ובלי Prisma.
 */

import type { BankPreApproval, PreApprovalData, SubmissionChannel } from './mortgage-plan';

/** שם הפגישה עם הלקוח. לפיו מזהים אותה אצל שני הצדדים */
export const HANDOFF_MEETING_TITLE = 'פגישה להשלמת פרטים להגשה לבנקים';

/** המשימה של היועץ לקבוע את הפגישה — אחת ללקוח, כל עוד היא פתוחה */
export const HANDOFF_MEETING_TASK_TITLE = 'קבעו מועד לפגישה להשלמת פרטים להגשה לבנקים';

/** המשימה של היועץ לבנק אחד שהלקוח העביר אליו */
export function handoffTaskTitle(bank: string): string {
  return `הגשה לאישור עקרוני ב${bank} — הלקוח העביר אליכם`;
}

export function handoffTaskDetails(bank: string, place: string): string {
  return `נוצרה משלב "אישור עקרוני" בתהליך "${place}". הלקוח ביקש שיועץ משכלנתא ינהל מולו את ההגשה ל${bank}. קבעו פגישה להשלמת הפרטים, ואחרי ההגשה הזינו בשלב האישור העקרוני של הלקוח את הבנקאי המטפל ואת תאריך האישור העקרוני.`;
}

/**
 * אופן ההגשה לבנק. בקשה שהוגשה או אושרה לפני שהייתה בחירה נחשבת הגשה עצמית —
 * כך לקוח שכבר עבד במסך לא מתבקש לבחור מחדש.
 */
export function submissionChannelOf(
  row: BankPreApproval | null,
  hasDocument = false
): SubmissionChannel | null {
  if (row?.channel) return row.channel;
  if (hasDocument || row?.submittedAt || row?.approved) return 'SELF';
  return null;
}

/** הבנק המוביל והדגל `approved` שמעליו, כשיש אישור שעוד לא נרשם בהם */
export function withLeadingApproval(data: PreApprovalData): PreApprovalData {
  if (data.approved && data.bank) return data;
  const leading = data.bankApprovals.find((row) => row.approved) ?? null;
  if (!leading) return data;
  return {
    ...data,
    bank: leading.bank,
    approved: true,
    submittedAt: leading.submittedAt ?? data.submittedAt,
    approvedAmount: leading.approvedAmount ?? data.approvedAmount,
  };
}

/**
 * שמירת השלב מהמסך של הלקוח: בבנק שהועבר ליועץ, מה שהיועץ הזין (הבנקאי
 * והאישור) נשאר כפי שהוא בשרת. המסך של הלקוח עלול להחזיק עותק ישן מלפני
 * שהיועץ עדכן, והשמירה שלו לא אמורה למחוק את העדכון.
 */
export function keepAdvisorRows(saved: PreApprovalData, incoming: PreApprovalData): PreApprovalData {
  const handed = saved.bankApprovals.filter((row) => row.channel === 'ADVISOR');
  if (handed.length === 0) return incoming;

  const advisorOwned = (row: BankPreApproval) => ({
    channel: 'ADVISOR' as const,
    handedAt: row.handedAt ?? null,
    submittedAt: row.submittedAt,
    approved: row.approved,
    approvedAt: row.approvedAt,
    approvedAmount: row.approvedAmount,
    bankerName: row.bankerName ?? '',
    bankerEmail: row.bankerEmail ?? '',
  });

  const bankApprovals = incoming.bankApprovals.map((row) => {
    const kept = handed.find((item) => item.bank === row.bank);
    return kept ? { ...row, ...advisorOwned(kept) } : row;
  });
  for (const row of handed) {
    if (!bankApprovals.some((item) => item.bank === row.bank)) bankApprovals.push(row);
  }
  return withLeadingApproval({ ...incoming, bankApprovals });
}

/** שורה ריקה לבנק, לפני שנרשם בו משהו */
export function emptyBankRow(bank: string): BankPreApproval {
  return {
    bank,
    submittedAt: null,
    approved: false,
    approvedAt: null,
    approvedAmount: null,
    documentName: null,
    note: '',
    bankerName: '',
    bankerEmail: '',
  };
}
