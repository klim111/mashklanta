'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BadgePercent,
  Building2,
  CalendarDays,
  CloudOff,
  Eye,
  FileSpreadsheet,
  Gavel,
  Layers,
  MapPin,
  PieChart,
  Printer,
  Trash2,
} from 'lucide-react';
import { formatRateRequestDate } from '@/components/mortgage-advisor/rateRequest/document';
import { printRateRequest } from '@/components/mortgage-advisor/rateRequest/letter';
import { downloadRateRequestXlsx } from '@/components/mortgage-advisor/rateRequest/excel';
import { RateRequestDialog } from '@/components/mortgage-advisor/rateRequest/RateRequestDialog';
import { useRateRequests } from '@/components/mortgage-advisor/rateRequest/useRateRequests';
import type { SavedRateRequest } from '@/components/mortgage-advisor/rateRequest/record';
import { BankQuoteDialog } from '@/components/mortgage-advisor/bankQuote/BankQuoteDialog';
import { formatQuoteDate } from '@/components/mortgage-advisor/bankQuote/quote';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import { stageMixForWorkspace } from '@/components/mortgage-advisor/workspace/draft';
import { formatShekel } from '@/components/mortgage-advisor/workspace/primitives';
import { formatDuration } from '@/components/mortgage-advisor/engine';
import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';

/**
 * התמהילים שהוגשו לבנקים למיקוח במכרז הריביות.
 *
 * כל בקשה נשמרת בלי ריביות — זה בדיוק מה שהבנק ממלא — ואפשר לפתוח אותה שוב
 * באותו נוסח ובאותו עיצוב, להוריד כ-PDF או כאקסל, ולהשוות מולה את ההצעות.
 */
export function BankRateRequests() {
  const router = useRouter();
  const { requests, ready, error, signedIn, remove } = useRateRequests();
  const { saved, save } = useSavedMixes();
  const [open, setOpen] = useState<SavedRateRequest | null>(null);
  const [quoteEntry, setQuoteEntry] = useState<SavedRateRequest | null>(null);

  const openMixInTool = (mix: WorkspaceMix) => {
    stageMixForWorkspace(mix);
    router.push('/mortgage-advisor');
  };

  /** ההצעות שכבר התקבלו על מבנה התמהיל שהוגש — לכל בנק ולכל סבב */
  const offersFor = (request: SavedRateRequest): SavedMix[] =>
    saved
      .filter(
        (item) =>
          item.mix.quote &&
          (item.mix.quote.requestId === request.id || item.mix.quote.sourceMixId === request.mix.id)
      )
      .sort(
        (a, b) =>
          new Date(b.mix.quote?.receivedAt ?? 0).getTime() -
          new Date(a.mix.quote?.receivedAt ?? 0).getTime()
      );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
            <Gavel className="h-5 w-5 text-amber-600" />
            תמהילים שהוגשו לבנקים
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
            כל תמהיל שנשלח למיקוח במכרז הריביות נשמר כאן כמכתב בקשה — עם לוח הסילוקין, סוג הריבית,
            התקופה, הסכום והאחוז של כל מסלול, ובלי הריביות, שאותן הבנקים ממלאים. אפשר לפתוח כל בקשה
            שוב באותו נוסח, ולהוריד אותה כ-PDF או כאקסל.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/mortgage-advisor">
            <PieChart className="ml-1 h-4 w-4" />
            לכלי בניית התמהילים
          </Link>
        </Button>
      </div>

      {!signedIn && ready && requests.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-[11px] leading-relaxed text-amber-800">
            הבקשות שמורות בדפדפן הזה בלבד ויעלו לחשבון בהתחברות הבאה.
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] font-semibold text-red-800">
          {error}
        </p>
      )}

      {!ready && <p className="py-10 text-center text-sm text-slate-500">טוען בקשות...</p>}

      {ready && requests.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="py-14 text-center">
            <Gavel className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-700">עוד לא הוגשה בקשת ריביות</h3>
            <p className="mb-5 mt-1 text-sm text-slate-500">
              בכלי בניית התמהילים, לחצו על &quot;הצעה לבנקים&quot; בכרטיסייה או בשורה של התמהיל,
              ושמרו את הבקשה כאן.
            </p>
            <Button asChild>
              <Link href="/mortgage-advisor">פתחו את כלי בניית התמהילים</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {ready && requests.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {requests.map((item) => (
            <RequestCard
              key={item.id}
              item={item}
              offers={offersFor(item)}
              onView={() => setOpen(item)}
              onPrint={() => printRateRequest(item.document)}
              onExcel={() => downloadRateRequestXlsx(item.document)}
              onOpenInTool={() => openMixInTool(item.mix)}
              onEnterQuote={() => setQuoteEntry(item)}
              onOpenOffer={(offer) => openMixInTool(offer.mix)}
              onDelete={() => remove(item.id)}
            />
          ))}
        </div>
      )}

      {quoteEntry && (
        <BankQuoteDialog
          open
          onOpenChange={(next) => !next && setQuoteEntry(null)}
          mix={quoteEntry.mix}
          requestId={quoteEntry.id}
          takenNames={saved.map((item) => item.mix.name)}
          onSave={async (quoted) => {
            await save(quoted);
          }}
          onOpenSaved={openMixInTool}
        />
      )}

      {open && (
        <RateRequestDialog
          open
          onOpenChange={(next) => !next && setOpen(null)}
          mix={open.mix}
          existing={{
            id: open.id,
            reference: open.reference,
            createdAt: open.createdAt,
            details: open.details,
          }}
        />
      )}
    </div>
  );
}

function RequestCard({
  item,
  offers,
  onView,
  onPrint,
  onExcel,
  onOpenInTool,
  onEnterQuote,
  onOpenOffer,
  onDelete,
}: {
  item: SavedRateRequest;
  offers: SavedMix[];
  onView: () => void;
  onPrint: () => void;
  onExcel: () => void;
  onOpenInTool: () => void;
  onEnterQuote: () => void;
  onOpenOffer: (offer: SavedMix) => void;
  onDelete: () => void;
}) {
  const doc = item.document;

  return (
    <Card className="border-slate-200 shadow-sm transition-colors hover:border-amber-300">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-slate-900">{doc.mixName}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                נוצרה ב-{formatRateRequestDate(item.createdAt)}
              </span>
              <span>· אסמכתה {doc.reference}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onDelete}
            title="מחיקת הבקשה"
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge className="bg-amber-100 text-[10px] text-amber-900 hover:bg-amber-100">
            <Building2 className="ml-1 h-3 w-3" />
            {doc.details.bankName ? `בנק ${doc.details.bankName}` : 'ללא ציון בנק'}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            <Layers className="ml-1 h-3 w-3" />
            {doc.lines.length} מסלולים
          </Badge>
          {doc.periodLabel && (
            <Badge variant="secondary" className="text-[10px]">
              {doc.periodLabel}
            </Badge>
          )}
          {doc.propertyAddress && (
            <Badge variant="secondary" className="max-w-[14rem] truncate text-[10px]">
              <MapPin className="ml-1 h-3 w-3" />
              {doc.propertyAddress}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Fact label="סכום המשכנתא" value={formatShekel(doc.totalAmount)} />
          <Fact
            label="התקופה בתמהיל"
            value={doc.months > 0 ? formatDuration(doc.months) : '—'}
          />
          <Fact
            label={offers.length > 0 ? 'הצעות שהתקבלו' : 'ריביות במסמך'}
            value={
              offers.length > 0
                ? `${offers.length} הצעות מבנקים`
                : 'ריקות לתמחור הבנק'
            }
            tone={offers.length > 0 ? 'emerald' : 'amber'}
          />
        </div>

        {offers.length > 0 && (
          <div className="space-y-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2">
            <p className="flex items-center gap-1 text-[10px] font-bold text-emerald-900">
              <BadgePercent className="h-3 w-3" />
              הריביות שהתקבלו על התמהיל הזה
            </p>
            {offers.map((offer) => (
              <button
                key={offer.mix.id}
                type="button"
                onClick={() => onOpenOffer(offer)}
                title="פתיחת ההצעה בכלי בניית התמהילים"
                className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-right text-[11px] transition-colors hover:border-emerald-400"
              >
                <span className="font-bold text-emerald-900">
                  בנק {offer.mix.quote?.bank}
                  <span className="mr-1.5 font-normal text-slate-500">
                    {formatQuoteDate(offer.mix.quote?.receivedAt ?? offer.savedAt)}
                  </span>
                </span>
                <span className="font-semibold text-slate-700">
                  {formatShekel(offer.summary.monthlyPayment)} לחודש ·{' '}
                  {offer.summary.averageRate.toFixed(2)}% ממוצע
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="h-9 flex-1 text-xs sm:flex-none" onClick={onView}>
            <Eye className="ml-1 h-3.5 w-3.5" />
            פתיחת המכתב
          </Button>
          <Button
            size="sm"
            className="h-9 flex-1 bg-emerald-600 text-xs hover:bg-emerald-700 sm:flex-none"
            onClick={onEnterQuote}
          >
            <BadgePercent className="ml-1 h-3.5 w-3.5" />
            הזנת ריביות שהתקבלו
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 flex-1 text-xs sm:flex-none"
            onClick={onPrint}
          >
            <Printer className="ml-1 h-3.5 w-3.5" />
            PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 flex-1 text-xs sm:flex-none"
            onClick={onExcel}
          >
            <FileSpreadsheet className="ml-1 h-3.5 w-3.5" />
            אקסל
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-9 flex-1 text-xs sm:flex-none"
            onClick={onOpenInTool}
          >
            <PieChart className="ml-1 h-3.5 w-3.5" />
            פתיחת התמהיל בכלי
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Fact({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'amber' | 'emerald';
}) {
  const tones = {
    slate: { box: 'border-slate-200 bg-slate-50/70', text: 'text-slate-900' },
    amber: { box: 'border-amber-200 bg-amber-50', text: 'text-amber-800' },
    emerald: { box: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-800' },
  }[tone];

  return (
    <div className={`rounded-xl border p-2 ${tones.box}`}>
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className={`text-sm font-bold leading-tight ${tones.text}`}>{value}</p>
    </div>
  );
}
