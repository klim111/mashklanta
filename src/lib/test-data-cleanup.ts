import { createHash } from 'crypto';
import { prisma } from './db';
import { deleteClientAccount } from './account-deletion';

/**
 * ניקוי נתוני הבדיקה מאזור היועץ.
 *
 * בזמן הבנייה נפתחו בפלטפורמה לקוחות דמה, תהליכים, פניות והרשמות לצורכי
 * בדיקה. כאן היועץ רואה בדיוק מה יימחק ומה יישאר, מוריד גיבוי מלא של כל מה
 * שיימחק, ורק אז מוחק — אחרי אישור מפורש.
 *
 * הלקוח האמיתי (GHASAN GLEB) נשמר תמיד, יחד עם כל מה שקשור אליו: הכרטיס,
 * התהליכים, המשימות, הפניות ובקשות הליווי. השרת מסרב למחוק אותו גם אם נשלח
 * בבקשה, ומסרב לכל מחיקה אם הוא לא נמצא במסד — כדי ששינוי שם לא יגרום
 * למחיקה של הכל.
 */

/** השמות שמזהים את הלקוח שנשמר — כל המילים צריכות להופיע */
export const PROTECTED_CLIENT_WORDS = ['GHASAN', 'GLEB'] as const;

function normalize(value: string | null | undefined): string {
  return (value ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

/** האם השם או המייל שייכים ללקוח שנשמר */
export function isProtectedName(...values: Array<string | null | undefined>): boolean {
  return values.some((value) => {
    const text = normalize(value);
    return text.length > 0 && PROTECTED_CLIENT_WORDS.every((word) => text.includes(word));
  });
}

export interface CleanupCounts {
  plans: number;
  serviceOrders: number;
  leads: number;
  tasks: number;
  meetings: number;
  mixes: number;
  documents: number;
  messages: number;
  payments: number;
}

export interface CleanupAccount {
  userId: string;
  name: string;
  email: string | null;
  createdAt: string;
  clientCards: number;
  counts: CleanupCounts;
}

export interface CleanupLead {
  id: string;
  name: string;
  email: string;
  topic: string;
  createdAt: string;
}

export interface CleanupTask {
  id: string;
  title: string;
  stage: string;
  status: string;
  createdAt: string;
}

export interface CleanupSimpleRow {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
}

export interface CleanupPreview {
  /** מה שנשמר: הלקוח האמיתי ומה שקשור אליו */
  keep: {
    accounts: CleanupAccount[];
    leads: CleanupLead[];
    tasks: CleanupTask[];
  };
  /** חשבונות לקוח שיימחקו יחד עם כל מה שקשור אליהם */
  accounts: CleanupAccount[];
  /** פניות של אורחים שלא שייכות לשום חשבון */
  guestLeads: CleanupLead[];
  /** משימות של היועץ שלא שייכות לשום לקוח — מוצגות, ולא נבחרות מראש */
  generalTasks: CleanupTask[];
  /** הרשמות שלא הושלמו */
  signupDrafts: CleanupSimpleRow[];
  pendingRegistrations: CleanupSimpleRow[];
  /** "לקוחות שעזבו" — רשומות שנשארו ממחיקות בדיקה קודמות */
  departedClients: CleanupSimpleRow[];
  /** אפשר למחוק רק כשהלקוח שנשמר נמצא במסד */
  protectedFound: boolean;
}

export interface CleanupSelection {
  userIds: string[];
  leadIds: string[];
  taskIds: string[];
  signupDraftIds: string[];
  pendingRegistrationIds: string[];
  departedClientIds: string[];
}

const SELECTION_KEYS: Array<keyof CleanupSelection> = [
  'userIds',
  'leadIds',
  'taskIds',
  'signupDraftIds',
  'pendingRegistrationIds',
  'departedClientIds',
];

const iso = (date: Date) => date.toISOString();

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))].sort();
}

export function parseSelection(body: unknown): CleanupSelection {
  const source = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  return Object.fromEntries(SELECTION_KEYS.map((key) => [key, uniqueStrings(source[key])])) as unknown as CleanupSelection;
}

export function selectionSize(selection: CleanupSelection): number {
  return SELECTION_KEYS.reduce((sum, key) => sum + selection[key].length, 0);
}

/**
 * טביעת אצבע של הבחירה. הגיבוי מחזיר אותה, והמחיקה דורשת אותה — כך אי אפשר
 * למחוק בלי להוריד קודם גיבוי של אותה בחירה בדיוק.
 */
export function selectionToken(selection: CleanupSelection): string {
  const canonical = SELECTION_KEYS.map((key) => `${key}:${[...selection[key]].sort().join(',')}`).join('|');
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

async function countsFor(userId: string, clientIds: string[]): Promise<CleanupCounts> {
  const byClient = clientIds.length > 0 ? [{ clientId: { in: clientIds } }] : [];
  const [plans, serviceOrders, leads, tasks, meetings, mixes, documents, messages, payments] = await Promise.all([
    prisma.mortgagePlan.count({ where: { OR: [{ ownerId: userId }, ...byClient] } }),
    prisma.advisorServiceOrder.count({ where: { OR: [{ ownerId: userId }, ...byClient] } }),
    prisma.advisorLead.count({ where: { OR: [{ ownerId: userId }, ...byClient] } }),
    clientIds.length > 0 ? prisma.advisorTask.count({ where: { clientId: { in: clientIds } } }) : 0,
    clientIds.length > 0 ? prisma.advisorMeeting.count({ where: { clientId: { in: clientIds } } }) : 0,
    prisma.mortgageMix.count({ where: { OR: [{ ownerId: userId }, ...byClient] } }),
    prisma.planDocument.count({ where: { OR: [{ ownerId: userId }, ...byClient] } }),
    prisma.conversationMessage.count({ where: { clientUserId: userId } }),
    prisma.platformPayment.count({ where: { userId } }),
  ]);
  return { plans, serviceOrders, leads, tasks, meetings, mixes, documents, messages, payments };
}

/** כל מה שהיועץ יכול לנקות, ומה שנשמר */
export async function buildCleanupPreview(): Promise<CleanupPreview> {
  const users = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      createdAt: true,
      advisedAs: { select: { id: true, name: true, email: true } },
    },
  });

  const keepAccounts: CleanupAccount[] = [];
  const accounts: CleanupAccount[] = [];
  const keepUserIds = new Set<string>();
  const keepClientIds = new Set<string>();
  const keepEmails = new Set<string>();

  for (const user of users) {
    const clientIds = user.advisedAs.map((card) => card.id);
    const isKeep = isProtectedName(
      user.name,
      user.email,
      user.username,
      ...user.advisedAs.flatMap((card) => [card.name, card.email])
    );
    const row: CleanupAccount = {
      userId: user.id,
      name: user.advisedAs[0]?.name || user.name || user.email || user.username || 'ללא שם',
      email: user.email,
      createdAt: iso(user.createdAt),
      clientCards: clientIds.length,
      counts: await countsFor(user.id, clientIds),
    };
    if (isKeep) {
      keepAccounts.push(row);
      keepUserIds.add(user.id);
      clientIds.forEach((id) => keepClientIds.add(id));
      if (user.email) keepEmails.add(user.email.toLowerCase());
      user.advisedAs.forEach((card) => card.email && keepEmails.add(card.email.toLowerCase()));
    } else {
      accounts.push(row);
    }
  }

  const leadSelect = { id: true, name: true, email: true, topic: true, createdAt: true, ownerId: true, clientId: true } as const;
  const [allLeads, allTasks, signupDrafts, pendingRegistrations, departedClients] = await Promise.all([
    prisma.advisorLead.findMany({ orderBy: { createdAt: 'asc' }, select: leadSelect }),
    prisma.advisorTask.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true, stage: true, status: true, createdAt: true, clientId: true },
    }),
    prisma.signupDraft.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true, email: true, username: true, createdAt: true } }),
    prisma.pendingRegistration.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true, email: true, createdAt: true } }),
    prisma.departedClient.findMany({ orderBy: { departedAt: 'asc' }, select: { id: true, name: true, email: true, departedAt: true } }),
  ]);

  const leadIsKeep = (lead: (typeof allLeads)[number]) =>
    (lead.ownerId && keepUserIds.has(lead.ownerId)) ||
    (lead.clientId && keepClientIds.has(lead.clientId)) ||
    keepEmails.has(lead.email.toLowerCase()) ||
    isProtectedName(lead.name, lead.email);
  const toLead = (lead: (typeof allLeads)[number]): CleanupLead => ({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    topic: lead.topic,
    createdAt: iso(lead.createdAt),
  });
  const toTask = (task: (typeof allTasks)[number]): CleanupTask => ({
    id: task.id,
    title: task.title,
    stage: task.stage,
    status: task.status,
    createdAt: iso(task.createdAt),
  });
  const simpleIsKeep = (row: { name: string | null; email: string | null; username?: string | null }) =>
    (row.email && keepEmails.has(row.email.toLowerCase())) || isProtectedName(row.name, row.email, row.username);

  const keepLeads = allLeads.filter(leadIsKeep).map(toLead);

  return {
    keep: {
      accounts: keepAccounts,
      leads: keepLeads,
      tasks: allTasks.filter((task) => task.clientId && keepClientIds.has(task.clientId)).map(toTask),
    },
    accounts,
    guestLeads: allLeads.filter((lead) => !lead.ownerId && !lead.clientId && !leadIsKeep(lead)).map(toLead),
    generalTasks: allTasks.filter((task) => !task.clientId).map(toTask),
    signupDrafts: signupDrafts
      .filter((row) => !simpleIsKeep(row))
      .map((row) => ({ id: row.id, name: row.name || row.username || '', email: row.email, createdAt: iso(row.createdAt) })),
    pendingRegistrations: pendingRegistrations
      .filter((row) => !simpleIsKeep(row))
      .map((row) => ({ id: row.id, name: row.name || '', email: row.email, createdAt: iso(row.createdAt) })),
    departedClients: departedClients
      .filter((row) => !simpleIsKeep(row))
      .map((row) => ({ id: row.id, name: row.name, email: row.email, createdAt: iso(row.departedAt) })),
    protectedFound: keepAccounts.length > 0 || keepLeads.length > 0,
  };
}

export type ValidationResult =
  | { ok: true; preview: CleanupPreview }
  | { ok: false; status: number; error: string };

/** הבחירה חייבת להיות חלק ממה שמוצג למחיקה — ושום דבר מהלקוח שנשמר */
export async function validateSelection(selection: CleanupSelection): Promise<ValidationResult> {
  const preview = await buildCleanupPreview();
  if (!preview.protectedFound) {
    return { ok: false, status: 409, error: 'הלקוח GHASAN GLEB לא נמצא במסד — המחיקה נחסמה כדי לא למחוק אותו בטעות.' };
  }
  if (selectionSize(selection) === 0) return { ok: false, status: 400, error: 'לא נבחר דבר למחיקה.' };

  const allowed: Record<keyof CleanupSelection, Set<string>> = {
    userIds: new Set(preview.accounts.map((row) => row.userId)),
    leadIds: new Set(preview.guestLeads.map((row) => row.id)),
    taskIds: new Set(preview.generalTasks.map((row) => row.id)),
    signupDraftIds: new Set(preview.signupDrafts.map((row) => row.id)),
    pendingRegistrationIds: new Set(preview.pendingRegistrations.map((row) => row.id)),
    departedClientIds: new Set(preview.departedClients.map((row) => row.id)),
  };
  for (const key of SELECTION_KEYS) {
    const stray = selection[key].find((id) => !allowed[key].has(id));
    if (stray) return { ok: false, status: 409, error: 'הרשימה השתנתה מאז שנטענה. טענו אותה מחדש והורידו גיבוי חדש.' };
  }
  return { ok: true, preview };
}

const stripAccountSecrets = <T extends Record<string, unknown>>(row: T) => ({
  ...row,
  refresh_token: row.refresh_token ? '[removed]' : null,
  access_token: row.access_token ? '[removed]' : null,
  id_token: row.id_token ? '[removed]' : null,
});

/** גיבוי מלא של כל השורות שיימחקו, לפי טבלה */
export async function buildCleanupBackup(selection: CleanupSelection) {
  const userIds = selection.userIds;
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const clients = await prisma.client.findMany({ where: { userId: { in: userIds } } });
  const clientIds = clients.map((row) => row.id);
  const emails = users.map((user) => user.email).filter((email): email is string => Boolean(email));
  const byOwnerOrClient = { OR: [{ ownerId: { in: userIds } }, { clientId: { in: clientIds } }] };

  const plans = await prisma.mortgagePlan.findMany({ where: byOwnerOrClient });
  const planIds = plans.map((row) => row.id);
  const cases = await prisma.mortgageCase.findMany({ where: { clientId: { in: userIds } } });
  const caseIds = cases.map((row) => row.id);

  const tables = {
    User: users,
    Account: (await prisma.account.findMany({ where: { userId: { in: userIds } } })).map(stripAccountSecrets),
    Client: clients,
    ClientDocument: await prisma.clientDocument.findMany({ where: { clientId: { in: clientIds } } }),
    ClientAction: await prisma.clientAction.findMany({ where: { clientId: { in: clientIds } } }),
    Reminder: await prisma.reminder.findMany({ where: { clientId: { in: clientIds } } }),
    MortgagePlan: plans,
    MortgagePlanStage: await prisma.mortgagePlanStage.findMany({ where: { planId: { in: planIds } } }),
    PlanDocument: await prisma.planDocument.findMany({
      where: { OR: [{ ownerId: { in: userIds } }, { planId: { in: planIds } }, { clientId: { in: clientIds } }] },
    }),
    MortgageMix: await prisma.mortgageMix.findMany({ where: byOwnerOrClient }),
    BankRateRequest: await prisma.bankRateRequest.findMany({ where: byOwnerOrClient }),
    AdvisorServiceOrder: await prisma.advisorServiceOrder.findMany({
      where: { OR: [{ ownerId: { in: userIds } }, { planId: { in: planIds } }, { clientId: { in: clientIds } }] },
    }),
    AdvisorLead: await prisma.advisorLead.findMany({
      where: {
        OR: [
          { ownerId: { in: userIds } },
          { clientId: { in: clientIds } },
          { id: { in: selection.leadIds } },
          ...emails.map((email) => ({ email: { equals: email, mode: 'insensitive' as const } })),
        ],
      },
    }),
    AdvisorTask: await prisma.advisorTask.findMany({
      where: { OR: [{ clientId: { in: clientIds } }, { id: { in: selection.taskIds } }] },
    }),
    AdvisorNote: await prisma.advisorNote.findMany({ where: { clientId: { in: clientIds } } }),
    AdvisorMeeting: await prisma.advisorMeeting.findMany({ where: { clientId: { in: clientIds } } }),
    ClientTaskState: await prisma.clientTaskState.findMany({ where: { userId: { in: userIds } } }),
    ClientTask: await prisma.clientTask.findMany({ where: { ownerId: { in: userIds } } }),
    EquityPlan: await prisma.equityPlan.findMany({ where: { ownerId: { in: userIds } } }),
    MortgageCase: cases,
    CaseEntity: await prisma.caseEntity.findMany({ where: { caseId: { in: caseIds } } }),
    CaseField: await prisma.caseField.findMany({ where: { caseId: { in: caseIds } } }),
    FieldConflict: await prisma.fieldConflict.findMany({ where: { caseId: { in: caseIds } } }),
    ApprovalAccess: await prisma.approvalAccess.findMany({ where: { caseId: { in: caseIds } } }),
    PlatformPayment: await prisma.platformPayment.findMany({ where: { userId: { in: userIds } } }),
    PaymentCheckout: await prisma.paymentCheckout.findMany({ where: { userId: { in: userIds } } }),
    ConversationMessage: await prisma.conversationMessage.findMany({ where: { clientUserId: { in: userIds } } }),
    ConversationRecipient: await prisma.conversationRecipient.findMany({ where: { clientUserId: { in: userIds } } }),
    ConversationEmail: await prisma.conversationEmail.findMany({ where: { clientUserId: { in: userIds } } }),
    Document: await prisma.document.findMany({ where: { userId: { in: userIds } } }),
    Calculation: await prisma.calculation.findMany({ where: { userId: { in: userIds } } }),
    SignupDraft: await prisma.signupDraft.findMany({
      where: {
        OR: [
          { id: { in: selection.signupDraftIds } },
          ...emails.map((email) => ({ email: { equals: email, mode: 'insensitive' as const } })),
        ],
      },
    }),
    PendingRegistration: await prisma.pendingRegistration.findMany({
      where: {
        OR: [
          { id: { in: selection.pendingRegistrationIds } },
          ...emails.map((email) => ({ email: { equals: email, mode: 'insensitive' as const } })),
        ],
      },
    }),
    DepartedClient: await prisma.departedClient.findMany({ where: { id: { in: selection.departedClientIds } } }),
  };

  return {
    kind: 'mashkalanta-test-data-backup',
    createdAt: new Date().toISOString(),
    selection,
    token: selectionToken(selection),
    rowCounts: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])),
    tables,
  };
}

export interface CleanupResult {
  deletedAccounts: number;
  deletedLeads: number;
  deletedTasks: number;
  deletedSignupDrafts: number;
  deletedPendingRegistrations: number;
  deletedDepartedClients: number;
  failures: Array<{ userId: string; error: string }>;
}

/** המחיקה עצמה. הבחירה כבר אומתה מול validateSelection */
export async function runCleanup(selection: CleanupSelection, preview: CleanupPreview): Promise<CleanupResult> {
  const protectedLeadIds = preview.keep.leads.map((lead) => lead.id);
  const result: CleanupResult = {
    deletedAccounts: 0,
    deletedLeads: 0,
    deletedTasks: 0,
    deletedSignupDrafts: 0,
    deletedPendingRegistrations: 0,
    deletedDepartedClients: 0,
    failures: [],
  };

  for (const userId of selection.userIds) {
    const outcome = await deleteClientAccount(userId, { testCleanup: true, protectedLeadIds }).catch(
      (error: unknown) => ({ ok: false as const, status: 500, error: error instanceof Error ? error.message : String(error) })
    );
    if (outcome.ok) result.deletedAccounts += 1;
    else result.failures.push({ userId, error: outcome.error });
  }

  const keepLeadIds = new Set(protectedLeadIds);
  const leadIds = selection.leadIds.filter((id) => !keepLeadIds.has(id));
  if (leadIds.length > 0) {
    result.deletedLeads = (await prisma.advisorLead.deleteMany({ where: { id: { in: leadIds } } })).count;
  }
  if (selection.taskIds.length > 0) {
    // רק משימות כלליות, שלא שייכות לשום לקוח
    result.deletedTasks = (
      await prisma.advisorTask.deleteMany({ where: { id: { in: selection.taskIds }, clientId: null } })
    ).count;
  }
  if (selection.signupDraftIds.length > 0) {
    result.deletedSignupDrafts = (
      await prisma.signupDraft.deleteMany({ where: { id: { in: selection.signupDraftIds } } })
    ).count;
  }
  if (selection.pendingRegistrationIds.length > 0) {
    result.deletedPendingRegistrations = (
      await prisma.pendingRegistration.deleteMany({ where: { id: { in: selection.pendingRegistrationIds } } })
    ).count;
  }
  if (selection.departedClientIds.length > 0) {
    result.deletedDepartedClients = (
      await prisma.departedClient.deleteMany({ where: { id: { in: selection.departedClientIds } } })
    ).count;
  }
  return result;
}
