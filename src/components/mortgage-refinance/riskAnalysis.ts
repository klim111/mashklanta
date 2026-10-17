import type { MortgageTrack } from '@/components/mortgage-advisor/types';
import { isIndexLinked, isRateVariable } from '@/components/mortgage-advisor/scenarioCalculations';

export type RiskLevel = 'stable' | 'low' | 'medium' | 'high' | 'highest';

export const RISK_META: Record<RiskLevel, { label: string; text: string; bg: string; bar: string }> = {
  stable: { label: 'יציב', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', bar: '#10b981' },
  low: { label: 'תנודתיות נמוכה', text: 'text-lime-700', bg: 'bg-lime-50 border-lime-200', bar: '#84cc16' },
  medium: { label: 'תנודתיות בינונית', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', bar: '#f59e0b' },
  high: { label: 'תנודתיות גבוהה', text: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', bar: '#f97316' },
  highest: { label: 'תנודתיות מרבית', text: 'text-red-700', bg: 'bg-red-50 border-red-200', bar: '#ef4444' },
};

export interface TrackRisk {
  score: number; // 0-100
  level: RiskLevel;
  description: string;
  stationNote?: string;
}

/** פרופיל סיכון/תנודתיות למסלול בודד, כולל הסבר מילולי והערת תחנת יציאה. */
export function trackRiskProfile(track: MortgageTrack): TrackRisk {
  const period = track.variablePeriod ?? 5;

  switch (track.type) {
    case 'fixed_unlinked':
      return {
        score: 0,
        level: 'stable',
        description:
          'מסלול יציב לחלוטין — תנודתיות אפס. ההחזר קבוע לאורך כל התקופה ואינו משתנה לעולם, אך מגלם ריבית גבוהה יותר (זוהי עלות היציבות).',
      };
    case 'grant':
    case 'eligibility':
    case 'five_year_plan':
      return {
        score: 0,
        level: 'stable',
        description: 'מסלול יציב — תנודתיות אפס, אינו חשוף לשינויי ריבית או מדד.',
      };
    case 'prime':
      return {
        score: 75,
        level: 'high',
        description: 'ריבית פריים — נעה עם ריבית בנק ישראל ומוסיפה תנודתיות גבוהה להחזר החודשי.',
        stationNote: 'ניתן לפרוע בכל עת ללא עמלת פירעון מוקדם.',
      };
    case 'variable_linked':
      return {
        score: 92,
        level: 'highest',
        description:
          'משתנה צמודה למדד — משלבת תנודתיות ריבית יחד עם הצמדה למדד, ולכן תורמת לתנודתיות המרבית בהחזר החודשי ובקצב החזר הקרן.',
        stationNote: `תחנת יציאה ללא קנס כל ${period} שנים, במועד עדכון הריבית.`,
      };
    case 'fixed_linked':
      return {
        score: 66,
        level: 'high',
        description:
          'קבועה צמודה למדד — הריבית קבועה אך הקרן וההחזר גדלים עם עליית המדד; תורמת לתנודתיות גבוהה בקצב החזר הקרן.',
      };
    case 'variable_unlinked': {
      // תנודתיות קלה עד בינונית, גדלה ככל שעדכון הריבית תכוף יותר
      const score = Math.round(Math.min(60, Math.max(30, 30 + (5 - Math.min(period, 5)) * 7)));
      const level: RiskLevel = score >= 48 ? 'medium' : 'low';
      return {
        score,
        level,
        description: `ריבית משתנה לא צמודה — מתעדכנת כל ${period} שנים; תנודתיות קלה עד בינונית, הגדלה ככל שעדכון הריבית תכוף יותר.`,
        stationNote: `תחנת יציאה ללא קנס כל ${period} שנים, במועד עדכון הריבית.`,
      };
    }
    case 'makam':
      return {
        score: 55,
        level: 'medium',
        description: 'מק"מ — מכשיר קצר מועד עם תנודתיות בינונית עד גבוהה.',
        stationNote: 'נקודות יציאה תכופות, בדרך כלל ללא קנס פירעון מוקדם.',
      };
    case 'dollar':
    case 'euro':
      return {
        score: 85,
        level: 'highest',
        description: 'מסלול מטבע חוץ — חשוף לתנודות שער החליפין ולכן תנודתיות גבוהה מאוד.',
      };
    default: {
      const variable = isRateVariable(track.type);
      const linked = isIndexLinked(track.type);
      return {
        score: variable ? 60 : linked ? 65 : 20,
        level: variable || linked ? 'high' : 'low',
        description: 'מסלול עם תנודתיות בהתאם לתנאי הריבית וההצמדה.',
      };
    }
  }
}

/** ציון סיכון ממוצע משוקלל לפי סכום, עבור התמהיל כולו (0-100). */
export function mixRiskScore(tracks: MortgageTrack[]): number {
  const total = tracks.reduce((s, t) => s + t.amount, 0);
  if (total <= 0) return 0;
  return tracks.reduce((s, t) => s + trackRiskProfile(t).score * t.amount, 0) / total;
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score < 15) return 'stable';
  if (score < 40) return 'low';
  if (score < 60) return 'medium';
  if (score < 80) return 'high';
  return 'highest';
}

export interface BandPoint {
  year: number;
  expected: number;
  low: number;
  band: number; // high - low (להצגה כשכבה מוערמת מעל low)
}

/**
 * טווח תנודתיות משוער של ההחזר החודשי לאורך זמן.
 * הטווח מתרחב עם הזמן ומתעצם ככל שציון הסיכון של התמהיל גבוה יותר.
 */
export function volatilityBand(
  payments: { year: number; payment: number }[],
  mixRisk: number
): BandPoint[] {
  const volFactor = (mixRisk / 100) * 0.5; // עד ±50% בקצה התקופה בסיכון מרבי
  const maxYear = payments.length > 0 ? payments[payments.length - 1].year : 1;
  return payments.map((p) => {
    const t = maxYear > 0 ? p.year / maxYear : 0;
    const half = p.payment * volFactor * t;
    const low = Math.max(0, p.payment - half);
    return {
      year: p.year,
      expected: Math.round(p.payment),
      low: Math.round(low),
      band: Math.round(2 * half),
    };
  });
}

export interface SavingsRiskPoint {
  name: string;
  risk: number;
  rate: number;
  amount: number;
}

export function savingsRiskPoints(tracks: MortgageTrack[]): SavingsRiskPoint[] {
  return tracks.map((t) => ({
    name: t.name,
    risk: trackRiskProfile(t).score,
    rate: t.interestRate,
    amount: t.amount,
  }));
}
