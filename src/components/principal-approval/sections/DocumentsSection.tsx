'use client';

import React from 'react';
import { FolderCheck } from 'lucide-react';
import { DOCUMENT_FIELDS } from '@/lib/principal-approval/schema';
import { buildDocumentGroups, documentProgress } from '@/lib/principal-approval/documents';
import { useCase, CASE_ENTITY_ID } from '../CaseContext';
import { FieldGrid } from '../fields/SmartField';
import { SectionHeader } from './SectionShell';

/** The document file the bank will ask for, derived from the people on the application. */
export function DocumentsSection() {
  const { entities, valuesOf } = useCase();

  const people = [
    ...entities('borrower').map((entity, index) => ({ entity, index, kind: 'borrower' as const })),
    ...entities('guarantor').map((entity, index) => ({ entity, index, kind: 'guarantor' as const })),
  ].map(({ entity, index, kind }) => {
    const values = valuesOf(kind, entity.id);
    const name = [values.firstName, values.lastName].filter(Boolean).join(' ').trim();
    return {
      id: entity.id,
      label: name || `${kind === 'borrower' ? 'לווה' : 'ערב'} ${index + 1}`,
      employmentStatus: values.employmentStatus,
    };
  });

  const collected = (valuesOf('case', CASE_ENTITY_ID).documents as Record<string, boolean>) ?? {};
  const progress = documentProgress(buildDocumentGroups(people), collected);

  return (
    <section className="space-y-6">
      <SectionHeader
        title="תיק המסמכים"
        subtitle="מסמך חסר הוא הסיבה הנפוצה ביותר לעיכוב בבקשה — הרשימה נבנית לפי אופן ההעסקה של כל לווה"
        icon={FolderCheck}
        progress={{ filled: progress.collected, total: progress.total }}
      />
      <FieldGrid fields={DOCUMENT_FIELDS} entityType="case" entityId={CASE_ENTITY_ID} />
    </section>
  );
}
