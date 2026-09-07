/**
 * The document checklist for a principal-approval request.
 *
 * The catalogue itself lives in `src/lib/client-process.ts` and `mortgage-plan.ts`
 * and is not duplicated here — this only decides which of those lists apply,
 * based on the borrowers entered in the intake rather than on the planning
 * profile, so the checklist follows the people actually on the application.
 */

import {
  BANK_ACCOUNT_DOCUMENTS,
  SHARED_PRE_APPROVAL_DOCUMENTS,
} from '@/lib/mortgage-plan';
import { EMPLOYMENT_DOCUMENTS, EMPLOYMENT_LABELS } from '@/lib/client-process';
import type { EmploymentType, StageDocument } from '@/lib/client-process';
import { employmentStatusToProfile } from './profile';

export interface DocumentGroup {
  id: string;
  title: string;
  subtitle: string | null;
  documents: StageDocument[];
}

export interface DocumentPerson {
  id: string;
  label: string;
  employmentStatus: unknown;
}

/** Prefixes a document key with its owner, so two borrowers never collide. */
export function documentKey(ownerId: string, key: string): string {
  return `${ownerId}:${key}`;
}

/**
 * Builds the checklist: shared household documents once, then the employment
 * documents of each borrower and guarantor. Bank-account documents sit in the
 * shared group when there is a single borrower and per person otherwise, which
 * is how the planning flow already splits them.
 */
export function buildDocumentGroups(people: DocumentPerson[]): DocumentGroup[] {
  const perPerson = people.length > 1;

  const groups: DocumentGroup[] = [
    {
      id: 'shared',
      title: 'מסמכי משק הבית והעסקה',
      subtitle: null,
      documents: perPerson
        ? SHARED_PRE_APPROVAL_DOCUMENTS.map((doc) => ({ ...doc, key: documentKey('shared', doc.key) }))
        : [...BANK_ACCOUNT_DOCUMENTS, ...SHARED_PRE_APPROVAL_DOCUMENTS].map((doc) => ({
            ...doc,
            key: documentKey('shared', doc.key),
          })),
    },
  ];

  for (const person of people) {
    const employment = employmentStatusToProfile(person.employmentStatus) as EmploymentType | null;
    const documents: StageDocument[] = [
      ...(perPerson ? BANK_ACCOUNT_DOCUMENTS : []),
      ...(employment ? EMPLOYMENT_DOCUMENTS[employment] : []),
    ].map((doc) => ({ ...doc, key: documentKey(person.id, doc.key) }));

    if (documents.length === 0) continue;

    groups.push({
      id: person.id,
      title: person.label,
      subtitle: employment ? EMPLOYMENT_LABELS[employment] : 'טרם נבחר אופן העסקה',
      documents,
    });
  }

  return groups;
}

/** Collected / total across every group, for the progress badge. */
export function documentProgress(
  groups: DocumentGroup[],
  collected: Record<string, boolean>,
): { collected: number; total: number } {
  let done = 0;
  let total = 0;
  for (const group of groups) {
    for (const doc of group.documents) {
      total += 1;
      if (collected[doc.key]) done += 1;
    }
  }
  return { collected: done, total };
}
