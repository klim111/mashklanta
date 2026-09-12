'use client';

import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import {
  expectedInflationPath,
  fallbackInflationForecast,
  yearlyInflationExpectations,
  yearlyInflationRates,
  type InflationForecast,
} from '@/lib/inflation-forecast';
import { usesInflationForecast } from '../engine';
import type { Assumptions } from '../engine';

interface InflationForecastChartProps {
  assumptions?: Assumptions;
  forecast?: InflationForecast;
  years: number;
  height?: number;
}

/**
 * גרף תחזית האינפלציה שממנה מחושבת ההצמדה במסלול צמוד מדד.
 * כשיש תרחיש עם אינפלציה קבועה — מוצג קו אופקי במקום נתיב בנק ישראל.
 */
export function InflationForecastChart({
  assumptions,
  forecast,
  years,
  height = 200,
}: InflationForecastChartProps) {
  const resolved = forecast ?? assumptions?.inflationForecast ?? fallbackInflationForecast();
  const useForecast = assumptions ? usesInflationForecast(assumptions) : true;
  const constantPct = assumptions && !useForecast ? assumptions.annualInflation : undefined;

  /**
   * שתי סדרות, ושתיהן נגזרות מאותן סדרות של בנק ישראל:
   *
   * `expected` — ציפיית בנק ישראל לאותו אופק (ברק-איבן לפי פישר בין העקום
   *   הנומינלי לצמוד). זה המספר שבנק ישראל מפרסם, ולכן זו הסדרה שאפשר להשוות
   *   אליו ישירות.
   * `annual` — האינפלציה הצפויה בשנה עצמה (פורוורד מתוך אותו עקום ציפיות).
   *   זו הסדרה שמצמידה בפועל את הקרן בלוח הסילוקין.
   *
   * בעבר הוצגה רק השנייה תחת הכותרת "תחזית בנק ישראל", ולכן המספרים בגרף לא
   * הסתדרו עם הפרסום של בנק ישראל.
   */
  const data = useMemo(() => {
    if (typeof constantPct === 'number') {
      const count = Math.max(1, Math.round(years));
      return Array.from({ length: count }, (_, i) => ({
        year: i + 1,
        expected: constantPct,
        annual: constantPct,
      }));
    }
    const expected = yearlyInflationExpectations(resolved.spots, years);
    const annual = yearlyInflationRates(expectedInflationPath(resolved.spots), years);
    return expected.map((point, index) => ({
      year: point.year,
      expected: point.rate,
      annual: annual[index]?.rate ?? point.rate,
    }));
  }, [constantPct, resolved.spots, years]);

  if (years <= 0 || data.length < 2) return null;

  const rates = data.flatMap((row) => [row.expected, row.annual]);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const pad = Math.max(0.15, (max - min) * 0.25 || 0.25);

  const sourceLabel =
    resolved.source === 'boi' && resolved.asOf
      ? `עודכן ${resolved.asOf}`
      : 'לפי תחזית חטיבת המחקר ויעד האינפלציה';

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3">
      <p className="text-sm font-semibold text-violet-950 flex items-center gap-1.5">
        <TrendingUp className="h-4 w-4 text-violet-600" />
        תחזית אינפלציה — בנק ישראל
      </p>
      <p className="text-[11px] text-violet-900/80 mb-2 leading-snug">
        {typeof constantPct === 'number' ? (
          <>תרחיש פעיל: אינפלציה שנתית קבועה של {constantPct.toFixed(2)}%, במקום נתיב הציפיות של בנק ישראל.</>
        ) : (
          <>
            ציפיות האינפלציה של בנק ישראל לכל אופק, נגזרות לפי נוסחת פישר מהפער בין העקום
            הנומינלי לעקום הצמוד. הקו המקווקו הוא האינפלציה הצפויה בשנה עצמה (פורוורד מאותן
            ציפיות) — והוא זה שמצמיד את הקרן בלוח הסילוקין. {sourceLabel}.
          </>
        )}
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd6fe" />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#6d28d9' }} />
          <YAxis
            tick={{ fontSize: 10, fill: '#6d28d9' }}
            tickFormatter={(v) => `${Number(v).toFixed(2)}%`}
            domain={[Math.floor((min - pad) * 20) / 20, Math.ceil((max + pad) * 20) / 20]}
            width={48}
          />
          <Tooltip
            formatter={(value) => `${Number(value).toFixed(2)}%`}
            labelFormatter={(label) => `שנה ${label}`}
            contentStyle={{ fontSize: 12, direction: 'rtl' }}
          />
          {typeof constantPct !== 'number' && <Legend wrapperStyle={{ fontSize: 11 }} />}
          <Line
            type={typeof constantPct === 'number' ? 'stepAfter' : 'monotone'}
            dataKey="expected"
            name="ציפיות בנק ישראל לאופק"
            stroke="#7c3aed"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          {typeof constantPct !== 'number' && (
            <Line
              type="monotone"
              dataKey="annual"
              name="אינפלציה צפויה בשנה עצמה"
              stroke="#a78bfa"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
