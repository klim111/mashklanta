import { describe, expect, it } from 'vitest';
import { DEFAULT_LANDING_CONTENT, LANDING_PAGES, listItems, normalizeLandingContent } from '@/lib/landing-content';

describe('landing content', () => {
  it('fills every field of every page from the defaults when nothing is saved', () => {
    const content = normalizeLandingContent(null);
    for (const page of LANDING_PAGES) {
      for (const field of page.fields) {
        expect(content[page.id][field.key], `${page.id}.${field.key}`).toBeTruthy();
      }
    }
  });

  it('keeps edited text, drops unknown keys and falls back on empty fields', () => {
    const content = normalizeLandingContent({
      office: { title: '  כותרת חדשה ', subtitle: '', injected: 'x' },
      loans: { headline: 42 },
    });
    expect(content.office.title).toBe('כותרת חדשה');
    expect(content.office.subtitle).toBe(DEFAULT_LANDING_CONTENT.office.subtitle);
    expect(content.office).not.toHaveProperty('injected');
    expect(content.loans.headline).toBe(DEFAULT_LANDING_CONTENT.loans.headline);
  });

  it('splits list fields into non-empty lines', () => {
    expect(listItems('א\n\n  ב \n')).toEqual(['א', 'ב']);
  });
});
