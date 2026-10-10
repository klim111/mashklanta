import { describe, expect, it } from 'vitest';
import { computeMix, createTrack, createWorkspaceMix } from './engine';
import { toSavedMix } from './mixRecord';

function record(overrides: Record<string, unknown> = {}) {
  const mix = createWorkspaceMix({
    id: 'mix-1',
    name: 'תמהיל',
    totalAmount: 1_000_000,
    tracks: [
      createTrack({ id: 't1', type: 'fixed_unlinked', amount: 1_000_000, years: 25, interestRate: 4.5 }),
    ],
  });
  return { mix, summary: computeMix(mix).summary, savedAt: mix.updatedAt, ...overrides };
}

describe('שידור תמהיל ללקוח', () => {
  it('תמהיל שסומן כלא משודר נשאר כזה', () => {
    expect(toSavedMix(record({ sharedWithClient: false }))?.sharedWithClient).toBe(false);
  });

  it('תמהיל משודר, וגם רשומה שנשמרה לפני שהופרדו טיוטות, נחשבים גלויים', () => {
    expect(toSavedMix(record({ sharedWithClient: true }))?.sharedWithClient).toBe(true);
    expect(toSavedMix(record())?.sharedWithClient).toBe(true);
  });

  it('רק false מסתיר — ערך שאינו בוליאני אינו מסתיר תמהיל בטעות', () => {
    expect(toSavedMix(record({ sharedWithClient: 'no' }))?.sharedWithClient).toBe(true);
    expect(toSavedMix(record({ sharedWithClient: 0 }))?.sharedWithClient).toBe(true);
    expect(toSavedMix(record({ sharedWithClient: null }))?.sharedWithClient).toBe(true);
  });

  it('תמהיל נעול נקרא כנעול, בלי קשר לשידור', () => {
    const saved = toSavedMix(record({ locked: true, sharedWithClient: false }));
    expect(saved?.locked).toBe(true);
    expect(saved?.mix.locked).toBe(true);
    expect(saved?.sharedWithClient).toBe(false);
  });
});
