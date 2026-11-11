import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICING, normalizePricing, readPrice, trackHref, trackPriceLabel, visibleTracks } from './pricing-config';
import { buildPricingView } from '@/data/platform/pricing';

describe('normalizePricing', () => {
  it('falls back to the defaults when nothing was saved', () => {
    expect(normalizePricing(null)).toEqual(DEFAULT_PRICING);
    expect(normalizePricing({ platformPrice: 'abc' }).platformPrice).toBe(49);
  });

  it('keeps the built-in tracks even when they are missing or tampered with', () => {
    const config = normalizePricing({
      platformPrice: 59,
      tracks: [{ id: 'self', kind: 'CUSTOM', name: 'עצמאי', visible: false, billing: 'ONE_TIME', price: 1 }],
    });
    expect(config.platformPrice).toBe(59);
    expect(config.tracks.map((track) => track.id)).toEqual(['self', 'full']);
    const self = config.tracks[0];
    expect(self.kind).toBe('PLATFORM');
    expect(self.billing).toBe('MONTHLY');
    expect(self.visible).toBe(true);
    expect(self.name).toBe('עצמאי');
  });

  it('adds custom tracks in order, drops duplicates and treats a priceless paid track as a quote', () => {
    const config = normalizePricing({
      tracks: [
        { id: 'full', name: 'ליווי' },
        { id: 'a', name: 'בדיקת משכנתא', billing: 'ONE_TIME', price: '1,500' },
        { id: 'a', name: 'כפול' },
        { id: 'b', name: 'בלי מחיר', billing: 'ONE_TIME', price: '' },
        { id: 'c', name: '' },
      ],
    });
    expect(config.tracks.map((track) => track.id)).toEqual(['self', 'full', 'a', 'b']);
    expect(config.tracks[2].price).toBe(1500);
    expect(config.tracks[3].billing).toBe('QUOTE');
  });
});

describe('prices on the pages', () => {
  it('reads prices in shekels within the limits', () => {
    expect(readPrice('₪ 79')).toBe(79);
    expect(readPrice(0)).toBeNull();
    expect(readPrice(1e9)).toBeNull();
  });

  it('shows the platform price on the self track and everywhere else', () => {
    const config = normalizePricing({
      platformPrice: 59,
      tracks: [{ id: 'x', name: 'שיחת ייעוץ', billing: 'ONE_TIME', price: 350 }],
    });
    const view = buildPricingView(config);
    expect(view.plans.map((plan) => plan.price)).toEqual(['₪59', 'מחיר לפי השלבים והתיק', '₪350']);
    expect(view.principles[0].title).toContain('₪59');
    expect(view.billingNotes[1].title).toContain('₪59 עד ₪177');
    expect(view.faq.some((item) => item.answer.includes('₪59'))).toBe(true);
    expect(view.comparisonRows.at(-1)?.self).toContain('₪59');
    expect(trackPriceLabel(config.tracks[2], 59)).toBe('₪350');
    expect(trackHref(config.tracks[2])).toBe('/consult?track=%D7%A9%D7%99%D7%97%D7%AA%20%D7%99%D7%99%D7%A2%D7%95%D7%A5');
  });

  it('hides tracks that were switched off', () => {
    const config = normalizePricing({ tracks: [{ id: 'full', visible: false, name: 'ליווי' }] });
    expect(visibleTracks(config).map((track) => track.id)).toEqual(['self']);
  });
});
