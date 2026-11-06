/**
 * Bridge between the client profile and the principal-approval intake.
 *
 * The profile lives where the rest of the app already keeps it — `User.profileJson`,
 * read and written through `src/lib/client-profile.ts`. This module only maps
 * between that shape and the fields of the approval form; it deliberately does
 * not introduce a second profile store.
 *
 * Two kinds of link exist:
 *
 * 1. **Two-way fields** — the same fact expressed identically on both sides, so a
 *    divergence is a real contradiction and is raised as a conflict for the user
 *    to resolve. The winning value is written back to the profile.
 * 2. **Derived fields** — values the approval flow computes from several rows
 *    (total income, household composition, primary bank). The case is the richer
 *    source, so these are pushed to the profile silently; asking the user to
 *    "choose" between a sum and its parts would be meaningless.
 */

import type { ClientProfileFinancials } from '@/lib/client-profile';
import type { EmploymentType } from '@/lib/mortgage-plan';
import type { EntityType } from './schema';

/** Which borrower a mapping applies to: the primary one, or their partner. */
export type BorrowerSlot = 'primary' | 'partner';

export interface ProfileMapping {
  /** Key inside the stored profile (ClientProfileFinancials). */
  profileKey: keyof ClientProfileFinancials;
  entityType: Extract<EntityType, 'borrower' | 'case'>;
  fieldKey: string;
  /** For borrower fields — which of the two borrowers this maps to. */
  slot?: BorrowerSlot;
}

/**
 * Fields that mean exactly the same thing on both sides. A difference here is a
 * genuine contradiction, so it becomes a conflict the user resolves.
 */
export const PROFILE_MAPPINGS: ProfileMapping[] = [
  { profileKey: 'equity', entityType: 'case', fieldKey: 'totalEquity' },
  { profileKey: 'employmentType', entityType: 'borrower', fieldKey: 'employmentStatus', slot: 'primary' },
  { profileKey: 'partnerEmploymentType', entityType: 'borrower', fieldKey: 'employmentStatus', slot: 'partner' },
];

/* -------------------------------------------------------------------------- */
/* Employment status                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The profile knows two employment types; the approval form collects five.
 * The mapping is therefore lossy in one direction, and values that have no
 * counterpart return null so that no false conflict is raised.
 */
export function employmentStatusToProfile(status: unknown): EmploymentType | null {
  switch (status) {
    case 'employee':
    case 'employee_and_self':
      return 'SALARIED';
    case 'self_employed':
      return 'SELF_EMPLOYED';
    default:
      // unemployed / pensioner / not answered — the profile cannot express these.
      return null;
  }
}

export function profileToEmploymentStatus(type: unknown): string | null {
  if (type === 'SALARIED') return 'employee';
  if (type === 'SELF_EMPLOYED') return 'self_employed';
  return null;
}

/** Converts a case value into the shape the profile stores. */
export function toProfileValue(profileKey: keyof ClientProfileFinancials, caseValue: unknown): unknown {
  if (profileKey === 'employmentType' || profileKey === 'partnerEmploymentType') {
    return employmentStatusToProfile(caseValue);
  }
  return caseValue;
}

/** Converts a stored profile value into the shape the case field expects. */
export function toCaseValue(profileKey: keyof ClientProfileFinancials, profileValue: unknown): unknown {
  if (profileKey === 'employmentType' || profileKey === 'partnerEmploymentType') {
    return profileToEmploymentStatus(profileValue);
  }
  return profileValue;
}

/* -------------------------------------------------------------------------- */
/* Lookup                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The profile key a given field participates in, or null when the field is not
 * part of the two-way sync. Borrower fields only map for the first two
 * borrowers, matching the profile's borrower/partner shape.
 */
export function profileKeyFor(
  entityType: EntityType,
  fieldKey: string,
  borrowerPosition: number | null,
): keyof ClientProfileFinancials | null {
  if (entityType === 'case') {
    return PROFILE_MAPPINGS.find((m) => m.entityType === 'case' && m.fieldKey === fieldKey)?.profileKey ?? null;
  }
  if (entityType !== 'borrower' || borrowerPosition === null) return null;
  if (borrowerPosition > 1) return null;

  const slot: BorrowerSlot = borrowerPosition === 0 ? 'primary' : 'partner';
  return (
    PROFILE_MAPPINGS.find((m) => m.entityType === 'borrower' && m.fieldKey === fieldKey && m.slot === slot)
      ?.profileKey ?? null
  );
}

/** Normalises both sides before comparing, so "05012" vs 5012 is not a conflict. */
export function valuesDiffer(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => {
    if (v === null || v === undefined || v === '') return null;
    if (Array.isArray(v)) return JSON.stringify([...v].map(String).sort());
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v).trim();
  };
  const na = norm(a);
  const nb = norm(b);
  if (na === null || nb === null) return false; // an empty side is never a conflict
  return na !== nb;
}

/**
 * Splits a stored full name into the two fields the form collects.
 * Used for pre-fill only — the profile keeps one name, so a round trip would
 * lose the distinction and must not raise a conflict.
 */
export function splitFullName(fullName: string | null | undefined): { firstName: string; lastName: string } | null {
  const trimmed = String(fullName ?? '').trim().replace(/\s+/g, ' ');
  if (trimmed === '') return null;
  const parts = trimmed.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}
