'use client';

/**
 * Holds the whole principal-approval case in memory and keeps it in sync with
 * the database: every edit is applied optimistically, validated locally, and
 * written to the server with a short debounce so a page refresh never loses
 * anything the user typed.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { EntityType } from '@/lib/principal-approval/schema';
import { getFieldDef, isFieldRequired } from '@/lib/principal-approval/schema';
import { validateValue } from '@/lib/principal-approval/validation';
import type { CaseDTO, ConflictDTO, EntityDTO, FieldMeta } from '@/lib/principal-approval/types';
import { canEditField } from '@/lib/principal-approval/access';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

export const CASE_ENTITY_ID = 'case';
const AUTOSAVE_DEBOUNCE_MS = 500;

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export function fieldPath(entityType: EntityType, entityId: string, fieldKey: string): string {
  return `${entityType}:${entityId}:${fieldKey}`;
}

interface CaseContextValue {
  data: CaseDTO | null;
  loading: boolean;
  loadError: string | null;
  /** Values of one entity, with local optimistic edits applied. */
  valuesOf: (entityType: EntityType, entityId: string) => Record<string, unknown>;
  metaOf: (entityType: EntityType, entityId: string, fieldKey: string) => FieldMeta | undefined;
  errorOf: (entityType: EntityType, entityId: string, fieldKey: string) => string | undefined;
  saveStateOf: (entityType: EntityType, entityId: string, fieldKey: string) => SaveState;
  canEdit: (entityType: EntityType, entityId: string, fieldKey: string) => boolean;
  setField: (entityType: EntityType, entityId: string, fieldKey: string, value: unknown) => void;
  entities: (type: EntityType, parentId?: string | null) => EntityDTO[];
  addEntity: (type: EntityType, parentId?: string | null) => Promise<EntityDTO | null>;
  removeEntity: (entityId: string) => Promise<void>;
  openConflicts: ConflictDTO[];
  resolveConflict: (conflictId: string, choice: 'profile' | 'case') => Promise<void>;
  setAdvisorPermission: (advisorId: string, canEditFlag: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  /** Number of fields still saving — powers the header "saving…" indicator. */
  pendingCount: number;
  lastSavedAt: Date | null;
  actionError: string | null;
  dismissActionError: () => void;
  /**
   * אצל היועץ, בתוך שלב של לקוח: מה שהוא ממלא נשמר כטיוטה שלו ועובר ללקוח רק
   * ב"שדר". null כשהתיק עובד בשמירה רגילה תוך כדי הקלדה.
   */
  held: HeldState | null;
}

/** שדה שהיועץ מילא ועוד לא שידר */
export interface HeldField {
  entityType: EntityType;
  entityId: string;
  fieldKey: string;
  value: unknown;
  /** מה היה בתיק כשהיועץ התחיל לערוך את השדה */
  base: unknown;
}

export interface HeldState {
  fields: HeldField[];
  /** שדות שהלקוח שינה אחרי שהיועץ התחיל לערוך אותם */
  clientChanged: HeldField[];
  busy: boolean;
  error: string | null;
  broadcast: () => Promise<void>;
  discard: () => Promise<void>;
}

const CaseContext = createContext<CaseContextValue | null>(null);

export function useCase(): CaseContextValue {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error('useCase must be used inside <CaseProvider>');
  return ctx;
}

export function CaseProvider({
  children,
  clientRecordId,
  holdForBroadcast = false,
}: {
  children: React.ReactNode;
  /** `Client.id` — set on the advisor side to open that client's file. */
  clientRecordId?: string;
  /** היועץ בתוך שלב של לקוח: מה שממולא מחכה ל"שדר" (ראו `held`) */
  holdForBroadcast?: boolean;
}) {
  const [data, setData] = useState<CaseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const latestValue = useRef<Record<string, unknown>>({});
  const held = useRef<Record<string, HeldField>>({});
  const [heldVersion, setHeldVersion] = useState(0);
  const [heldBusy, setHeldBusy] = useState(false);
  const [heldError, setHeldError] = useState<string | null>(null);
  const heldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldValues = () =>
    Object.fromEntries(Object.entries(held.current).map(([path, field]) => [path, field.value]));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const url = clientRecordId
        ? `/api/principal-approval/case?clientRecordId=${encodeURIComponent(clientRecordId)}`
        : '/api/principal-approval/case';
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'טעינת התיק נכשלה');
      setData(json as CaseDTO);
      // הטיוטה של היועץ נשארת מוצגת גם אחרי טעינה מחדש
      setLocalValues(holdForBroadcast ? heldValues() : {});
    } catch (err: any) {
      setLoadError(err?.message ?? 'טעינת התיק נכשלה');
    } finally {
      setLoading(false);
    }
  }, [clientRecordId, holdForBroadcast]);

  useEffect(() => {
    void load();
  }, [load]);

  // הטיוטה ששמורה בשרת נטענת פעם אחת, כשהתיק נפתח
  const caseId = data?.id ?? null;
  useEffect(() => {
    if (!holdForBroadcast || !caseId) return;
    let cancelled = false;
    void fetch(`/api/principal-approval/case/${caseId}/advisor-draft`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (cancelled || !body?.values) return;
        held.current = body.values as Record<string, HeldField>;
        Object.entries(held.current).forEach(([path, field]) => {
          latestValue.current[path] = field.value;
        });
        setLocalValues((prev) => ({ ...heldValues(), ...prev }));
        setHeldVersion((version) => version + 1);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [holdForBroadcast, caseId]);

  const persistHeld = useCallback(async () => {
    if (heldTimer.current) {
      clearTimeout(heldTimer.current);
      heldTimer.current = null;
    }
    if (!caseId) return;
    await fetch(`/api/principal-approval/case/${caseId}/advisor-draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: held.current }),
    }).catch(() => undefined);
  }, [caseId]);

  /**
   * מה שהצד השני מילא בתיק מופיע בלי לרענן את העמוד. כל עוד יש כאן שדה
   * שעוד לא נשמר, הטעינה מחכה, כדי לא לדרוס את מה שמוקלד עכשיו.
   */
  const localValuesRef = useRef(localValues);
  localValuesRef.current = localValues;
  const reload = useCallback(async () => {
    // בטיוטה של היועץ הערכים המקומיים הם הטיוטה עצמה, והם נשארים מעל מה שנטען
    const editing = () =>
      Object.keys(timers.current).length > 0 ||
      (!holdForBroadcast && Object.keys(localValuesRef.current).length > 0);
    if (editing()) return;
    try {
      const url = clientRecordId
        ? `/api/principal-approval/case?clientRecordId=${encodeURIComponent(clientRecordId)}`
        : '/api/principal-approval/case';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok || editing()) return;
      const json = (await res.json()) as CaseDTO;
      if (editing()) return;
      setData((current) => (JSON.stringify(current) === JSON.stringify(json) ? current : json));
    } catch {
      // הבדיקה הבאה תשלים
    }
  }, [clientRecordId, holdForBroadcast]);
  useLiveRefresh(() => void reload());

  // Flush anything still queued when the tab is closed or hidden.
  useEffect(() => {
    const flush = () => {
      for (const key of Object.keys(timers.current)) {
        clearTimeout(timers.current[key]);
        delete timers.current[key];
      }
    };
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, []);

  const serverValues = useCallback(
    (entityType: EntityType, entityId: string): Record<string, unknown> => {
      if (!data) return {};
      if (entityId === CASE_ENTITY_ID) return data.caseValues;
      const entity = (data.entities[entityType] ?? []).find((e) => e.id === entityId);
      return entity?.values ?? {};
    },
    [data],
  );

  const valuesOf = useCallback(
    (entityType: EntityType, entityId: string): Record<string, unknown> => {
      const base = { ...serverValues(entityType, entityId) };
      const prefix = `${entityType}:${entityId}:`;
      for (const [path, value] of Object.entries(localValues)) {
        if (path.startsWith(prefix)) base[path.slice(prefix.length)] = value;
      }
      return base;
    },
    [serverValues, localValues],
  );

  const metaOf = useCallback(
    (entityType: EntityType, entityId: string, fieldKey: string): FieldMeta | undefined => {
      if (!data) return undefined;
      if (entityId === CASE_ENTITY_ID) return data.caseMeta[fieldKey];
      const entity = (data.entities[entityType] ?? []).find((e) => e.id === entityId);
      return entity?.meta[fieldKey];
    },
    [data],
  );

  const canEdit = useCallback(
    (entityType: EntityType, entityId: string, fieldKey: string): boolean => {
      if (!data) return false;
      return canEditField(data.viewer, metaOf(entityType, entityId, fieldKey));
    },
    [data, metaOf],
  );

  const commit = useCallback(
    async (entityType: EntityType, entityId: string, fieldKey: string): Promise<boolean> => {
      if (!data) return false;
      const path = fieldPath(entityType, entityId, fieldKey);
      const value = latestValue.current[path];
      setSaveStates((s) => ({ ...s, [path]: 'saving' }));
      try {
        const res = await fetch(`/api/principal-approval/case/${data.id}/field`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entityType, entityId, fieldKey, value }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json?.error ?? 'השמירה נכשלה');

        setSaveStates((s) => ({ ...s, [path]: 'saved' }));
        setLastSavedAt(new Date());

        // Fold the saved value into the server snapshot and drop the local copy.
        setData((prev) => {
          if (!prev) return prev;
          const next: CaseDTO = { ...prev };
          if (entityId === CASE_ENTITY_ID) {
            next.caseValues = { ...prev.caseValues, [fieldKey]: value };
            next.caseMeta = { ...prev.caseMeta, [fieldKey]: json.meta };
          } else {
            next.entities = {
              ...prev.entities,
              [entityType]: (prev.entities[entityType] ?? []).map((e) =>
                e.id === entityId
                  ? { ...e, values: { ...e.values, [fieldKey]: value }, meta: { ...e.meta, [fieldKey]: json.meta } }
                  : e,
              ),
            };
          }
          if (json.conflict) {
            next.conflicts = [
              json.conflict as ConflictDTO,
              ...prev.conflicts.filter((c) => c.id !== json.conflict.id),
            ];
          } else {
            next.conflicts = prev.conflicts.filter(
              (c) => !(c.entityId === entityId && c.fieldKey === fieldKey && c.status === 'open'),
            );
          }
          return next;
        });
        setLocalValues((prev) => {
          const next = { ...prev };
          delete next[path];
          return next;
        });
        return true;
      } catch (err: any) {
        setSaveStates((s) => ({ ...s, [path]: 'error' }));
        setErrors((e) => ({ ...e, [path]: err?.message ?? 'השמירה נכשלה' }));
        return false;
      }
    },
    [data],
  );

  const setField = useCallback(
    (entityType: EntityType, entityId: string, fieldKey: string, value: unknown) => {
      const path = fieldPath(entityType, entityId, fieldKey);
      latestValue.current[path] = value;
      setLocalValues((prev) => ({ ...prev, [path]: value }));

      const def = getFieldDef(entityType, fieldKey);
      const currentValues = { ...valuesOf(entityType, entityId), [fieldKey]: value };
      const required = def ? isFieldRequired(def, currentValues) : false;
      const validation = def ? validateValue({ ...def, required }, value) : { valid: true as const };

      setErrors((e) => ({ ...e, [path]: validation.valid ? undefined : validation.error }));

      if (timers.current[path]) clearTimeout(timers.current[path]);

      if (!validation.valid) {
        setSaveStates((s) => ({ ...s, [path]: 'error' }));
        return;
      }

      if (holdForBroadcast) {
        // הטיוטה של היועץ: נשמרת אצלו, ועוברת ללקוח רק ב"שדר"
        const server = serverValues(entityType, entityId)[fieldKey];
        const same = JSON.stringify(server ?? null) === JSON.stringify(value ?? null);
        if (same) {
          delete held.current[path];
        } else {
          const base = held.current[path] ? held.current[path].base : (server ?? null);
          held.current[path] = { entityType, entityId, fieldKey, value, base };
        }
        setSaveStates((s) => ({ ...s, [path]: 'idle' }));
        setHeldVersion((version) => version + 1);
        if (heldTimer.current) clearTimeout(heldTimer.current);
        heldTimer.current = setTimeout(() => void persistHeld(), AUTOSAVE_DEBOUNCE_MS);
        return;
      }

      setSaveStates((s) => ({ ...s, [path]: 'pending' }));
      timers.current[path] = setTimeout(() => {
        delete timers.current[path];
        void commit(entityType, entityId, fieldKey);
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [commit, valuesOf, holdForBroadcast, serverValues, persistHeld],
  );

  const entities = useCallback(
    (type: EntityType, parentId?: string | null): EntityDTO[] => {
      const list = data?.entities[type] ?? [];
      if (parentId === undefined) return list;
      return list.filter((e) => e.parentId === parentId);
    },
    [data],
  );

  const addEntity = useCallback(
    async (type: EntityType, parentId?: string | null): Promise<EntityDTO | null> => {
      if (!data) return null;
      try {
        const res = await fetch(`/api/principal-approval/case/${data.id}/entity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, parentId: parentId ?? null }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? 'ההוספה נכשלה');
        await load();
        return json.entity as EntityDTO;
      } catch (err: any) {
        setActionError(err?.message ?? 'ההוספה נכשלה');
        return null;
      }
    },
    [data, load],
  );

  const removeEntity = useCallback(
    async (entityId: string) => {
      if (!data) return;
      try {
        const res = await fetch(
          `/api/principal-approval/case/${data.id}/entity?entityId=${encodeURIComponent(entityId)}`,
          { method: 'DELETE' },
        );
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error ?? 'ההסרה נכשלה');
        }
        await load();
      } catch (err: any) {
        setActionError(err?.message ?? 'ההסרה נכשלה');
      }
    },
    [data, load],
  );

  const resolveConflict = useCallback(
    async (conflictId: string, choice: 'profile' | 'case') => {
      if (!data) return;
      try {
        const res = await fetch(`/api/principal-approval/case/${data.id}/conflicts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conflictId, choice }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? 'הפעולה נכשלה');
        await load();
      } catch (err: any) {
        setActionError(err?.message ?? 'הפעולה נכשלה');
      }
    },
    [data, load],
  );

  const setAdvisorPermission = useCallback(
    async (advisorId: string, canEditFlag: boolean) => {
      if (!data) return;
      try {
        const res = await fetch(`/api/principal-approval/case/${data.id}/permissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ advisorId, canEdit: canEditFlag }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? 'עדכון ההרשאה נכשל');
        await load();
      } catch (err: any) {
        setActionError(err?.message ?? 'עדכון ההרשאה נכשל');
      }
    },
    [data, load],
  );

  const openConflicts = useMemo(
    () => (data?.conflicts ?? []).filter((c) => c.status === 'open'),
    [data],
  );

  const pendingCount = useMemo(
    () => Object.values(saveStates).filter((s) => s === 'pending' || s === 'saving').length,
    [saveStates],
  );

  /** "שדר": כל שדה בטיוטה נשמר בתיק בשמירה הרגילה, עם הבדיקות שלה */
  const broadcastHeld = useCallback(async () => {
    setHeldBusy(true);
    setHeldError(null);
    if (heldTimer.current) clearTimeout(heldTimer.current);
    const fields = Object.entries(held.current);
    for (const [path, field] of fields) {
      latestValue.current[path] = field.value;
      const ok = await commit(field.entityType, field.entityId, field.fieldKey);
      if (ok) delete held.current[path];
    }
    await persistHeld();
    setHeldVersion((version) => version + 1);
    if (Object.keys(held.current).length > 0) setHeldError('חלק מהשדות לא שודרו. הם נשארו אצלכם — בדקו אותם ונסו שוב.');
    setHeldBusy(false);
  }, [commit, persistHeld]);

  const discardHeld = useCallback(async () => {
    const paths = Object.keys(held.current);
    held.current = {};
    setLocalValues((prev) => {
      const next = { ...prev };
      paths.forEach((path) => delete next[path]);
      return next;
    });
    setHeldVersion((version) => version + 1);
    await persistHeld();
  }, [persistHeld]);

  const heldState = useMemo<HeldState | null>(() => {
    if (!holdForBroadcast) return null;
    const fields = Object.values(held.current);
    return {
      fields,
      clientChanged: fields.filter(
        (field) =>
          JSON.stringify(serverValues(field.entityType, field.entityId)[field.fieldKey] ?? null) !==
          JSON.stringify(field.base ?? null)
      ),
      busy: heldBusy,
      error: heldError,
      broadcast: broadcastHeld,
      discard: discardHeld,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdForBroadcast, heldVersion, heldBusy, heldError, serverValues, broadcastHeld, discardHeld]);

  const value: CaseContextValue = {
    data,
    loading,
    loadError,
    valuesOf,
    metaOf,
    errorOf: (entityType, entityId, fieldKey) => errors[fieldPath(entityType, entityId, fieldKey)],
    saveStateOf: (entityType, entityId, fieldKey) =>
      saveStates[fieldPath(entityType, entityId, fieldKey)] ?? 'idle',
    canEdit,
    setField,
    entities,
    addEntity,
    removeEntity,
    openConflicts,
    resolveConflict,
    setAdvisorPermission,
    refresh: load,
    pendingCount,
    lastSavedAt,
    actionError,
    dismissActionError: () => setActionError(null),
    held: heldState,
  };

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}
