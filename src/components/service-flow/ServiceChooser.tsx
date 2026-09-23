'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  ChevronRight,
  Compass,
  Home,
  Loader2,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  FULL_SERVICE_PRICE,
  GOAL_LABELS,
  PLATFORM_ACCESS_DAYS,
  PLATFORM_PROCESS_PRICE,
  SERVICE_CHOICES,
  SERVICE_LABELS,
} from '@/lib/service-flow';
import type { MortgageGoal, ServiceChoice, ServiceType } from '@/lib/service-flow';
import { TRACKS_HEADLINE, TRACKS_INTRO } from '@/data/platform/pricing';
import { PricingModelStrip } from './PricingModelStrip';

/** מטרה שממנה ממשיכים לבחירת סוג השירות — ייעוץ נשלח ישירות ליועץ */
type FlowGoal = 'NEW_MORTGAGE' | 'REFINANCE';

const GOAL_META: Record<MortgageGoal, { icon: LucideIcon; gradient: string; ring: string }> = {
  NEW_MORTGAGE: { icon: Home, gradient: 'from-blue-500 to-cyan-500', ring: 'hover:border-blue-400' },
  REFINANCE: { icon: RefreshCw, gradient: 'from-violet-500 to-purple-600', ring: 'hover:border-violet-400' },
  ADVICE: { icon: Compass, gradient: 'from-emerald-500 to-teal-600', ring: 'hover:border-emerald-400' },
};

const SERVICE_META: Record<ServiceChoice, { icon: LucideIcon; gradient: string; price: string; priceNote: string }> = {
  SELF: {
    icon: Bot,
    gradient: 'from-blue-500 to-violet-600',
    price: `₪${PLATFORM_PROCESS_PRICE} לתהליך משכנתא`,
    priceNote: `${PLATFORM_ACCESS_DAYS} יום גישה מלאה לכל הכלים · מקוזז אם תבקשו ליווי`,
  },
  FULL: {
    icon: UserCheck,
    gradient: 'from-amber-500 to-orange-600',
    price: `₪${FULL_SERVICE_PRICE.toLocaleString('he-IL')}`,
    priceNote: 'עד לחתימה · הגישה לפלטפורמה כלולה',
  },
};

export interface ServiceChooserProps {
  /** כותרת המסך הראשון */
  title?: string;
  subtitle?: string;
  /**
   * האם יש למשתמש גישה ששולמה ועוד לא פתחה תהליך. אז אין מה לבחור: בחירת
   * משכנתא חדשה או מיחזור פותחת את התהליך מיד, בלי מסך המסלולים.
   */
  hasAccess?: boolean;
  /** פתיחה ישירה במסך סוג השירות, למשל אחרי חזרה מההרשמה */
  initialGoal?: FlowGoal | null;
  /** המסלול העצמאי — פותח את הכלי (או את הסיור) */
  onSelf: (goal: FlowGoal) => void;
  /** כל בחירה שדורשת יועץ — ליווי משולב, ליווי מלא או ייעוץ */
  onAdvisor: (goal: MortgageGoal, service: ServiceType) => void;
  busy?: boolean;
  tone?: 'light' | 'dark';
  /** להציג את עקרונות התמחור מתחת לבחירה */
  showPricing?: boolean;
}

/**
 * "מה תרצו לעשות?" — נקודת הכניסה של הלקוח.
 *
 * מסך ראשון: משכנתא חדשה / מיחזור / ייעוץ. מסך שני (לחדשה ולמיחזור), רק למי
 * שעוד לא שילם: עצמאי / היברידי או ליווי מלא, עם כפתור חזרה. מי שכבר שילם
 * נכנס מהמסך הראשון ישר לתהליך. אותו רכיב משמש גם בעמוד הבית לאורחים וגם
 * באזור האישי — ההבדל הוא רק מה קורה אחרי הבחירה.
 */
export function ServiceChooser({
  title = 'מה תרצו לעשות?',
  subtitle,
  hasAccess = false,
  initialGoal = null,
  onSelf,
  onAdvisor,
  busy = false,
  tone = 'light',
  showPricing = true,
}: ServiceChooserProps) {
  const [goal, setGoal] = useState<FlowGoal | null>(initialGoal);

  useEffect(() => {
    if (initialGoal) setGoal(initialGoal);
  }, [initialGoal]);

  const dark = tone === 'dark';
  const heading = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-white/60' : 'text-slate-500';
  const card = dark
    ? 'border-white/15 bg-white/5 text-white hover:bg-white/10'
    : 'border-slate-200 bg-white text-slate-900 hover:shadow-xl';

  const chooseGoal = (next: MortgageGoal) => {
    if (next === 'ADVICE') {
      onAdvisor('ADVICE', 'GUIDANCE');
      return;
    }
    // שילמו כבר — אין מסלול לבחור, התהליך נפתח ישר בשלב הראשון
    if (hasAccess) {
      onSelf(next);
      return;
    }
    setGoal(next);
  };

  const chooseService = (service: ServiceChoice) => {
    if (!goal) return;
    if (service === 'SELF') onSelf(goal);
    else onAdvisor(goal, service);
  };

  return (
    <div dir="rtl" className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {goal === null ? (
          <motion.section
            key="goal"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.25 }}
          >
            <div className="text-center">
              <h2 className={`text-3xl font-black md:text-4xl ${heading}`}>{title}</h2>
              <p className={`mx-auto mt-2 max-w-xl text-sm leading-relaxed md:text-base ${muted}`}>
                {subtitle ?? 'בחרו את המטרה, ומיד אחריה — כמה עזרה תרצו בדרך. בכל שלב אפשר לשנות את הבחירה.'}
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {(Object.keys(GOAL_LABELS) as MortgageGoal[]).map((item, index) => {
                const meta = GOAL_META[item];
                const Icon = meta.icon;
                return (
                  <motion.button
                    key={item}
                    type="button"
                    disabled={busy}
                    onClick={() => chooseGoal(item)}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.07 }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`group flex h-full flex-col items-center rounded-3xl border-2 p-6 text-center shadow-md transition-all disabled:opacity-60 ${card} ${meta.ring}`}
                  >
                    <span
                      className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.gradient} shadow-lg transition-transform group-hover:scale-110`}
                    >
                      <Icon className="h-8 w-8 text-white" />
                    </span>
                    <span className="text-lg font-black leading-snug">{GOAL_LABELS[item].title}</span>
                    <span className={`mt-2 text-sm leading-relaxed ${muted}`}>{GOAL_LABELS[item].description}</span>
                    <span
                      className={`mt-4 inline-flex items-center gap-1 text-sm font-bold ${
                        dark ? 'text-cyan-200' : 'text-blue-600'
                      }`}
                    >
                      {item === 'ADVICE'
                        ? 'שלחו בקשה ליועץ'
                        : hasAccess
                          ? 'התחילו את התהליך'
                          : 'המשיכו לבחירת המסלול'}
                      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="service"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
                  dark ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {GOAL_LABELS[goal].title}
              </span>
              <h2 className={`max-w-2xl text-2xl font-black leading-snug md:text-3xl ${heading}`}>
                {TRACKS_HEADLINE}
              </h2>
              <p className={`max-w-2xl text-[15px] leading-relaxed ${muted}`}>{TRACKS_INTRO}</p>
            </div>

            <div className="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-2">
              {SERVICE_CHOICES.map((service, index) => {
                const meta = SERVICE_META[service];
                const Icon = meta.icon;
                const labels = SERVICE_LABELS[service];
                const selfOpen = service === 'SELF' && hasAccess;
                const featured = service === 'SELF';
                return (
                  <motion.button
                    key={service}
                    type="button"
                    disabled={busy}
                    onClick={() => chooseService(service)}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.07 }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`group relative flex h-full flex-col rounded-3xl border-2 p-6 text-right shadow-md transition-all disabled:opacity-60 ${card} ${
                      featured ? (dark ? 'border-violet-300/50' : 'border-violet-300') : ''
                    }`}
                  >
                    {featured && (
                      <span className="absolute -top-3 right-6 rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 px-3 py-0.5 text-[11px] font-black text-white shadow">
                        הכי נבחר
                      </span>
                    )}
                    <span
                      className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.gradient} shadow-lg transition-transform group-hover:scale-110`}
                    >
                      <Icon className="h-7 w-7 text-white" />
                    </span>
                    <span className="text-xl font-black">{labels.title}</span>
                    <span className={`mt-1.5 flex-1 text-[15px] leading-relaxed ${muted}`}>{labels.description}</span>
                    <span className={`mt-4 border-t pt-4 ${dark ? 'border-white/10' : 'border-slate-100'}`}>
                      <span className="block text-lg font-black">
                        {selfOpen ? 'הגישה שלכם פעילה' : meta.price}
                      </span>
                      <span className={`block text-[11px] ${muted}`}>
                        {selfOpen ? 'הכלי המלא פתוח, בלי הגבלות' : meta.priceNote}
                      </span>
                    </span>
                    <span
                      className={`mt-4 inline-flex items-center gap-1.5 text-sm font-bold ${
                        dark ? 'text-cyan-200' : 'text-blue-600'
                      }`}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          {service === 'SELF'
                            ? selfOpen
                              ? 'פתחו את כלי התכנון'
                              : 'מתחילים לבד'
                            : 'שלחו בקשת ליווי'}
                          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        </>
                      )}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setGoal(null)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                  dark ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <ChevronRight className="h-4 w-4" />
                חזרה לבחירת המטרה
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {showPricing && (
        <div className="mt-8">
          <p className={`mb-3 text-center text-[11px] font-black uppercase tracking-wide ${muted}`}>
            כך עובד התמחור
          </p>
          <PricingModelStrip compact tone={tone} />
        </div>
      )}
    </div>
  );
}
