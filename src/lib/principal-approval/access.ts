import type { FieldMeta, ViewerContext } from './types';

/**
 * Who may edit a given field.
 *
 * - The client always owns their own file and may edit everything.
 * - An advisor may edit anything they entered themselves, and anything still
 *   empty, but data the *client* entered is read-only for them unless the client
 *   explicitly granted that advisor edit permission.
 */
export function canEditField(viewer: ViewerContext, meta: FieldMeta | undefined): boolean {
  if (viewer.role === 'client') return true;
  if (!meta) return true; // nothing entered yet
  if (meta.source === 'advisor') return true;
  return viewer.canEditClientFields;
}

/** Badge text shown next to a field, or null when there is nothing to say. */
export function provenanceLabel(viewer: ViewerContext, meta: FieldMeta | undefined): string | null {
  if (!meta) return null;
  if (meta.source === 'advisor') {
    return viewer.role === 'client' ? 'הוזן על ידי היועץ' : 'הוזן על ידך';
  }
  if (meta.source === 'client') {
    return viewer.role === 'advisor' ? 'הוזן על ידי הלקוח' : null;
  }
  if (meta.source === 'profile') return 'מפרופיל הלקוח';
  return null;
}
