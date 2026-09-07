/**
 * Bridge between the client profile built during the "בניית פרופיל לקוח" stage
 * and the principal-approval intake.
 *
 * Fields listed here are pre-filled from the profile on the primary borrower
 * (and on the case), and any later divergence raises a conflict the user has to
 * resolve — after which the winning value is written back to the profile so that
 * every screen reading the profile stays in sync.
 */

import type { EntityType } from './schema';

export interface ProfileMapping {
  /** Key inside ClientProfile.dataJson */
  profileKey: string;
  entityType: Extract<EntityType, 'borrower' | 'case'>;
  fieldKey: string;
}

export const PROFILE_MAPPINGS: ProfileMapping[] = [
  { profileKey: 'firstName', entityType: 'borrower', fieldKey: 'firstName' },
  { profileKey: 'lastName', entityType: 'borrower', fieldKey: 'lastName' },
  { profileKey: 'idNumber', entityType: 'borrower', fieldKey: 'idNumber' },
  { profileKey: 'birthDate', entityType: 'borrower', fieldKey: 'birthDate' },
  { profileKey: 'idIssueDate', entityType: 'borrower', fieldKey: 'idIssueDate' },
  { profileKey: 'idExpiryDate', entityType: 'borrower', fieldKey: 'idExpiryDate' },
  { profileKey: 'gender', entityType: 'borrower', fieldKey: 'gender' },
  { profileKey: 'hasForeignCitizenship', entityType: 'borrower', fieldKey: 'hasForeignCitizenship' },
  { profileKey: 'foreignCitizenshipCountries', entityType: 'borrower', fieldKey: 'foreignCitizenshipCountries' },
  { profileKey: 'phone', entityType: 'borrower', fieldKey: 'phone' },
  { profileKey: 'email', entityType: 'borrower', fieldKey: 'email' },
  { profileKey: 'city', entityType: 'borrower', fieldKey: 'city' },
  { profileKey: 'address', entityType: 'borrower', fieldKey: 'address' },
  { profileKey: 'zipCode', entityType: 'borrower', fieldKey: 'zipCode' },
  { profileKey: 'employmentStatus', entityType: 'borrower', fieldKey: 'employmentStatus' },
  { profileKey: 'maritalStatus', entityType: 'borrower', fieldKey: 'maritalStatus' },
  { profileKey: 'childrenUnder21', entityType: 'borrower', fieldKey: 'childrenUnder21' },
  { profileKey: 'childrenAges', entityType: 'borrower', fieldKey: 'childrenAges' },
  { profileKey: 'onMaternityLeave', entityType: 'borrower', fieldKey: 'onMaternityLeave' },
  { profileKey: 'education', entityType: 'borrower', fieldKey: 'education' },
  { profileKey: 'publicFigureRelation', entityType: 'borrower', fieldKey: 'publicFigureRelation' },
  { profileKey: 'totalEquity', entityType: 'case', fieldKey: 'totalEquity' },
  { profileKey: 'propertyPrice', entityType: 'case', fieldKey: 'propertyPrice' },
  { profileKey: 'propertyCity', entityType: 'case', fieldKey: 'propertyCity' },
  { profileKey: 'propertyAddress', entityType: 'case', fieldKey: 'propertyAddress' },
  { profileKey: 'propertyZipCode', entityType: 'case', fieldKey: 'propertyZipCode' },
  { profileKey: 'hasEligibility', entityType: 'case', fieldKey: 'hasEligibility' },
];

/** Profile key for a given field, when that field participates in the sync. */
export function profileKeyFor(
  entityType: EntityType,
  fieldKey: string,
  isPrimaryBorrower: boolean,
): string | null {
  const mapping = PROFILE_MAPPINGS.find((m) => m.entityType === entityType && m.fieldKey === fieldKey);
  if (!mapping) return null;
  if (mapping.entityType === 'borrower' && !isPrimaryBorrower) return null;
  return mapping.profileKey;
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
