import { describe, expect, it } from 'vitest';
import {
  ALL_SIGNING_DOCUMENT_KEYS,
  SIGNING_DEAL_TYPES,
  dealScenarios,
  registryOfScenario,
  signingDealType,
  signingDocumentKey,
  signingScenario,
} from './signing-documents';
import { parseStageData } from './mortgage-plan';

describe('קטלוג תרחישי החתימה', () => {
  it('חמשת סוגי העסקה מוצגים לפי הסדר, ולכל אחד יש תרחישים', () => {
    expect(SIGNING_DEAL_TYPES.map((deal) => deal.id)).toEqual([
      'new_from_developer',
      'second_hand',
      'lot',
      'self_build',
      'any_purpose',
    ]);
    SIGNING_DEAL_TYPES.forEach((deal) => {
      expect(dealScenarios(deal).length, deal.id).toBeGreaterThan(0);
    });
  });

  it('רק בדירה יד 2 בוחרים קודם את אופן רישום הזכויות', () => {
    const second = signingDealType('second_hand');
    expect(second?.registries?.map((registry) => registry.id)).toEqual(['tabu', 'rmi']);
    SIGNING_DEAL_TYPES.filter((deal) => deal.id !== 'second_hand').forEach((deal) => {
      expect(deal.registries, deal.id).toBeUndefined();
    });
  });

  it('אופן הרישום נגזר מהתרחיש, כדי לשחזר את הניווט מבחירה שמורה', () => {
    const second = signingDealType('second_hand');
    expect(second).not.toBeNull();
    expect(registryOfScenario(second!, 'used_rmi_lease')?.id).toBe('rmi');
    expect(registryOfScenario(second!, 'used_tabu_owner')?.id).toBe('tabu');
    expect(registryOfScenario(signingDealType('lot')!, 'lot_tabu')).toBeNull();
  });

  it('לכל מסמך יש מפתח ייחודי בתוך התרחיש, ולכל תרחיש רשימה לא ריקה', () => {
    SIGNING_DEAL_TYPES.forEach((deal) => {
      dealScenarios(deal).forEach((scenario) => {
        expect(scenario.documents.length, scenario.id).toBeGreaterThan(0);
        const keys = scenario.documents.map((document) => document.key);
        expect(new Set(keys).size, scenario.id).toBe(keys.length);
        scenario.documents.forEach((document) => {
          expect(document.name.trim(), `${scenario.id}:${document.key}`).not.toBe('');
          expect(document.note.trim(), `${scenario.id}:${document.key}`).not.toBe('');
        });
      });
    });
    expect(new Set(ALL_SIGNING_DOCUMENT_KEYS).size).toBe(ALL_SIGNING_DOCUMENT_KEYS.length);
  });

  it('תרחיש נקרא רק מתוך סוג העסקה שהוא שייך לו', () => {
    const lot = signingDealType('lot');
    expect(signingScenario(lot, 'lot_rmi')?.id).toBe('lot_rmi');
    expect(signingScenario(lot, 'used_tabu_owner')).toBeNull();
  });
});

describe('שמירת הבחירה בשלב החתימה', () => {
  const read = (source: unknown) => parseStageData('SIGNING', source);

  it('שומרת את התרחיש, משלימה את אופן הרישום ומסמנת מסמכים שנאספו', () => {
    const collected = signingDocumentKey('used_rmi_lease', 'contract');
    const value = read({
      screen: 'documents',
      dealTypeId: 'second_hand',
      scenarioId: 'used_rmi_lease',
      documents: { [collected]: true },
    });

    expect(value.screen).toBe('documents');
    expect(value.dealTypeId).toBe('second_hand');
    expect(value.registryId).toBe('rmi');
    expect(value.scenarioId).toBe('used_rmi_lease');
    expect(value.documents).toEqual({ [collected]: true });
  });

  it('זורקת בחירה שאינה קיימת בקטלוג, כדי שלא תישמר דרך שאי אפשר להציג', () => {
    const value = read({
      screen: 'nowhere',
      dealTypeId: 'lot',
      registryId: 'tabu',
      scenarioId: 'used_tabu_owner',
      documents: { 'made:up': true },
    });

    expect(value.screen).toBe('overview');
    expect(value.dealTypeId).toBe('lot');
    expect(value.registryId).toBeNull();
    expect(value.scenarioId).toBeNull();
    expect(value.documents).toEqual({});
  });
});
