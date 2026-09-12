'use client';

import React from 'react';
import { ArrowLeft, Handshake, Sparkles, Wrench } from 'lucide-react';
import { ADVISOR_STAGE_PRICE, formatOrderPrice } from '@/lib/advisor-orders';

/**
 * הבחירה שפותחת את שלב התמחור: יועץ או לבד.
 *
 * זה כל מה שמוצג במסך בשלב הזה. השלב עצמו נראה אחרת לגמרי בכל אחת משתי
 * הדרכים — מי מזין את הריביות, מי מדבר עם הבנקים, ומה הלקוח רואה — ולכן אין
 * טעם להציג תחתיה כלים שאולי לא יהיו רלוונטיים בכלל.
 */
export function AuctionModeChoice({
  onChooseAdvisor,
  onChooseSelf,
}: {
  onChooseAdvisor: () => void;
  onChooseSelf: () => void;
}) {
  return (
    <section className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <header className="mb-6 text-center">
        <h3 className="text-xl font-black text-slate-900 md:text-2xl">
          איך תרצו לעבור את מכרז הריביות?
        </h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 md:text-base">
          זו ההחלטה שפותחת את השלב. אפשר לשנות אותה בהמשך — אבל כל אחת מהדרכים
          נראית אחרת, ולכן בוחרים אותה קודם.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <ChoiceCard
          icon={<Sparkles className="h-7 w-7 text-white" />}
          gradient="from-violet-600 to-purple-600"
          title="תנו ליועץ משכלנתא לעשות לכם את העבודה"
          lines={[
            'היועץ פונה לכל הבנקים ומנהל מולם את המכרז',
            'כל הצעה שהוא משיג נכנסת אליכם למסך מוכנה להשוואה',
            'אתם רואים הכול — ובוחרים את התמהיל שהולך לחתימה',
          ]}
          footer={`${formatOrderPrice(ADVISOR_STAGE_PRICE.AUCTION)} · כולל גישה מלאה לפלטפורמה`}
          cta="תנו ליועץ לעשות את העבודה"
          onClick={onChooseAdvisor}
          primary
        />

        <ChoiceCard
          icon={<Wrench className="h-7 w-7 text-white" />}
          gradient="from-blue-600 to-cyan-600"
          title="עשה זאת בעצמך"
          lines={[
            'אתם פונים לבנקים ומזינים כאן את הריביות שקיבלתם',
            'כל בנק מתמחר בדיוק את אותו תמהיל — כך ההשוואה אמיתית',
            'הכלים, הגרפים וההשוואה — בדיוק כמו בכלי בניית התמהיל',
          ]}
          footer="כלול במנוי — בלי עלות נוספת"
          cta="עשה זאת בעצמך"
          onClick={onChooseSelf}
        />
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs font-bold text-slate-500">
        <Handshake className="h-4 w-4" />
        גם אם תתחילו לבד, אפשר להעביר את השלב ליועץ בכל רגע
      </p>
    </section>
  );
}

function ChoiceCard({
  icon,
  gradient,
  title,
  lines,
  footer,
  cta,
  onClick,
  primary = false,
}: {
  icon: React.ReactNode;
  gradient: string;
  title: string;
  lines: string[];
  footer: string;
  cta: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-3xl border-2 text-center transition-all hover:shadow-lg ${
        primary ? 'border-violet-300 bg-violet-50/40' : 'border-blue-200 bg-blue-50/30'
      }`}
    >
      <div className={`h-1.5 w-full bg-gradient-to-l ${gradient}`} />

      <div className="flex flex-1 flex-col items-center gap-3 p-6">
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}
        >
          {icon}
        </span>

        <h4 className="text-lg font-black leading-tight text-slate-900">{title}</h4>

        <ul className="flex-1 space-y-1.5">
          {lines.map((line) => (
            <li key={line} className="text-sm font-medium leading-relaxed text-slate-700">
              {line}
            </li>
          ))}
        </ul>

        <p className="text-xs font-black text-slate-600">{footer}</p>

        <button
          type="button"
          onClick={onClick}
          className={`mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-sm transition-all hover:brightness-110 bg-gradient-to-l ${gradient}`}
        >
          {cta}
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
