'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  AdvisorMeetingView,
  AdvisorNoteView,
  AdvisorRateDefaultView,
  AdvisorTaskStatus,
  AdvisorTaskView,
  MixCategoryView,
  NoteVisibility,
  PlanStageId,
} from '@/lib/advisor-crm';

/**
 * הנתונים של לוח הבקרה, מבסיס הנתונים.
 *
 * כל מסך נטען מכאן ולא מזיכרון מקומי, כדי שהמשימות, הפגישות וההערות יהיו אותם
 * נתונים בכל מכשיר ובכל מסך — אצל היועץ ואצל הלקוח.
 */

async function readJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { cache: 'no-store', ...init });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as T;
}

async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  return readJson<T>(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

// ───────────────────────────── תמונת המצב של הלוח ─────────────────────────────

export interface AdvisorOverviewView {
  clients: number;
  activeClients: number;
  mixes: number;
  openDocuments: number;
  openTasks: number;
  overdueTasks: number;
  awaitingConfirmation: number;
  todayTasks: AdvisorTaskView[];
  overdue: AdvisorTaskView[];
  upcomingMeetings: AdvisorMeetingView[];
}

const emptyOverview: AdvisorOverviewView = {
  clients: 0,
  activeClients: 0,
  mixes: 0,
  openDocuments: 0,
  openTasks: 0,
  overdueTasks: 0,
  awaitingConfirmation: 0,
  todayTasks: [],
  overdue: [],
  upcomingMeetings: [],
};

export function useAdvisorOverview(enabled = true) {
  const [overview, setOverview] = useState<AdvisorOverviewView>(emptyOverview);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setReady(true);
      return;
    }
    try {
      setOverview(await readJson<AdvisorOverviewView>('/api/advisor/overview'));
    } catch {
      setOverview(emptyOverview);
    } finally {
      setReady(true);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { overview, ready, refresh };
}

// ───────────────────────────────── משימות ─────────────────────────────────

export interface TaskFilter {
  clientId?: string;
  stage?: PlanStageId;
  includeClosed?: boolean;
}

export interface NewTaskInput {
  clientId: string;
  stage: PlanStageId;
  title: string;
  details?: string;
  /** ISO של תאריך ושעה, או null כשאין מועד */
  dueDate?: string | null;
}

export function useAdvisorTasks(filter: TaskFilter = {}, enabled = true) {
  const { clientId, stage, includeClosed } = filter;
  const [tasks, setTasks] = useState<AdvisorTaskView[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setReady(true);
      return;
    }
    const params = new URLSearchParams();
    if (clientId) params.set('clientId', clientId);
    if (stage) params.set('stage', stage);
    if (includeClosed) params.set('all', '1');
    const query = params.toString();

    try {
      setTasks(await readJson<AdvisorTaskView[]>(`/api/advisor/tasks${query ? `?${query}` : ''}`));
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את המשימות');
    } finally {
      setReady(true);
    }
  }, [enabled, clientId, stage, includeClosed]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: NewTaskInput): Promise<string | null> => {
      try {
        await send<AdvisorTaskView>('/api/advisor/tasks', 'POST', input);
        await refresh();
        return null;
      } catch {
        return 'המשימה לא נוצרה';
      }
    },
    [refresh]
  );

  const update = useCallback(
    async (
      taskId: string,
      patch: Partial<{
        title: string;
        details: string | null;
        dueDate: string | null;
        stage: PlanStageId;
        status: AdvisorTaskStatus;
      }>
    ) => {
      // התצוגה מתעדכנת מיד כדי שסימון "בוצע" יגיב בלי המתנה לשרת
      setTasks((items) =>
        items.map((task) => (task.id === taskId ? { ...task, ...patch } : task))
      );
      try {
        await send<AdvisorTaskView>(`/api/advisor/tasks/${taskId}`, 'PATCH', patch);
      } finally {
        await refresh();
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (taskId: string) => {
      setTasks((items) => items.filter((task) => task.id !== taskId));
      try {
        await fetch(`/api/advisor/tasks/${taskId}`, { method: 'DELETE' });
      } finally {
        await refresh();
      }
    },
    [refresh]
  );

  return { tasks, ready, error, refresh, create, update, remove };
}

// ───────────────────────────────── פגישות ─────────────────────────────────

export interface NewMeetingInput {
  clientId: string;
  /** ISO של תאריך ושעה */
  startsAt: string;
  title?: string;
  durationMinutes?: number;
  location?: string;
  note?: string;
  stage?: PlanStageId | null;
}

/**
 * הפגישות של המשתמש המחובר. אותו hook משרת את שני הצדדים: היועץ מקבל את
 * הפגישות שקבע, והלקוח את אלה שהוצעו לו.
 */
export function useMeetings(options: { clientId?: string; enabled?: boolean } = {}) {
  const { clientId, enabled = true } = options;
  const [meetings, setMeetings] = useState<AdvisorMeetingView[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setReady(true);
      return;
    }
    try {
      const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
      setMeetings(await readJson<AdvisorMeetingView[]>(`/api/meetings${query}`));
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את הפגישות');
    } finally {
      setReady(true);
    }
  }, [enabled, clientId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const propose = useCallback(
    async (input: NewMeetingInput): Promise<string | null> => {
      try {
        await send<AdvisorMeetingView>('/api/meetings', 'POST', input);
        await refresh();
        return null;
      } catch {
        return 'הצעת הפגישה לא נשלחה';
      }
    },
    [refresh]
  );

  /** תשובת הלקוח להצעת מועד */
  const respond = useCallback(
    async (meetingId: string, accepted: boolean) => {
      try {
        await send<AdvisorMeetingView>(`/api/meetings/${meetingId}`, 'PATCH', { accepted });
      } finally {
        await refresh();
      }
    },
    [refresh]
  );

  const cancel = useCallback(
    async (meetingId: string) => {
      try {
        await send<AdvisorMeetingView>(`/api/meetings/${meetingId}`, 'PATCH', {
          status: 'CANCELLED',
        });
      } finally {
        await refresh();
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (meetingId: string) => {
      try {
        await fetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });
      } finally {
        await refresh();
      }
    },
    [refresh]
  );

  return { meetings, ready, error, refresh, propose, respond, cancel, remove };
}

// ───────────────────────────────── הערות ─────────────────────────────────

/**
 * ההערות בשלבי הלקוח. אצל היועץ — כולל האישיות; אצל הלקוח (בלי clientId) —
 * רק ההערות שנשלחו אליו.
 */
export function useAdvisorNotes(options: { clientId?: string; enabled?: boolean } = {}) {
  const { clientId, enabled = true } = options;
  const [notes, setNotes] = useState<AdvisorNoteView[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setReady(true);
      return;
    }
    try {
      const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
      setNotes(await readJson<AdvisorNoteView[]>(`/api/advisor/notes${query}`));
    } catch {
      setNotes([]);
    } finally {
      setReady(true);
    }
  }, [enabled, clientId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: { stage: PlanStageId; body: string; visibility: NoteVisibility }) => {
      if (!clientId) return 'חסר לקוח להערה';
      try {
        await send<AdvisorNoteView>('/api/advisor/notes', 'POST', { clientId, ...input });
        await refresh();
        return null;
      } catch {
        return 'ההערה לא נשמרה';
      }
    },
    [clientId, refresh]
  );

  const setVisibility = useCallback(
    async (noteId: string, visibility: NoteVisibility) => {
      setNotes((items) =>
        items.map((note) => (note.id === noteId ? { ...note, visibility } : note))
      );
      try {
        await send<AdvisorNoteView>(`/api/advisor/notes/${noteId}`, 'PATCH', { visibility });
      } finally {
        await refresh();
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (noteId: string) => {
      setNotes((items) => items.filter((note) => note.id !== noteId));
      try {
        await fetch(`/api/advisor/notes/${noteId}`, { method: 'DELETE' });
      } finally {
        await refresh();
      }
    },
    [refresh]
  );

  return { notes, ready, refresh, create, setVisibility, remove };
}

// ───────────────────────── הגדרות: ריביות וקטגוריות ─────────────────────────

export interface AdvisorSettingsPayload {
  rates: AdvisorRateDefaultView[];
  categories: MixCategoryView[];
}

export function useAdvisorSettings(enabled = true) {
  const [settings, setSettings] = useState<AdvisorSettingsPayload>({ rates: [], categories: [] });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setReady(true);
      return;
    }
    try {
      setSettings(await readJson<AdvisorSettingsPayload>('/api/advisor/settings'));
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את ההגדרות');
    } finally {
      setReady(true);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** שמירת ריביות ברירת המחדל. ריבית null מוחקת את הערך השמור */
  const saveRates = useCallback(
    async (
      rates: Array<{
        bank: string;
        amortizationType: string;
        trackType: string;
        rate: number | null;
      }>
    ): Promise<string | null> => {
      try {
        setSettings(await send<AdvisorSettingsPayload>('/api/advisor/settings', 'PUT', { rates }));
        return null;
      } catch {
        return 'הריביות לא נשמרו';
      }
    },
    []
  );

  const addCategory = useCallback(
    async (name: string, color?: string): Promise<string | null> => {
      try {
        await send<MixCategoryView>('/api/advisor/categories', 'POST', { name, color });
        await refresh();
        return null;
      } catch {
        return 'הקטגוריה לא נוצרה';
      }
    },
    [refresh]
  );

  const removeCategory = useCallback(
    async (categoryId: string) => {
      try {
        await fetch(`/api/advisor/categories/${categoryId}`, { method: 'DELETE' });
      } finally {
        await refresh();
      }
    },
    [refresh]
  );

  return { settings, ready, error, refresh, saveRates, addCategory, removeCategory };
}

/** רק הקטגוריות — לשימוש בדיאלוג שמירת התמהיל, בלי לטעון את כל ההגדרות */
export function useMixCategories(enabled = true) {
  const [categories, setCategories] = useState<MixCategoryView[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setReady(true);
      return;
    }
    try {
      setCategories(await readJson<MixCategoryView[]>('/api/advisor/categories'));
    } catch {
      setCategories([]);
    } finally {
      setReady(true);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (name: string): Promise<MixCategoryView | null> => {
      try {
        const created = await send<MixCategoryView>('/api/advisor/categories', 'POST', { name });
        await refresh();
        return created;
      } catch {
        return null;
      }
    },
    [refresh]
  );

  return { categories, ready, refresh, add };
}

// ─────────────────── חמשת השלבים של הלקוח, בעיני היועץ ───────────────────

export interface ClientPlanSummaryView {
  id: string;
  name: string;
  propertyAddress: string | null;
  propertyValue: number | null;
  mortgageAmount: number | null;
  currentStage: PlanStageId;
  progress: number;
  updatedAt: string;
}

export interface ClientStageBoardView {
  stage: PlanStageId;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  completedAt: string | null;
  completedByClient: boolean;
  tasks: AdvisorTaskView[];
  notes: AdvisorNoteView[];
  meetings: AdvisorMeetingView[];
}

export interface ClientProcessPayload {
  planId: string | null;
  planName: string | null;
  currentStage: PlanStageId;
  progress: number;
  plans: ClientPlanSummaryView[];
  stages: ClientStageBoardView[];
}

export function useClientProcess(clientId: string, planId?: string) {
  const [process, setProcess] = useState<ClientProcessPayload | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!clientId) return;
    try {
      const query = planId ? `?planId=${encodeURIComponent(planId)}` : '';
      setProcess(await readJson<ClientProcessPayload>(`/api/clients/${clientId}/process${query}`));
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את שלבי התהליך');
    } finally {
      setReady(true);
    }
  }, [clientId, planId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { process, ready, error, refresh };
}
