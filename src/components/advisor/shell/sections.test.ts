import { describe, expect, it } from 'vitest';
import { allowedLocation, locationFromName, locationFromParams, locationQuery, normalizeLocation } from './sections';

const params = (query: string) => new URLSearchParams(query);

describe('advisor navigation', () => {
  it('opens home by default', () => {
    expect(locationFromParams(params(''))).toEqual({ section: 'home', view: '' });
  });

  it('reads a section and a view, falling back to the section default view', () => {
    expect(locationFromParams(params('section=calendar&view=tasks'))).toEqual({ section: 'calendar', view: 'tasks' });
    expect(locationFromParams(params('section=calendar&view=nope'))).toEqual({ section: 'calendar', view: 'calendar' });
    expect(locationFromParams(params('section=nope'))).toEqual({ section: 'home', view: '' });
  });

  it('keeps every old tab link working', () => {
    expect(locationFromParams(params('tab=requests'))).toEqual({ section: 'inbox', view: '' });
    expect(locationFromParams(params('tab=clients'))).toEqual({ section: 'clients', view: '' });
    expect(locationFromParams(params('tab=calendar&client=abc'))).toEqual({ section: 'calendar', view: 'calendar' });
    expect(locationFromParams(params('tab=mixes'))).toEqual({ section: 'tools', view: 'mixes' });
    expect(locationFromParams(params('tab=payment-links'))).toEqual({ section: 'office', view: 'payment-links' });
    expect(locationFromParams(params('tab=site-visits'))).toEqual({ section: 'admin', view: 'visits' });
    expect(locationFromName('rate-requests')).toEqual({ section: 'tools', view: 'rate-requests' });
    expect(locationFromName('tools')).toEqual({ section: 'tools', view: 'tools' });
    expect(locationFromName('nope')).toBeNull();
  });

  it('writes short addresses: nothing for home, no view for the default one', () => {
    expect(locationQuery({ section: 'home', view: '' })).toBe('');
    expect(locationQuery(normalizeLocation('calendar'))).toBe('?section=calendar');
    expect(locationQuery({ section: 'calendar', view: 'tasks' })).toBe('?section=calendar&view=tasks');
  });

  it('shows platform management only to the platform admin', () => {
    const admin = { section: 'admin' as const, view: 'visits' };
    expect(allowedLocation(admin, true)).toEqual(admin);
    expect(allowedLocation(admin, false)).toEqual({ section: 'home', view: '' });
  });
});
