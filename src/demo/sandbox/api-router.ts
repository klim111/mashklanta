/**
 * השרת המדומה של מצב ההדגמה.
 *
 * בזמן הדגמה כל קריאת `fetch` ל-`/api/...` מגיעה לכאן במקום לשרת האמיתי.
 * הקריאות נענות מזיכרון הדפדפן בלבד: קריאה מחזירה את נתוני ההדגמה, וכתיבה
 * (POST/PATCH/DELETE) משנה רק את העותק שבזיכרון. שום בקשה אינה יוצאת לשרת,
 * לבסיס הנתונים, לאחסון הקבצים או לבנקים.
 *
 * נתוני שוק ציבוריים (ריביות בנק ישראל, שערי מטבע, כתובות) הם קריאה בלבד
 * ומועברים לשרת כרגיל — הם אינם נוגעים בשום לקוח.
 */

import { PLAN_STAGES, emptyPlanData, stageIndex } from '@/lib/mortgage-plan';
import type { PlanData, PlanStageId, PlanStageStatus } from '@/lib/mortgage-plan';
import type { PlanDocumentView } from '@/lib/plan-documents';
import { demoDocuments, demoPlanData } from '@/lib/demo-plan';
import type { ClientTaskView } from '@/lib/client-tasks';
import type { AdvisorMeetingView } from '@/lib/advisor-crm';
import type { SavedMix } from '@/components/mortgage-advisor/mixRecord';
import {
  DEMO_ADDRESS,
  DEMO_MORTGAGE,
  DEMO_PERSONA,
  DEMO_PLAN_ID,
  DEMO_PROPERTY_VALUE,
  demoClientTasks,
  demoMeetings,
  demoMixes,
  demoNotes,
  demoPlatformAccess,
  demoProfile,
  demoSession,
} from '../data/demo-data';

/** נתיבי API ציבוריים של נתוני שוק — קריאה בלבד, מועברים לשרת כרגיל */
export const PASSTHROUGH_PREFIXES = ['/api/boi', '/api/market', '/api/currency', '/api/addresses', '/api/banks', '/api/health'];

export function isPassthrough(pathname: string, method: string): boolean {
  if (method !== 'GET') return false;
  return PASSTHROUGH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

interface DemoPlanRecord {
  id: string;
  name: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  currentStage: PlanStageId;
  progress: number;
  propertyValue: number | null;
  propertyAddress: string | null;
  mortgageAmount: number | null;
  monthlyPayment: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stages: Array<{ stage: PlanStageId; status: PlanStageStatus; data: unknown; completedAt: string | null }>;
  data: PlanData;
}

export interface DemoApiEvents {
  /** יציאה מהחשבון בתוך ההדגמה — ההדגמה נסגרת במקום שהמשתמש האמיתי יתנתק */
  onSignOut?: () => void;
}

function nowIso() {
  return new Date().toISOString();
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function basePlan(): DemoPlanRecord {
  const now = nowIso();
  const saved = demoMixes()[0];
  return {
    id: DEMO_PLAN_ID,
    name: 'המשכנתא של משפחת לוי',
    status: 'IN_PROGRESS',
    currentStage: 'AUCTION',
    progress: 60,
    propertyValue: DEMO_PROPERTY_VALUE,
    propertyAddress: DEMO_ADDRESS,
    mortgageAmount: DEMO_MORTGAGE,
    monthlyPayment: Math.round(saved.summary.monthlyPayment),
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    stages: PLAN_STAGES.map((stage) => ({
      stage,
      status: (stageIndex(stage) < stageIndex('AUCTION') ? 'COMPLETED' : 'IN_PROGRESS') as PlanStageStatus,
      data: null,
      completedAt: stageIndex(stage) < stageIndex('AUCTION') ? now : null,
    })),
    data: demoPlanData(),
  };
}

/**
 * מצב "השרת" — נוצר מחדש בכל כניסה להדגמה, כדי שכל הדגמה תתחיל מאותה נקודה.
 */
export class DemoApiRouter {
  private plans: DemoPlanRecord[] = [basePlan()];
  private tasks: ClientTaskView[] = demoClientTasks();
  private meetings: AdvisorMeetingView[] = demoMeetings();
  private mixes: SavedMix[] = demoMixes();
  private documents: PlanDocumentView[] = demoDocuments();
  private profile = demoProfile();
  private rateRequests: Record<string, unknown>[] = [];
  private orders: Record<string, unknown>[] = [];
  private counter = 0;
  /** כל בקשה שנענתה — לבדיקות ולתצוגת "מה נחסם" */
  readonly log: Array<{ method: string; path: string }> = [];

  constructor(private readonly events: DemoApiEvents = {}) {}

  private nextId(prefix: string) {
    this.counter += 1;
    return `${prefix}-${this.counter}`;
  }

  private async body(init?: RequestInit, input?: RequestInfo | URL): Promise<Record<string, unknown>> {
    try {
      if (init?.body && typeof init.body === 'string') return JSON.parse(init.body);
      if (input instanceof Request) return await input.clone().json();
    } catch {
      /* גוף ריק או לא JSON */
    }
    return {};
  }

  private plan(id: string) {
    return this.plans.find((plan) => plan.id === id) ?? null;
  }

  async handle(url: URL, init?: RequestInit, input?: RequestInfo | URL): Promise<Response> {
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const path = url.pathname;
    this.log.push({ method, path });
    const parts = path.split('/').filter(Boolean); // ['api', ...]

    // ─── התחברות ───
    if (parts[1] === 'auth') {
      if (parts[2] === 'session') return json(demoSession());
      if (parts[2] === 'csrf') return json({ csrfToken: 'demo-csrf' });
      if (parts[2] === 'signout') {
        this.events.onSignOut?.();
        return json({ url: '/' });
      }
      return json({});
    }

    // ─── פרופיל וגישה ───
    if (path === '/api/profile') {
      if (method === 'PATCH') {
        const patch = await this.body(init, input);
        this.profile = { ...this.profile, ...(patch as Partial<typeof this.profile>), name: DEMO_PERSONA.name };
      }
      return json(this.profile);
    }
    if (path === '/api/platform/access') return json(demoPlatformAccess());
    if (path === '/api/platform/checkout') return json({ ok: true, demo: true });
    if (path === '/api/advisor-leads') return json({ ok: true, demo: true });

    // ─── תהליכי משכנתא ───
    if (parts[1] === 'plans') {
      if (parts.length === 2) {
        if (method === 'POST') {
          const body = await this.body(init, input);
          const created: DemoPlanRecord = {
            ...basePlan(),
            id: this.nextId('demo-plan'),
            name: typeof body.name === 'string' && body.name ? body.name : 'תהליך חדש',
            currentStage: 'ANALYSIS',
            progress: 0,
            propertyValue: null,
            propertyAddress: null,
            mortgageAmount: null,
            monthlyPayment: null,
            stages: PLAN_STAGES.map((stage) => ({ stage, status: 'IN_PROGRESS' as PlanStageStatus, data: null, completedAt: null })),
            data: emptyPlanData(),
          };
          this.plans = [created, ...this.plans];
          return json(created, 201);
        }
        return json(this.plans);
      }
      const plan = this.plan(parts[2]);
      if (!plan) return json({ error: 'Not found' }, 404);
      if (parts.length === 3) {
        if (method === 'DELETE') {
          this.plans = this.plans.filter((item) => item.id !== plan.id);
          return json({ ok: true });
        }
        if (method === 'PATCH') {
          const body = await this.body(init, input);
          if (typeof body.name === 'string') plan.name = body.name;
          if (typeof body.currentStage === 'string' && (PLAN_STAGES as readonly string[]).includes(body.currentStage)) {
            plan.currentStage = body.currentStage as PlanStageId;
          }
          const deal = body.deal as Record<string, unknown> | undefined;
          if (deal) {
            if (typeof deal.propertyAddress === 'string') plan.propertyAddress = deal.propertyAddress;
            if (typeof deal.propertyValue === 'number') plan.propertyValue = deal.propertyValue;
            if (typeof deal.mortgageAmount === 'number') plan.mortgageAmount = deal.mortgageAmount;
          }
          plan.updatedAt = nowIso();
        }
        return json(plan);
      }
      if (parts[3] === 'stages' && parts[4]) {
        const stage = parts[4] as PlanStageId;
        const body = await this.body(init, input);
        if (body.data !== undefined) {
          (plan.data as Record<PlanStageId, unknown>)[stage] = body.data;
        }
        if (body.complete) {
          plan.stages = plan.stages.map((item) =>
            item.stage === stage ? { ...item, status: 'COMPLETED', completedAt: nowIso() } : item
          );
          plan.currentStage = PLAN_STAGES[stageIndex(stage) + 1] ?? stage;
        }
        plan.updatedAt = nowIso();
        return json(plan);
      }
      if (parts[3] === 'advisor-orders') {
        if (method === 'POST') {
          const body = await this.body(init, input);
          const order = {
            id: this.nextId('demo-order'),
            planId: plan.id,
            stages: Array.isArray(body.stages) ? body.stages : [],
            amount: 0,
            status: 'REQUESTED',
            createdAt: nowIso(),
            paidAt: null,
            termsAcceptedAt: null,
            workStartedAt: null,
            advisorName: null,
          };
          this.orders.push(order);
          return json(order, 201);
        }
        return json(this.orders.filter((order) => order.planId === plan.id));
      }
      if (parts[3] === 'documents') {
        if (parts[4] && method === 'DELETE') {
          this.documents = this.documents.filter((doc) => doc.id !== parts[4]);
          return json({ ok: true });
        }
        if (method === 'POST') {
          const body = await this.body(init, input);
          const record: PlanDocumentView = {
            id: this.nextId('demo-doc'),
            planId: plan.id,
            key: String(body.key ?? 'free'),
            name: String(body.name ?? 'מסמך'),
            fileName: String(body.fileName ?? 'file.pdf'),
            contentType: String(body.contentType ?? 'application/pdf'),
            size: Number(body.size ?? 0),
            uploadedAt: nowIso(),
          };
          this.documents = [record, ...this.documents];
          return json(record, 201);
        }
        return json(this.documents.filter((doc) => doc.planId === plan.id));
      }
      return json({});
    }

    // ─── משימות הלקוח ───
    if (parts[1] === 'client-tasks') {
      if (parts[2]) {
        const task = this.tasks.find((item) => item.id === parts[2]);
        if (!task) return json({ error: 'Not found' }, 404);
        if (method === 'DELETE') {
          this.tasks = this.tasks.filter((item) => item.id !== task.id);
          return json({ ok: true });
        }
        if (method === 'PATCH') {
          const body = await this.body(init, input);
          Object.assign(task, body);
          if (body.status === 'DONE') task.completedAt = nowIso();
          if (body.status === 'OPEN') task.completedAt = null;
        }
        return json(task);
      }
      if (method === 'POST') {
        const body = await this.body(init, input);
        const task: ClientTaskView = {
          id: this.nextId('demo-task'),
          planId: (body.planId as string | null) ?? null,
          stage: (body.stage as PlanStageId | null) ?? null,
          kind: (body.kind as ClientTaskView['kind']) ?? 'TASK',
          templateKey: (body.templateKey as string | null) ?? null,
          title: String(body.title ?? 'משימה'),
          details: (body.details as string | null) ?? null,
          bank: (body.bank as string | null) ?? null,
          dueAt: (body.dueAt as string | null) ?? null,
          status: body.documentId ? 'DONE' : 'OPEN',
          documentId: (body.documentId as string | null) ?? null,
          completedAt: body.documentId ? nowIso() : null,
          createdAt: nowIso(),
        } as ClientTaskView;
        this.tasks = [task, ...this.tasks];
        return json(task, 201);
      }
      const planId = url.searchParams.get('planId');
      const stage = url.searchParams.get('stage');
      return json(
        this.tasks.filter(
          (task) => (!planId || task.planId === planId) && (!stage || task.stage === stage)
        )
      );
    }

    // ─── פגישות והערות ───
    if (parts[1] === 'meetings') {
      if (parts[2]) {
        const meeting = this.meetings.find((item) => item.id === parts[2]);
        if (!meeting) return json({ error: 'Not found' }, 404);
        if (method === 'DELETE') {
          this.meetings = this.meetings.filter((item) => item.id !== meeting.id);
          return json({ ok: true });
        }
        if (method === 'PATCH') {
          const body = await this.body(init, input);
          if (typeof body.accepted === 'boolean') {
            meeting.status = body.accepted ? 'CONFIRMED' : 'DECLINED';
            meeting.respondedAt = nowIso();
          }
          if (typeof body.status === 'string') meeting.status = body.status as AdvisorMeetingView['status'];
        }
        return json(meeting);
      }
      if (method === 'POST') {
        const body = await this.body(init, input);
        const meeting: AdvisorMeetingView = {
          id: this.nextId('demo-meeting'),
          clientId: DEMO_PERSONA.id,
          clientName: DEMO_PERSONA.name,
          clientEmail: DEMO_PERSONA.email,
          advisorName: DEMO_PERSONA.advisorName,
          stage: (body.stage as PlanStageId | null) ?? null,
          title: String(body.title ?? 'פגישה'),
          startsAt: String(body.startsAt ?? nowIso()),
          durationMinutes: Number(body.durationMinutes ?? 45),
          location: (body.location as string | null) ?? null,
          note: (body.note as string | null) ?? null,
          status: 'PROPOSED',
          respondedAt: null,
        };
        this.meetings = [meeting, ...this.meetings];
        return json(meeting, 201);
      }
      return json(this.meetings);
    }
    if (path === '/api/advisor/notes') return json(demoNotes());

    // ─── תמהילים ובקשות ריבית ───
    if (parts[1] === 'mixes') {
      if (parts[2]) {
        const index = this.mixes.findIndex((item) => item.recordId === parts[2]);
        if (index < 0) return json({ error: 'Not found' }, 404);
        if (method === 'DELETE') {
          this.mixes.splice(index, 1);
          return json({ ok: true });
        }
        if (method === 'PATCH' || method === 'PUT') {
          const body = await this.body(init, input);
          const current = this.mixes[index];
          const mix = (body.mix as SavedMix['mix'] | undefined) ?? current.mix;
          this.mixes[index] = {
            ...current,
            ...(body as Partial<SavedMix>),
            mix: typeof body.name === 'string' ? { ...mix, name: body.name } : mix,
            savedAt: nowIso(),
          };
        }
        return json(this.mixes[index]);
      }
      if (method === 'POST') {
        const body = await this.body(init, input);
        const mix = body.mix as SavedMix['mix'];
        const saved: SavedMix = {
          recordId: this.nextId('demo-mix-record'),
          mix,
          summary: (body.summary as SavedMix['summary']) ?? this.mixes[0]?.summary,
          savedAt: nowIso(),
          planId: (body.planId as string | null) ?? null,
          planAddress: body.planId ? DEMO_ADDRESS : null,
          categoryId: (body.categoryId as string | null) ?? null,
          sharedWithClient: true,
        };
        this.mixes = [saved, ...this.mixes];
        return json(saved, 201);
      }
      return json(this.mixes);
    }
    if (parts[1] === 'rate-requests') {
      if (method === 'POST') {
        const body = await this.body(init, input);
        const record = { ...body, recordId: this.nextId('demo-rate-request'), savedAt: nowIso() };
        this.rateRequests = [record, ...this.rateRequests];
        return json(record, 201);
      }
      if (parts[2] && method === 'DELETE') {
        this.rateRequests = this.rateRequests.filter((item) => item.recordId !== parts[2]);
        return json({ ok: true });
      }
      return json(this.rateRequests);
    }

    // ─── כל השאר: מוצלח וריק, בלי לגעת בשום דבר אמיתי ───
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[demo] ${method} ${path} נענה מהשרת המדומה (ריק)`);
    }
    return json(method === 'GET' ? [] : { ok: true, demo: true });
  }
}
