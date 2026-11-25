'use client';

/**
 * תיק בדפדפן — לטופס שממלא מבקר שלא מחובר (בקשת מכרז ריביות או בדיקת מיחזור
 * מהעמוד הראשי).
 *
 * הוא נותן לטופס בדיוק את אותו ממשק כמו `CaseProvider`, אבל בלי שרת: כל שדה
 * נשמר בזיכרון הדפדפן (localStorage), כך שרענון לא מוחק דבר. רק בלחיצה על
 * "שדר ליועץ" הכל נשלח בבת אחת, ונפתח ללקוח תיק אצל היועץ.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EntityType } from '@/lib/principal-approval/schema';
import { getFieldDef, isFieldRequired } from '@/lib/principal-approval/schema';
import { validateValue } from '@/lib/principal-approval/validation';
import type { CaseDTO, EntityDTO } from '@/lib/principal-approval/types';
import { CASE_ENTITY_ID, CaseContextProvider, fieldPath } from './CaseContext';

const EMPTY_ENTITIES = (): Record<EntityType, EntityDTO[]> => ({
  case: [],
  borrower: [],
  guarantor: [],
  income: [],
  prevEmployment: [],
  bankAccount: [],
  fundingSource: [],
  bankApproval: [],
});

let counter = 0;
function newId(type: EntityType): string {
  counter += 1;
  return `local-${type}-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

function entity(type: EntityType, parentId: string | null, position: number): EntityDTO {
  return { id: newId(type), type, parentId, position, values: {}, meta: {} };
}

/** תיק ריק: לווה אחד עם מקור הכנסה, חשבון בנק ומקור מימון — כמו תיק חדש בשרת */
export function emptyLocalCase(): CaseDTO {
  const entities = EMPTY_ENTITIES();
  const borrower = entity('borrower', null, 0);
  entities.borrower.push(borrower);
  entities.income.push(entity('income', borrower.id, 0));
  entities.bankAccount.push(entity('bankAccount', null, 0));
  entities.fundingSource.push(entity('fundingSource', null, 0));
  const now = new Date().toISOString();
  return {
    id: 'local',
    title: 'טופס פרטי הלקוח',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    intakeRequestedAt: null,
    intakeSubmittedAt: null,
    client: { id: 'local', name: null, email: null },
    advisor: null,
    viewer: { id: 'local', name: null, role: 'client', canEditClientFields: true },
    caseValues: {},
    caseMeta: {},
    entities,
    conflicts: [],
    advisors: [],
    profile: {},
  };
}

function readStored(key: string): CaseDTO | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CaseDTO;
    return parsed && parsed.entities && parsed.caseValues ? { ...emptyLocalCase(), ...parsed } : null;
  } catch {
    return null;
  }
}

export function LocalCaseProvider({ storageKey, children }: { storageKey: string; children: React.ReactNode }) {
  const [data, setData] = useState<CaseDTO | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const loaded = useRef(false);
  const dataRef = useRef<CaseDTO | null>(null);
  dataRef.current = data;

  useEffect(() => {
    setData(readStored(storageKey) ?? emptyLocalCase());
    loaded.current = true;
  }, [storageKey]);

  useEffect(() => {
    if (!loaded.current || !data) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // דפדפן בלי אחסון (גלישה פרטית) — הטופס עובד, רק לא שורד רענון
    }
  }, [data, storageKey]);

  const valuesOf = useCallback(
    (entityType: EntityType, entityId: string): Record<string, unknown> => {
      if (!data) return {};
      if (entityId === CASE_ENTITY_ID) return data.caseValues;
      return (data.entities[entityType] ?? []).find((e) => e.id === entityId)?.values ?? {};
    },
    [data],
  );

  const setField = useCallback(
    (entityType: EntityType, entityId: string, fieldKey: string, value: unknown) => {
      const def = getFieldDef(entityType, fieldKey);
      const current = { ...valuesOf(entityType, entityId), [fieldKey]: value };
      const required = def ? isFieldRequired(def, current) : false;
      const validation = def ? validateValue({ ...def, required }, value) : { valid: true as const };
      const path = fieldPath(entityType, entityId, fieldKey);
      setErrors((e) => ({ ...e, [path]: validation.valid ? undefined : validation.error }));

      setData((prev) => {
        if (!prev) return prev;
        if (entityId === CASE_ENTITY_ID) return { ...prev, caseValues: { ...prev.caseValues, [fieldKey]: value } };
        return {
          ...prev,
          entities: {
            ...prev.entities,
            [entityType]: (prev.entities[entityType] ?? []).map((e) =>
              e.id === entityId ? { ...e, values: { ...e.values, [fieldKey]: value } } : e,
            ),
          },
        };
      });
      setLastSavedAt(new Date());
    },
    [valuesOf],
  );

  const entities = useCallback(
    (type: EntityType, parentId?: string | null): EntityDTO[] => {
      const list = data?.entities[type] ?? [];
      return parentId === undefined ? list : list.filter((e) => e.parentId === parentId);
    },
    [data],
  );

  const addEntity = useCallback(
    async (type: EntityType, parentId?: string | null): Promise<EntityDTO | null> => {
      const position = (dataRef.current?.entities[type] ?? []).length;
      const created = entity(type, parentId ?? null, position);
      setData((prev) => {
        if (!prev) return prev;
        const list = prev.entities[type] ?? [];
        const nextEntities = { ...prev.entities, [type]: [...list, created] };
        // לווה או ערב חדש נפתח עם מקור הכנסה אחד, כמו בשרת
        if (type === 'borrower' || type === 'guarantor') {
          nextEntities.income = [...nextEntities.income, entity('income', created.id, 0)];
        }
        return { ...prev, entities: nextEntities };
      });
      return created;
    },
    [],
  );

  const removeEntity = useCallback(async (entityId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      // הרשומה וכל מה שתלוי בה (הכנסות של לווה, מקומות עבודה קודמים של הכנסה)
      const doomed = new Set([entityId]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const list of Object.values(prev.entities)) {
          for (const e of list) {
            if (e.parentId && doomed.has(e.parentId) && !doomed.has(e.id)) {
              doomed.add(e.id);
              grew = true;
            }
          }
        }
      }
      const next = EMPTY_ENTITIES();
      (Object.keys(prev.entities) as EntityType[]).forEach((type) => {
        next[type] = prev.entities[type].filter((e) => !doomed.has(e.id));
      });
      return { ...prev, entities: next };
    });
  }, []);

  const value = useMemo(
    () => ({
      data,
      loading: data === null,
      loadError: null,
      valuesOf,
      metaOf: () => undefined,
      errorOf: (entityType: EntityType, entityId: string, fieldKey: string) =>
        errors[fieldPath(entityType, entityId, fieldKey)],
      saveStateOf: () => 'idle' as const,
      canEdit: () => true,
      setField,
      entities,
      addEntity,
      removeEntity,
      openConflicts: [],
      resolveConflict: async () => undefined,
      setAdvisorPermission: async () => undefined,
      refresh: async () => undefined,
      pendingCount: 0,
      lastSavedAt,
      actionError: null,
      dismissActionError: () => undefined,
      held: null,
    }),
    [data, valuesOf, errors, setField, entities, addEntity, removeEntity, lastSavedAt],
  );

  return <CaseContextProvider value={value}>{children}</CaseContextProvider>;
}

/** מחיקת הטיוטה מהדפדפן אחרי שהבקשה נשלחה */
export function clearLocalCase(storageKey: string) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // אין אחסון — אין מה למחוק
  }
}
