import { describe, expect, it } from 'vitest';
import { ALL_PAGES, pageMatches } from './site-content';

describe('site content on advisor office pages', () => {
  it('keeps site-wide banners and texts off advisor office pages', () => {
    expect(pageMatches(ALL_PAGES, '/')).toBe(true);
    expect(pageMatches(ALL_PAGES, '/learn')).toBe(true);
    expect(pageMatches(ALL_PAGES, '/o/igor')).toBe(false);
  });

  it('still allows a rule that names office pages explicitly', () => {
    expect(pageMatches('/o/*', '/o/igor')).toBe(true);
    expect(pageMatches('/o/igor', '/o/igor')).toBe(true);
  });
});
