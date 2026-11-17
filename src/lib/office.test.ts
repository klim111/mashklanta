import { describe, expect, it } from 'vitest';
import {
  ALL_TOOLS_OPEN,
  DEFAULT_OFFICE_TOOLS,
  MAX_PUBLIC_TOOLS,
  TOOL_MODULE_IDS,
  TOOL_PRESETS,
  clientToolAccess,
  normalizeOfficeProfile,
  normalizeOfficeTools,
  normalizeSlug,
  normalizeToolOverrides,
  presetMatching,
  slugProblem,
  suggestedSlug,
  toolOpenFor,
  toolPreset,
  whatsappHref,
} from './office';

describe('office tools', () => {
  it('defaults to what clients see today: everything open', () => {
    expect(presetMatching(DEFAULT_OFFICE_TOOLS.modes)).toBe('open');
    expect(clientToolAccess(DEFAULT_OFFICE_TOOLS, null)).toEqual(ALL_TOOLS_OPEN);
    expect(Object.values(ALL_TOOLS_OPEN).every(Boolean)).toBe(true);
  });

  it('falls back per tool when the stored modes are missing or invalid', () => {
    const tools = normalizeOfficeTools({ modes: { equity: 'hidden', refinance: 'bogus' } });
    expect(tools.modes.equity).toBe('hidden');
    expect(tools.modes.refinance).toBe('all');
    expect(normalizeOfficeTools(null)).toEqual(DEFAULT_OFFICE_TOOLS);
  });

  it('keeps only public tools that have a public page, without repeats, up to the limit', () => {
    const tools = normalizeOfficeTools({
      publicTools: ['cash-flow', 'refinance', 'refinance', 'learn', 'equity', 'feasibility', 'nope'],
    });
    expect(tools.publicTools).toEqual(['refinance', 'learn', 'equity']);
    expect(tools.publicTools.length).toBeLessThanOrEqual(MAX_PUBLIC_TOOLS);
  });

  it('combines the office mode with the per-client override', () => {
    expect(toolOpenFor('all', undefined)).toBe(true);
    expect(toolOpenFor('all', 'off')).toBe(false);
    expect(toolOpenFor('selected', undefined)).toBe(false);
    expect(toolOpenFor('selected', 'on')).toBe(true);
    // מוסתר נשאר מוסתר גם כשנפתח ללקוח
    expect(toolOpenFor('hidden', 'on')).toBe(false);
  });

  it('applies overrides for one client only', () => {
    const tools = { modes: toolPreset('full-service').modes, publicTools: [] };
    const access = clientToolAccess(tools, normalizeToolOverrides({ refinance: 'on', equity: 'maybe', bogus: 'on' }));
    expect(access.refinance).toBe(true);
    expect(access.equity).toBe(false);
    expect(TOOL_MODULE_IDS.filter((id) => access[id])).toEqual(['refinance']);
  });

  it('recognises each preset, and a custom mix as none', () => {
    for (const preset of TOOL_PRESETS) expect(presetMatching(preset.modes)).toBe(preset.id);
    expect(presetMatching({ ...toolPreset('open').modes, learn: 'hidden' })).toBeNull();
  });
});

describe('office link', () => {
  it('normalizes what the advisor typed', () => {
    expect(normalizeSlug('  Igor Lebed_Office!! ')).toBe('igor-lebed-office');
    expect(normalizeSlug('--a--b--')).toBe('a-b');
    expect(normalizeSlug(42)).toBe('');
  });

  it('explains what is wrong with a link', () => {
    expect(slugProblem('ab')).not.toBeNull();
    expect(slugProblem('admin')).not.toBeNull();
    expect(slugProblem('a'.repeat(31))).not.toBeNull();
    expect(slugProblem('igor-mortgages')).toBeNull();
  });

  it('suggests a link from the email, or a neutral one', () => {
    expect(suggestedSlug('Igor.Advisor@example.com', 'cuid123456')).toBe('igoradvisor');
    expect(suggestedSlug('ab@example.com', 'cuid123456')).toBe('office-123456');
    expect(suggestedSlug(null, 'cuidABCDEF')).toBe('office-abcdef');
  });
});

describe('office profile', () => {
  it('keeps only images uploaded to the platform', () => {
    const profile = normalizeOfficeProfile({
      logoUrl: 'https://evil.example.com/logo.png',
      photoUrl: '/api/site-images/abc123',
    });
    expect(profile.logoUrl).toBeNull();
    expect(profile.photoUrl).toBe('/api/site-images/abc123');
  });

  it('cleans text, services, contact details and colour', () => {
    const profile = normalizeOfficeProfile({
      advisorName: '  איגור   לבדינסקי ',
      services: ['א', '', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז'],
      email: 'not-an-email',
      phone: '050-123<script>4567',
      color: 'neon',
      about: 'שורה ראשונה\n\n\n\nשורה שנייה',
    });
    expect(profile.advisorName).toBe('איגור לבדינסקי');
    expect(profile.services).toEqual(['א', 'ב', 'ג', 'ד', 'ה', 'ו']);
    expect(profile.email).toBe('');
    expect(profile.phone).toBe('050-1234567');
    expect(profile.color).toBe('blue');
    expect(profile.about).toBe('שורה ראשונה\n\nשורה שנייה');
  });

  it('builds a WhatsApp link from an Israeli number', () => {
    expect(whatsappHref('050-123-4567')).toBe('https://wa.me/972501234567');
    expect(whatsappHref('123')).toBeNull();
  });
});
