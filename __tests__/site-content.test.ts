import { describe, expect, it } from 'vitest';
import {
  ALL_PAGES,
  bannersForPath,
  emptyBanner,
  normalizeSiteContent,
  pageKeyForPath,
  pageMatches,
  safeLink,
  setTextRule,
  textRulesForPath,
} from '@/lib/site-content';
import { siteContentBootScript } from '@/components/site-content/siteContentBoot';

describe('site content', () => {
  it('matches exact pages, wildcards and the whole site', () => {
    expect(pageMatches(ALL_PAGES, '/anything')).toBe(true);
    expect(pageMatches('/pricing', '/pricing/')).toBe(true);
    expect(pageMatches('/pricing', '/pricing/x')).toBe(false);
    expect(pageMatches('/dashboard/plans/*', '/dashboard/plans/abc')).toBe(true);
    expect(pageMatches('/dashboard/plans/*', '/dashboard/plans')).toBe(false);
    expect(pageMatches('/dashboard/plans/*/payment-schedule', '/dashboard/plans/abc/payment-schedule')).toBe(true);
    expect(pageMatches('/dashboard/plans/*/payment-schedule', '/dashboard/plans/abc')).toBe(false);
  });

  it('saves edits made on the demo screens to the real client pages', () => {
    expect(pageKeyForPath('/demo/dashboard')).toBe('/dashboard');
    expect(pageKeyForPath('/demo/plan')).toBe('/dashboard/plans/*');
    expect(pageKeyForPath('/demo/authorization-letters')).toBe('/dashboard/plans/*/authorization-letters');
    expect(pageKeyForPath('/dashboard/plans/x1/authorization-letters')).toBe('/dashboard/plans/*/authorization-letters');
    expect(pageKeyForPath('/unknown')).toBe('/unknown');
  });

  it('lets a page-specific text win over a site-wide one', () => {
    const content = normalizeSiteContent({
      texts: [
        { page: '/pricing', from: 'הרשמה', to: 'הצטרפות למסלול' },
        { page: '*', from: '  הרשמה \n', to: 'הצטרפות' },
      ],
    });
    expect(textRulesForPath(content, '/pricing').get('הרשמה')).toBe('הצטרפות למסלול');
    expect(textRulesForPath(content, '/').get('הרשמה')).toBe('הצטרפות');
  });

  it('drops invalid rules and unsafe links', () => {
    const content = normalizeSiteContent({
      texts: [
        { page: 'pricing', from: 'a', to: 'b' },
        { page: '/x', from: '', to: 'b' },
        { page: '/x', from: 'same', to: 'same' },
        { page: '/x', from: 'empty', to: '' },
      ],
      banners: [{ title: 'מבצע', linkUrl: 'javascript:alert(1)', imageUrl: '//evil.example/x.png', placement: 'nope' }],
    });
    expect(content.texts).toEqual([]);
    expect(content.banners[0].linkUrl).toBe('');
    expect(content.banners[0].imageUrl).toBe('');
    expect(content.banners[0].placement).toBe('top');
    expect(safeLink('/pricing')).toBe('/pricing');
    expect(safeLink('https://bank.co.il')).toBe('https://bank.co.il');
  });

  it('sets and removes a single text from on-page editing', () => {
    let content = setTextRule({ texts: [], banners: [] }, '/', 'שלום', 'היי');
    expect(content.texts).toHaveLength(1);
    content = setTextRule(content, '/', 'שלום', 'אהלן');
    expect(content.texts.map((rule) => rule.to)).toEqual(['אהלן']);
    content = setTextRule(content, '/', 'שלום', '');
    expect(content.texts).toEqual([]);
  });

  it('shows banners only on their pages, placement and dates', () => {
    const banner = { ...emptyBanner(), title: 'מבצע', pages: ['/pricing'], startsOn: '2026-10-01', endsOn: '2026-10-31' };
    const content = normalizeSiteContent({ banners: [banner, { ...banner, id: 'off', active: false }] });
    expect(bannersForPath(content, '/pricing', 'top', '2026-10-20').map((item) => item.id)).toEqual([banner.id]);
    expect(bannersForPath(content, '/pricing', 'popup', '2026-10-20')).toEqual([]);
    expect(bannersForPath(content, '/', 'top', '2026-10-20')).toEqual([]);
    expect(bannersForPath(content, '/pricing', 'top', '2026-11-01')).toEqual([]);
  });

  it('hides a page before paint only when it has text changes', () => {
    expect(siteContentBootScript({ texts: [], banners: [] })).toBeNull();
    const script = siteContentBootScript(normalizeSiteContent({ texts: [{ page: '/</script>', from: 'a', to: 'b' }] }));
    expect(script).not.toContain('</script>');
  });
});
