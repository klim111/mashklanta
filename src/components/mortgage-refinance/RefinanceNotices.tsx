'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft, Info, Sparkles, TrendingDown } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import type { MarketRateFinding, MarketRates } from '@/lib/refinance';
import { totalPotentialSaving } from '@/lib/refinance';

/**
 * ההתרעות של כלי המיחזור, בעיצוב של כלי תכנון המשכנתאות: מסגרת צבעונית רכה,
 * כותרת קצרה, הסבר, ופעולה אחת. ההתרעות לעולם אינן חוסמות — הן מסמנות הזדמנות
 * או מחיר, והלקוח ממשיך לעבוד.
 */

type NoticeTone = 'opportunity' | 'warning' | 'info';

const TONES: Record<NoticeTone, { wrap: string; title: string; body: string; icon: string }> = {
  opportunity: {
    wrap: 'bg-orange-50 border-orange-200',
    title: 'text-orange-800',
    body: 'text-orange-700',
    icon: 'text-orange-500',
  },
  warning: {
    wrap: 'bg-red-50 border-red-200',
    title: 'text-red-800',
    body: 'text-red-700',
    icon: 'text-red-500',
  },
  info: {
    wrap: 'bg-blue-50 border-blue-200',
    title: 'text-blue-800',
    body: 'text-blue-700',
    icon: 'text-blue-500',
  },
};

export function RefinanceNotice({
  tone = 'opportunity',
  icon: Icon = AlertTriangle,
  title,
  children,
  action,
}: {
  tone?: NoticeTone;
  icon?: React.ElementType;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const palette = TONES[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-lg border p-4 ${palette.wrap}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${palette.icon}`} />
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm mb-1 ${palette.title}`}>{title}</p>
          <div className={`text-sm leading-relaxed ${palette.body}`}>{children}</div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * ההתרעה על ריבית גבוהה מהממוצע בשוק. לא חוסמת — אבל מוצגת בגדול, כי זה בדיוק
 * הרגע שבו יש ללקוח מה להרוויח מהמיחזור.
 */
export function MarketRateNotice({
  findings,
  market,
}: {
  findings: MarketRateFinding[];
  market: MarketRates;
}) {
  if (findings.length === 0) return null;

  const saving = totalPotentialSaving(findings);
  const asOf = market.asOf ? new Date(market.asOf) : null;
  const asOfLabel =
    asOf && !Number.isNaN(asOf.getTime()) ? asOf.toLocaleDateString('he-IL') : null;

  return (
    <RefinanceNotice
      tone="opportunity"
      icon={TrendingDown}
      title={
        findings.length === 1
          ? 'יש מקום לשיפור בריבית של אחד המסלולים'
          : `יש מקום לשיפור בריביות של ${findings.length} מסלולים`
      }
    >
      <p className="mb-2">
        הריבית שהוזנה גבוהה מהריבית הממוצעת במשק לאותו סוג מסלול, לפי נתוני בנק ישראל
        {asOfLabel ? ` (נכון ל-${asOfLabel})` : ''}. זהו פוטנציאל חיסכון אמיתי במיחזור.
      </p>

      <ul className="space-y-1 mb-2">
        {findings.map((finding) => (
          <li key={finding.track.id} className="text-xs">
            <span className="font-semibold">{finding.track.name}</span> —{' '}
            {formatPercentage(finding.track.interestRate)} מול ממוצע של{' '}
            {formatPercentage(finding.marketRate)} (פער של {finding.gap.toFixed(2)} נק׳ אחוז)
            {finding.potentialSaving > 1 && (
              <> · חיסכון פוטנציאלי בריבית: {formatCurrency(finding.potentialSaving)}</>
            )}
          </li>
        ))}
      </ul>

      {saving > 1 && (
        <p className="font-semibold">
          סך פוטנציאל החיסכון בריבית עד סוף המשכנתא: {formatCurrency(saving)}
        </p>
      )}
    </RefinanceNotice>
  );
}

/** הריבית שהוזנה גבוהה מהריבית הקיימת — מיחזור כזה מרע את התנאים */
export function RateWorsenedNotice({
  trackName,
  baseRate,
  nextRate,
}: {
  trackName: string;
  baseRate: number;
  nextRate: number;
}) {
  return (
    <RefinanceNotice tone="warning" title="הריבית שהוזנה גבוהה מהריבית הקיימת">
      במסלול <span className="font-semibold">{trackName}</span> הוזנה ריבית של{' '}
      {formatPercentage(nextRate)} לעומת {formatPercentage(baseRate)} היום. מיחזור בריבית כזו גורע
      מתנאי המשכנתא ומייקר את סך הריבית.
    </RefinanceNotice>
  );
}

/** הזמנה להרשמה — הכלי המלא פתוח למשתמשים רשומים */
export function RegistrationInvite({ compact = false }: { compact?: boolean }) {
  return (
    <RefinanceNotice
      tone="info"
      icon={Sparkles}
      title="הכלי המלא פתוח לחשבון חינמי"
      action={
        <div className="flex flex-wrap gap-2">
          <Link href="/auth/register">
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              פתיחת חשבון חינם
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="sm" variant="outline">
              כבר יש לי חשבון
            </Button>
          </Link>
        </div>
      }
    >
      {compact ? (
        <p>הרשמה פותחת שינוי חופשי של כל המסלולים, שמירת התמהיל והשוואה בין חלופות מיחזור.</p>
      ) : (
        <p>
          בתצוגה הפתוחה אפשר לבדוק שינוי אחד. בחשבון חינמי אפשר להזיז כל סליידר, לשנות כל ריבית
          ותקופה בכל המסלולים, לשמור את חלופות המיחזור ולחזור אליהן מהאזור האישי.
        </p>
      )}
    </RefinanceNotice>
  );
}

export { Info };
