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
}

const CaseContext = createContext<CaseContextValue | null>(null);

export function useCase(): CaseContextValue {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error('useCase must be used inside <CaseProvider>');
  return ctx;
}

export function CaseProvider({
  children,
  clientId,
}: {
  children: React.ReactNode;
  clientId?: string;
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

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const url = clientId
        ? `/api/principal-approval/case?clientId=${encodeURIComponent(clientId)}`
        : '/api/principal-approval/case';
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'טעינת התיק נכשלה');
      setData(json as CaseDTO);
      setLocalValues({});
    } catch (err: any) {
      setLoadError(err?.message ?? 'טעינת התיק נכשלה');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

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
    async (entityType: EntityType, entityId: string, fieldKey: string) => {
      if (!data) return;
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
      } catch (err: any) {
        setSaveStates((s) => ({ ...s, [path]: 'error' }));
        setErrors((e) => ({ ...e, [path]: err?.message ?? 'השמירה נכשלה' }));
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

      setSaveStates((s) => ({ ...s, [path]: 'pending' }));
      timers.current[path] = setTimeout(() => {
        delete timers.current[path];
        void commit(entityType, entityId, fieldKey);
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [commit, valuesOf],
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
  };

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}
