import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  applyNormalizedAuthUrl,
  canonicalSiteOrigin,
  googleRedirectUri,
  normalizeAuthUrl,
  runtimeOrigin,
} from '../src/lib/auth-url';

/** כותרות בקשה מינימליות, כמו של Next.js */
function headers(values: Record<string, string>) {
  return { get: (name: string) => values[name.toLowerCase()] ?? null };
}

const AUTH_ENV = [
  'NEXTAUTH_URL',
  'NEXTAUTH_URL_INTERNAL',
  'NEXT_PUBLIC_APP_URL',
  'APP_URL',
  'VERCEL',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'AUTH_TRUST_HOST',
];

describe('auth-url', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of AUTH_ENV) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of AUTH_ENV) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  describe('normalizeAuthUrl', () => {
    it('מסיר מרכאות עוטפות שספק אחסון שומר כחלק מהערך', () => {
      expect(normalizeAuthUrl('"https://mashklanta.co.il"')).toBe('https://mashklanta.co.il');
      expect(normalizeAuthUrl("'https://mashklanta.co.il'")).toBe('https://mashklanta.co.il');
    });

    it('מסיר רווחים וסלאש בסוף', () => {
      expect(normalizeAuthUrl('  https://mashklanta.co.il/  ')).toBe('https://mashklanta.co.il');
    });

    it('מסיר נתיב שנוסף בטעות', () => {
      expect(normalizeAuthUrl('https://mashklanta.co.il/api/auth')).toBe('https://mashklanta.co.il');
    });

    it('משלים פרוטוקול כשנכתב רק הדומיין', () => {
      expect(normalizeAuthUrl('mashklanta.vercel.app')).toBe('https://mashklanta.vercel.app');
      expect(normalizeAuthUrl('localhost:3000')).toBe('http://localhost:3000');
    });

    it('שומר פורט ומחזיר null על ערך ריק או פסול', () => {
      expect(normalizeAuthUrl('http://localhost:3001')).toBe('http://localhost:3001');
      expect(normalizeAuthUrl('')).toBeNull();
      expect(normalizeAuthUrl('   ')).toBeNull();
      expect(normalizeAuthUrl(undefined)).toBeNull();
      expect(normalizeAuthUrl('https://')).toBeNull();
    });
  });

  describe('googleRedirectUri', () => {
    it('בונה את ה-URI שגוגל חייבת להכיר', () => {
      expect(googleRedirectUri('https://mashklanta.co.il')).toBe(
        'https://mashklanta.co.il/api/auth/callback/google'
      );
    });
  });

  describe('applyNormalizedAuthUrl', () => {
    it('כותב חזרה ערך נקי, כדי ש-NextAuth לא יבנה URI עם מרכאות', () => {
      process.env.NEXTAUTH_URL = '"https://mashklanta.co.il/"';
      expect(applyNormalizedAuthUrl()).toBe('https://mashklanta.co.il');
      expect(process.env.NEXTAUTH_URL).toBe('https://mashklanta.co.il');
    });

    it('לא נוגע בערך כשאין מה לנרמל', () => {
      delete process.env.NEXTAUTH_URL;
      expect(applyNormalizedAuthUrl()).toBeNull();
      expect(process.env.NEXTAUTH_URL).toBeUndefined();
    });
  });

  describe('canonicalSiteOrigin', () => {
    it('מעדיף את NEXTAUTH_URL', () => {
      process.env.NEXTAUTH_URL = 'https://mashklanta.co.il';
      process.env.APP_URL = 'https://other.example.com';
      expect(canonicalSiteOrigin()).toBe('https://mashklanta.co.il');
    });

    it('נופל לכתובת האפליקציה ואז לדומיין ה-Production של Vercel', () => {
      process.env.APP_URL = 'https://mashklanta.co.il';
      expect(canonicalSiteOrigin()).toBe('https://mashklanta.co.il');

      delete process.env.APP_URL;
      process.env.VERCEL_PROJECT_PRODUCTION_URL = 'mashklanta.vercel.app';
      expect(canonicalSiteOrigin()).toBe('https://mashklanta.vercel.app');
    });

    it('מחזיר null כשאין אף כתובת מוגדרת', () => {
      expect(canonicalSiteOrigin()).toBeNull();
    });
  });

  describe('runtimeOrigin', () => {
    it('ב-Vercel נגזר מהדומיין שממנו נטען העמוד — שם נוצר הפער מול גוגל', () => {
      process.env.VERCEL = '1';
      process.env.NEXTAUTH_URL = 'https://mashklanta.co.il';

      const origin = runtimeOrigin(
        headers({ 'x-forwarded-host': 'mashklanta-git-preview.vercel.app', 'x-forwarded-proto': 'https' })
      );

      expect(origin).toBe('https://mashklanta-git-preview.vercel.app');
      expect(origin).not.toBe(canonicalSiteOrigin());
    });

    it('בלי Vercel נגזר מ-NEXTAUTH_URL ולא מהכותרות', () => {
      process.env.NEXTAUTH_URL = 'https://mashklanta.co.il';
      expect(runtimeOrigin(headers({ host: 'internal-host:3000' }))).toBe('https://mashklanta.co.il');
    });

    it('בלי NEXTAUTH_URL נופל לברירת המחדל המקומית, כמו next-auth עצמו', () => {
      expect(runtimeOrigin(headers({ host: 'mashklanta.co.il' }))).toBe('http://localhost:3000');
    });
  });
});
