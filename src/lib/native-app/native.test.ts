// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { routeFor } from './native';

// jsdom: האתר "נמצא" ב-http://localhost:3000/dashboard
describe('ניתוב קישורים באפליקציה לנייד', () => {
  it('קובץ שנוצר בדפדפן נפתח בטלפון, עם השם שבקישור', () => {
    expect(routeFor('blob:http://localhost:3000/abc', { download: 'דוח.pdf' })).toEqual({
      kind: 'file',
      url: 'blob:http://localhost:3000/abc',
      name: 'דוח.pdf',
    });
  });

  it('מסמך מהשרת נפתח כקובץ, גם בלי download', () => {
    expect(routeFor('/api/plans/p1/documents/d1/content', { newWindow: true })).toMatchObject({ kind: 'file' });
  });

  it('עמוד באתר "בכרטיסייה חדשה" נפתח באותו מסך', () => {
    expect(routeFor('/meeting/m1', { newWindow: true })).toEqual({ kind: 'here', url: 'http://localhost:3000/meeting/m1' });
  });

  it('קישור רגיל באתר נשאר כמו שהוא', () => {
    expect(routeFor('/dashboard/mix-planner', {})).toBeNull();
  });

  it('אתר חיצוני נפתח בדפדפן, חוץ מעמוד התשלום', () => {
    expect(routeFor('https://www.boi.org.il/', { newWindow: true })).toEqual({ kind: 'external', url: 'https://www.boi.org.il/' });
    expect(routeFor('https://pay.hyp.co.il/p/?action=pay', {})).toBeNull();
  });

  it('טלפון ומייל נשארים למערכת', () => {
    expect(routeFor('tel:0508822207', {})).toBeNull();
    expect(routeFor('mailto:info@mashkalanta.com', {})).toBeNull();
  });
});
