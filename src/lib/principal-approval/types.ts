import type { EntityType } from './schema';

export type FieldSource = 'client' | 'advisor' | 'profile';
export type ViewerRole = 'client' | 'advisor';

export interface FieldMeta {
  source: FieldSource;
  updatedAt: string;
  updatedById?: string | null;
  updatedByName?: string | null;
}

export interface EntityDTO {
  id: string;
  type: EntityType;
  parentId: string | null;
  position: number;
  values: Record<string, unknown>;
  meta: Record<string, FieldMeta>;
}

export interface ConflictDTO {
  id: string;
  entityType: EntityType;
  entityId: string;
  fieldKey: string;
  fieldLabel: string;
  entityLabel: string;
  profileValue: unknown;
  caseValue: unknown;
  status: 'open' | 'resolved';
  resolvedWith?: 'profile' | 'case' | null;
  createdAt: string;
}

export interface AdvisorAccessDTO {
  advisorId: string;
  advisorName: string | null;
  advisorEmail: string | null;
  canEdit: boolean;
  grantedAt: string | null;
  isAssigned: boolean;
}

export interface ViewerContext {
  id: string;
  name: string | null;
  role: ViewerRole;
  /** Advisor only: may this advisor edit fields the client entered? */
  canEditClientFields: boolean;
}

export interface CaseDTO {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string | null; email: string | null };
  advisor: { id: string; name: string | null; email: string | null } | null;
  viewer: ViewerContext;
  caseValues: Record<string, unknown>;
  caseMeta: Record<string, FieldMeta>;
  entities: Record<EntityType, EntityDTO[]>;
  conflicts: ConflictDTO[];
  advisors: AdvisorAccessDTO[];
  profile: Record<string, unknown>;
}

export interface SaveFieldPayload {
  entityType: EntityType;
  entityId: string;
  fieldKey: string;
  value: unknown;
}

export interface SaveFieldResult {
  ok: boolean;
  error?: string;
  meta?: FieldMeta;
  conflict?: ConflictDTO;
}
