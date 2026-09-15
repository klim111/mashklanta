import { describe, expect, it } from 'vitest';
import {
  curveForMonth,
  fallbackMarketRates,
  latestCurve,
  latestObservation,
  observationMonth,
  parseCsv,
  parseMaturityYears,
  previousMonthKey,
  zcmObservations,
} from './market-rates';
import { INTEREST_RATES } from './interest-rates';
import { PRIME_OVER_BOI } from './prime-forward-curve';

const ZCM_HEADER = 'SERIES_CODE,DATA_TYPE,NOMINAL_REAL,TIME_TO_MATURITY,TIME_PERIOD,OBS_VALUE';

function zcmRow(maturity: string, period: string, value: string, nominalReal: 'N' | 'R' = 'N') {
  const code = nominalReal === 'N' ? `ZND.${maturity}` : `ZRD.${maturity}`;
  return `${code},ZC_YTM,${nominalReal},${maturity},${period},${value}`;
}

describe('פענוח ה-CSV של בנק ישראל', () => {
  it('מכבד שדות במרכאות שמכילים פסיק, ולא מזיז את העמודות', () => {
    const csv = 'SERIES_CODE,TITLE,OBS_VALUE\nZND.Y02,"תשואה, אפס, שנתיים",3.4';
    expect(parseCsv(csv)).toEqual([
      { SERIES_CODE: 'ZND.Y02', TITLE: 'תשואה, אפס, שנתיים', OBS_VALUE: '3.4' },
    ]);
  });

  it('מדלג על שורות ריקות ועל שורת סיום', () => {
    const csv = 'A,B\n1,2\n\n3,4\n';
    expect(parseCsv(csv)).toHaveLength(2);
  });

  it('גוזר שנים לפדיון מקוד הסדרה', () => {
    expect(parseMaturityYears('Y02')).toBe(2);
    expect(parseMaturityYears('ZND.Y10')).toBe(10);
    expect(parseMaturityYears('ללא')).toBeNull();
  });

  it('גוזר את חודש התצפית מכל תאריך', () => {
    expect(observationMonth('2026-08-31')).toBe('2026-08');
    expect(observationMonth('2026-08')).toBe('2026-08');
    expect(observationMonth('')).toBe('');
  });
});

describe('החודש הקודם ביחס לחודש החישוב', () => {
  it('מחזיר את החודש שקדם, כולל מעבר שנה', () => {
    expect(previousMonthKey(new Date('2026-09-11T00:00:00Z'))).toBe('2026-08');
    expect(previousMonthKey(new Date('2026-01-02T00:00:00Z'))).toBe('2025-12');
  });
});

describe('עקום האפס לחודש הקודם', () => {
  const csv = [
    ZCM_HEADER,
    zcmRow('Y02', '2026-07-30', '3.00'),
    zcmRow('Y05', '2026-07-30', '3.40'),
    zcmRow('Y10', '2026-07-30', '3.90'),
    zcmRow('Y02', '2026-08-03', '3.20'),
    zcmRow('Y05', '2026-08-03', '3.50'),
    zcmRow('Y10', '2026-08-03', '4.00'),
    zcmRow('Y02', '2026-08-31', '3.40'),
    zcmRow('Y05', '2026-08-31', '3.60'),
    zcmRow('Y10', '2026-08-31', '4.10'),
    zcmRow('Y02', '2026-09-10', '9.99'),
  ].join('\n');

  const observations = zcmObservations(csv, 'N');

  it('ממצע את כל תצפיות החודש המבוקש לכל טווח פדיון', () => {
    const curve = curveForMonth(observations, '2026-08');
    expect(curve?.month).toBe('2026-08');
    expect(curve?.asOf).toBe('2026-08-31');
    expect(curve?.spots).toEqual([
      { years: 2, yieldPct: 3.3 },
      { years: 5, yieldPct: 3.55 },
      { years: 10, yieldPct: 4.05 },
    ]);
  });

  it('אינו מערבב לתוך החודש הקודם תצפיות של החודש הנוכחי', () => {
    const curve = curveForMonth(observations, '2026-08');
    expect(curve?.spots.find((spot) => spot.years === 2)?.yieldPct).toBeCloseTo(3.3, 10);
  });

  it('נופל לחודש המלא האחרון כשהחודש המבוקש עוד לא פורסם', () => {
    const curve = curveForMonth(observations, '2026-12');
    expect(curve?.month).toBe('2026-09');
  });

  it('מחזיר את תצפית היום האחרון בלבד לצורכי פורוורד', () => {
    const nominalOnly = zcmObservations(
      [ZCM_HEADER, zcmRow('Y02', '2026-08-03', '3.20'), zcmRow('Y05', '2026-08-31', '3.60')].join('\n'),
      'N'
    );
    expect(latestCurve(nominalOnly)?.asOf).toBe('2026-08-31');
    expect(latestCurve(nominalOnly)?.spots).toEqual([{ years: 5, yieldPct: 3.6 }]);
  });

  it('מפריד בין העקום הנומינלי לריאלי', () => {
    const mixed = [
      ZCM_HEADER,
      zcmRow('Y05', '2026-08-31', '3.60', 'N'),
      zcmRow('Y05', '2026-08-31', '1.40', 'R'),
    ].join('\n');
    expect(zcmObservations(mixed, 'N').map((o) => o.yieldPct)).toEqual([3.6]);
    expect(zcmObservations(mixed, 'R').map((o) => o.yieldPct)).toEqual([1.4]);
  });

  it('מקבל תשואה ריאלית שלילית ופוסל תשואה נומינלית שלילית', () => {
    const csvNegative = [
      ZCM_HEADER,
      zcmRow('Y02', '2026-08-31', '-0.40', 'R'),
      zcmRow('Y02', '2026-08-31', '-0.40', 'N'),
    ].join('\n');
    expect(zcmObservations(csvNegative, 'R')).toHaveLength(1);
    expect(zcmObservations(csvNegative, 'N')).toHaveLength(0);
  });
});

describe('ריבית בנק ישראל', () => {
  it('לוקחת את התצפית האחרונה לפי תאריך ולא לפי סדר השורות', () => {
    const rows = parseCsv(
      ['TIME_PERIOD,OBS_VALUE', '2026-08-25,4.50', '2026-01-01,4.75'].join('\n')
    );
    expect(latestObservation(rows)).toEqual({ value: 4.5, asOf: '2026-08-25', ambiguous: false });
  });

  it('מקבלת ריבית אפס, שהיא ערך תקין במשק', () => {
    const rows = parseCsv(['TIME_PERIOD,OBS_VALUE', '2021-01-01,0'].join('\n'));
    expect(latestObservation(rows)?.value).toBe(0);
  });

  it('מחזירה null כשאין תצפית מספרית', () => {
    expect(latestObservation(parseCsv('TIME_PERIOD,OBS_VALUE\n2026-08-25,'))).toBeNull();
  });

  it('בוחרת דטרמיניסטית ומסמנת כשיש כמה סדרות לאותו תאריך', () => {
    const rows = parseCsv(
      [
        'SERIES_CODE,TIME_PERIOD,OBS_VALUE',
        'BR.B,2026-08-25,3.10',
        'BR.A,2026-08-25,4.50',
      ].join('\n')
    );
    // הסדרה נבחרת לפי הקוד ולא לפי סדר השורות, כדי שאותו קלט ייתן אותה תשובה
    expect(latestObservation(rows)).toEqual({ value: 4.5, asOf: '2026-08-25', ambiguous: true });
  });

  it('אינה מסמנת אי-ודאות כששתי הסדרות מסכימות', () => {
    const rows = parseCsv(
      ['SERIES_CODE,TIME_PERIOD,OBS_VALUE', 'BR.A,2026-08-25,4.50', 'BR.B,2026-08-25,4.50'].join('\n')
    );
    expect(latestObservation(rows)?.ambiguous).toBe(false);
  });
});

describe('זיהוי סדרות עקום האפס', () => {
  it('נשען על ממד NOMINAL_REAL גם כשקוד הסדרה לא מוכר', () => {
    const csv = [
      'SERIES_CODE,DATA_TYPE,NOMINAL_REAL,TIME_TO_MATURITY,TIME_PERIOD,OBS_VALUE',
      'NEWCODE.X,ZC_YTM,N,Y05,2026-08-31,3.60',
      'NEWCODE.X,ZC_YTM,R,Y05,2026-08-31,1.40',
    ].join('\n');
    // שינוי מוסכמת השמות בבנק ישראל לא אמור להפיל את העוגנים לערכי נפילה
    expect(zcmObservations(csv, 'N').map((o) => o.yieldPct)).toEqual([3.6]);
    expect(zcmObservations(csv, 'R').map((o) => o.yieldPct)).toEqual([1.4]);
  });

  it('מתרגמת טווח שמקודד בחודשים לשנים', () => {
    expect(parseMaturityYears('M24')).toBeCloseTo(2, 10);
    expect(parseMaturityYears('M06')).toBeCloseTo(0.5, 10);
    expect(parseMaturityYears('Y10')).toBe(10);
  });
});

describe('תצלום הנפילה', () => {
  const snapshot = fallbackMarketRates(new Date('2026-09-11T00:00:00Z'));

  it('מסומן במפורש כלא-חי, כדי שה-UI לא יציג אותו כנתון של בנק ישראל', () => {
    expect(snapshot.source).toBe('fallback');
    expect(snapshot.boiRateSource).toBe('fallback');
  });

  it('שומר על הזהות פריים = ריבית בנק ישראל + 1.5%', () => {
    expect(snapshot.primeRate).toBeCloseTo(snapshot.boiRate + PRIME_OVER_BOI, 10);
    expect(snapshot.primeRate).toBeCloseTo(INTEREST_RATES.prime, 10);
  });

  it('מספק עקום ריאלי נגזר, כדי שגם מסלולים צמודים יקבלו עוגן בלי רשת', () => {
    expect(snapshot.realCurve.spots.length).toBeGreaterThanOrEqual(3);
    snapshot.realCurve.spots.forEach((spot) => {
      const nominal = snapshot.nominalCurve.spots.find((n) => n.years === spot.years);
      expect(nominal!.yieldPct).toBeGreaterThan(spot.yieldPct);
    });
  });
});
