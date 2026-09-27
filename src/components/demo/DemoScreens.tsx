'use client';

import React from 'react';
import {
  BarChart3,
  CalendarDays,
  Calculator,
  Check,
  Compass,
  CreditCard,
  FileStack,
  FileText,
  FolderOpen,
  Gavel,
  Home as HomeIcon,
  Layers,
  LayoutDashboard,
  ListChecks,
  PenLine,
  Percent,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Timer,
  TrendingDown,
  UserRound,
  Wallet,
} from 'lucide-react';
import {
  DemoBars,
  DemoCard,
  DemoCheckRow,
  DemoComposition,
  DemoCurve,
  DemoKpi,
  DemoPill,
  DemoSlider,
  DemoStat,
  DemoTable,
} from './DemoKit';

/**
 * מסכי ההדגמה — שחזור נאמן של המסכים האמיתיים.
 *
 * כל מסך כאן מצייר את מה שהלקוח רואה בפועל: האזור האישי, חמשת שלבי התהליך,
 * והכלים. הכותרות, הסדר, הצבעים והמבנה לקוחים מהרכיבים האמיתיים, והנתונים הם
 * נתוני הדגמה של משפחה לדוגמה — כדי שמי שצופה יראה מסך מלא ועובד, ולא מסך ריק.
 */

const NAVY = 'bg-slate-950';

/* ================================================================== */
/* האזור האישי                                                        */
/* ================================================================== */

const SIDEBAR_ITEMS = [
  { label: 'סקירה', icon: LayoutDashboard, badge: '1' },
  { label: 'משימות ולוח שנה', icon: CalendarDays, badge: '4', alert: true },
  { label: 'תמהילים שמורים', icon: Gavel, badge: '3' },
  { label: 'הכלים שלי', icon: Calculator },
  { label: 'הגדרות', icon: Settings },
];

function DashboardSidebar({ active = 'סקירה' }: { active?: string }) {
  return (
    <aside className={`flex h-full flex-col px-3 py-4 ${NAVY}`}>
      <div className="flex items-center gap-2 px-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg">
          <HomeIcon className="h-4 w-4 text-white" />
        </span>
        <span className="text-[16px] font-black text-white">משכלנתא</span>
      </div>

      <p className="mt-5 px-2 text-[10px] font-bold tracking-wide text-white/40">האזור האישי</p>
      <nav className="mt-1.5 space-y-1">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.label === active;
          return (
            <span
              key={item.label}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12.5px] font-bold ${
                isActive ? 'bg-white text-slate-900 shadow-lg' : 'text-white/70'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-right">{item.label}</span>
              {item.badge && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                    item.alert
                      ? 'bg-rose-500 text-white'
                      : isActive
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-white/15 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2">
        <span className="flex items-center gap-2 rounded-xl bg-white/10 px-2.5 py-2 text-[11.5px] font-black text-white">
          <FolderOpen className="h-4 w-4" />
          תיק המסמכים
          <span className="mr-auto rounded-full bg-emerald-500/90 px-1.5 text-[10px]">9/12</span>
        </span>
        <span className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-blue-600 to-violet-600 px-2.5 py-2 text-[11.5px] font-black text-white shadow-lg">
          <Sparkles className="h-4 w-4" />
          מה תרצו לעשות?
        </span>
        <span className="flex items-center gap-2 rounded-xl bg-white/5 p-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
            <UserRound className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="flex-1 truncate text-[11.5px] font-semibold text-white/80">
            דניאל ומאיה כהן
          </span>
        </span>
      </div>
    </aside>
  );
}

/** הסקירה של האזור האישי — המסך הראשון שהלקוח רואה אחרי ההרשמה */
export function DashboardScreen() {
  return (
    <div dir="rtl" className="grid h-full grid-cols-[228px_minmax(0,1fr)] bg-slate-100">
      <DashboardSidebar />

      <main className="min-w-0 overflow-hidden px-5 py-3">
        <div className="text-center">
          <p className="text-[11px] font-bold text-slate-500">יום שלישי, 12 במרץ</p>
          <h1 className="mt-0.5 text-[22px] font-black leading-tight text-slate-900">שלום, דניאל</h1>
          <p className="mx-auto mt-1 max-w-xl text-[12px] leading-relaxed text-slate-600">
            איפה אתם עומדים, מה קרוב ביומן ומה הפעולה הבאה — הכול במסך אחד.
          </p>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-2">
          <DemoKpi
            icon={<Compass className="h-3.5 w-3.5 text-blue-600" />}
            tone="blue"
            label="משכנתאות בתהליך"
            value="1"
            hint="דירה ברחוב הרצל 24, רעננה"
          />
          <DemoKpi
            icon={<ListChecks className="h-3.5 w-3.5 text-violet-600" />}
            tone="violet"
            label="השלב הנוכחי"
            value="שלב 3"
            hint="אישור עקרוני"
          />
          <DemoKpi
            icon={<CalendarDays className="h-3.5 w-3.5 text-emerald-600" />}
            tone="emerald"
            label="הפגישה הקרובה"
            value="מחר 17:30"
            hint="שיחה עם יועץ משכלנתא"
          />
          <DemoKpi
            icon={<ListChecks className="h-3.5 w-3.5 text-rose-600" />}
            tone="rose"
            label="משימות פתוחות"
            value="4"
            hint="אחת דורשת טיפול מיידי"
          />
        </div>

        <div className="mt-2 grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-2">
          <DemoCard
            title="המשכנתא שלי"
            icon={<Compass className="h-4 w-4 text-blue-600" />}
            action={<DemoPill tone="violet">היועץ מטפל בשלב האישור העקרוני</DemoPill>}
          >
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-black text-slate-900">
                  דירה ברחוב הרצל 24, רעננה
                </span>
                <DemoPill tone="blue">משכנתא ₪1,240,000</DemoPill>
                <DemoPill tone="slate">החזר ₪6,240</DemoPill>
                <span className="mr-auto text-[11px] font-black text-blue-700">62%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <span className="block h-full w-[62%] rounded-full bg-gradient-to-l from-blue-500 to-violet-500" />
              </div>
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {[
                  { label: 'פרופיל', done: true },
                  { label: 'תמהיל', done: true },
                  { label: 'אישור עקרוני', current: true },
                  { label: 'מכרז ריביות' },
                  { label: 'חתימה' },
                ].map((step) => (
                  <span
                    key={step.label}
                    className={`rounded-lg px-1.5 py-1 text-center text-[10px] font-black ${
                      step.done
                        ? 'bg-emerald-100 text-emerald-700'
                        : step.current
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-400'
                    }`}
                  >
                    {step.done ? '✓ ' : ''}
                    {step.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 p-2">
                <p className="text-[10px] text-slate-500">התמהיל שנבנה</p>
                <DemoComposition
                  height={16}
                  segments={[
                    { label: 'קבועה לא צמודה', share: 40, color: '#2563eb' },
                    { label: 'פריים', share: 35, color: '#7c3aed' },
                    { label: 'משתנה כל 5', share: 25, color: '#0891b2' },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DemoStat label="החזר חודשי" value="₪6,240" emphasized />
                <DemoStat label="סך ריבית" value="₪412,900" />
                <DemoStat label="ריבית ממוצעת" value="4.62%" />
                <DemoStat label="תקופה" value="24 שנים" />
              </div>
            </div>
          </DemoCard>

          <DemoCard title="לוח השנה שלי" icon={<CalendarDays className="h-4 w-4 text-blue-600" />}>
            <MiniMonth />
            <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
              {[
                { day: 'מחר', time: '17:30', title: 'שיחה עם יועץ משכלנתא', dot: 'bg-violet-500' },
                { day: '14.3', time: '09:00', title: 'פגישה בבנק — הגשת הבקשה', dot: 'bg-blue-500' },
                { day: '21.3', time: '12:00', title: 'תוקף האישור העקרוני', dot: 'bg-amber-500' },
              ].map((event) => (
                <div
                  key={event.title}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-1.5"
                >
                  <span className="flex h-8 w-9 flex-col items-center justify-center rounded-lg bg-slate-50">
                    <span className="text-[9px] font-bold leading-none text-slate-500">{event.day}</span>
                    <span className="mt-0.5 text-[11px] font-black leading-none">{event.time}</span>
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-black text-slate-900">
                    {event.title}
                  </span>
                  <span className={`h-2 w-2 rounded-full ${event.dot}`} />
                </div>
              ))}
            </div>
          </DemoCard>
        </div>

        <div className="mt-2 grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-2">
          <DemoCard title="המשימות שלי" icon={<ListChecks className="h-4 w-4 text-blue-600" />}>
            <div className="grid grid-cols-2 gap-1.5">
              <DemoCheckRow label="העלאת 3 תלושי שכר אחרונים" hint="הושלם" />
              <DemoCheckRow label="אישור ניהול חשבון מהבנק" hint="הושלם" />
              <DemoCheckRow label="חתימה על טופס הצהרת בריאות" state="progress" hint="עד 14.3" />
              <DemoCheckRow label="הזנת הריביות שקיבלתם באישור" state="open" hint="ממתין" />
            </div>
          </DemoCard>

          <DemoCard title="פעולות מהירות" icon={<Calculator className="h-4 w-4 text-blue-600" />}>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'בניית תמהיל', icon: Layers },
                { label: 'אישור עקרוני', icon: FileText },
                { label: 'בדיקת היתכנות', icon: Search },
                { label: 'תיק המסמכים', icon: FolderOpen },
                { label: 'מיחזור משכנתא', icon: RefreshCw },
                { label: 'הלוואות צרכניות', icon: CreditCard },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <span
                    key={action.label}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-700"
                  >
                    <Icon className="h-3.5 w-3.5 text-blue-600" />
                    {action.label}
                  </span>
                );
              })}
            </div>
          </DemoCard>
        </div>
      </main>
    </div>
  );
}

function MiniMonth() {
  const days = Array.from({ length: 31 }, (_, index) => index + 1);
  const marked: Record<number, string> = { 13: 'bg-violet-500', 14: 'bg-blue-500', 21: 'bg-amber-500' };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[11px] font-black text-slate-700">מרץ 2026</span>
        <span className="text-[10px] text-slate-400">ש ו ה ד ג ב א</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <span
            key={day}
            className={`relative flex h-5 items-center justify-center rounded-md text-[10px] font-bold ${
              day === 12 ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'
            }`}
          >
            {day}
            {marked[day] && (
              <span
                className={`absolute bottom-0.5 h-1 w-1 rounded-full ${marked[day]}`}
              />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* שלבי התהליך                                                        */
/* ================================================================== */

export type DemoStage = 'ANALYSIS' | 'MIX' | 'APPLICATIONS' | 'AUCTION' | 'SIGNING';

const STAGE_META: Record<
  DemoStage,
  { number: number; rail: string; title: string; hint: string; gradient: string; icon: React.ElementType }
> = {
  ANALYSIS: {
    number: 1,
    rail: 'פרופיל פיננסי',
    title: 'בניית הפרופיל הפיננסי',
    hint: 'הכנסות, התחייבויות, הון עצמי ופרטי העסקה — הכול נשמר תוך כדי הקלדה.',
    gradient: 'from-blue-500 to-cyan-500',
    icon: BarChart3,
  },
  MIX: {
    number: 2,
    rail: 'בניית תמהיל',
    title: 'בניית תמהיל',
    hint: 'בונים תמהיל אישי מול הסלים האחידים ומשפרים אותו עד שהוא משתלם.',
    gradient: 'from-violet-500 to-purple-600',
    icon: Layers,
  },
  APPLICATIONS: {
    number: 3,
    rail: 'אישור עקרוני',
    title: 'הגשת בקשה לאישור עקרוני',
    hint: 'תיק מסמכים מלא, בחירת הבנק, והזנת הריביות שהתקבלו באישור.',
    gradient: 'from-emerald-500 to-teal-600',
    icon: FileStack,
  },
  AUCTION: {
    number: 4,
    rail: 'מכרז ריביות',
    title: 'מכרז הריביות',
    hint: 'כל הצעה שקיבלתם מושווית לתמהיל שבניתם — וההצעה שתבחרו עוברת לחתימה.',
    gradient: 'from-amber-500 to-orange-600',
    icon: Gavel,
  },
  SIGNING: {
    number: 5,
    rail: 'חתימה בבנק',
    title: 'חתימה על תיק המשכנתא בבנק',
    hint: 'רשימת המסמכים לחתימה, ובדיקה שכל תנאי תואם למה שתומחר במכרז.',
    gradient: 'from-rose-500 to-pink-600',
    icon: PenLine,
  },
};

const STAGE_ORDER: DemoStage[] = ['ANALYSIS', 'MIX', 'APPLICATIONS', 'AUCTION', 'SIGNING'];

/** שולחן העבודה של התהליך — הכותרת, פס השלבים וכרטיס השלב הפעיל */
function PlanShell({ stage, children }: { stage: DemoStage; children: React.ReactNode }) {
  const meta = STAGE_META[stage];
  const StageIcon = meta.icon;
  const activeIndex = STAGE_ORDER.indexOf(stage);
  const progress = Math.round(((activeIndex + 0.5) / STAGE_ORDER.length) * 100);

  return (
    <div dir="rtl" className="flex h-full flex-col bg-slate-50">
      <header className="relative overflow-hidden bg-slate-950 px-5 pb-4 pt-3">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 top-4 h-52 w-52 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative mb-3 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg">
            <HomeIcon className="h-4 w-4 text-white" />
          </span>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[10px] font-bold text-white/60">האזור האישי ›</p>
            <h1 className="text-[19px] font-black text-white">דירה ברחוב הרצל 24, רעננה</h1>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/80">
                משכנתא ₪1,240,000
              </span>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/80">
                החזר ₪6,240
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300">
                <Check className="h-3 w-3" />
                נשמר
              </span>
            </div>
          </div>
          <ProgressRing value={progress} />
        </div>

        {/* פס השלבים */}
        <div className="relative rounded-2xl bg-white/10 px-3 py-3 ring-1 ring-white/25">
          <div className="absolute right-[10%] left-[10%] top-8 h-1.5 rounded-full bg-cyan-100/50" />
          <div
            className="absolute right-[10%] top-8 h-1.5 rounded-full bg-gradient-to-l from-cyan-300 via-sky-300 to-emerald-300"
            style={{ width: `${(activeIndex / (STAGE_ORDER.length - 1)) * 80}%` }}
          />
          <ol className="relative grid grid-cols-5">
            {STAGE_ORDER.map((item, index) => {
              const itemMeta = STAGE_META[item];
              const Icon = itemMeta.icon;
              const isCurrent = item === stage;
              const isDone = index < activeIndex;
              return (
                <li key={item} className="flex flex-col items-center text-center">
                  <span
                    className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.35)] ${
                      isCurrent
                        ? `bg-gradient-to-br ${itemMeta.gradient} text-white ring-2 ring-white`
                        : isDone
                          ? 'bg-emerald-400 text-white ring-2 ring-emerald-100'
                          : 'bg-slate-900/70 text-cyan-50 ring-2 ring-cyan-200/70'
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span
                    className={`mt-1.5 text-[11px] font-black ${
                      isCurrent ? 'text-white' : 'text-white/70'
                    }`}
                  >
                    {itemMeta.rail}
                  </span>
                  <span className="text-[9.5px] text-white/50">
                    {isDone ? 'הושלם' : isCurrent ? 'בעבודה' : 'ממתין'}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col px-5 py-3">
        {/* כרטיס השלב הפעיל */}
        <div className="mb-2.5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className={`h-1.5 w-full bg-gradient-to-l ${meta.gradient}`} />
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient} shadow-lg`}
            >
              <StageIcon className="h-4 w-4 text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black text-slate-400">
                שלב {meta.number} מתוך 5
              </span>
              <h2 className="text-[16px] font-black leading-tight text-slate-900">{meta.title}</h2>
              <p className="text-[11.5px] text-slate-500">{meta.hint}</p>
            </div>
            <DemoPill tone="violet">
              <Sparkles className="h-3 w-3" />
              אפשר להעביר את השלב ליועץ
            </DemoPill>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
        <circle cx="28" cy="28" r={radius} className="fill-none stroke-white/30" strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          className="fill-none stroke-emerald-300"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[13px] font-black text-white">{value}%</span>
        <span className="text-[8px] text-white/60">הושלם</span>
      </span>
    </div>
  );
}

/** תוכן השלב — מה שיושב מתחת לכרטיס השלב בכל אחד מהשלבים */
export function StageScreen({ stage }: { stage: DemoStage }) {
  return <PlanShell stage={stage}>{STAGE_CONTENT[stage]}</PlanShell>;
}

const STAGE_CONTENT: Record<DemoStage, React.ReactNode> = {
  ANALYSIS: (
    <div className="grid flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-stretch gap-2.5">
      <DemoCard title="הפרופיל הפיננסי שלכם" icon={<BarChart3 className="h-4 w-4 text-blue-600" />}>
        <div className="grid grid-cols-3 gap-2">
          <DemoStat label="הכנסה פנויה" value="₪24,800" emphasized />
          <DemoStat label="הון עצמי" value="₪620,000" />
          <DemoStat label="התחייבויות" value="₪2,150" />
        </div>
        <div className="mt-2 space-y-2">
          <DemoSlider label="יחס החזר מההכנסה" value="31%" fill={31} min="0%" max="50%" />
          <DemoSlider label="אחוז מימון (LTV)" value="66%" fill={66} min="0%" max="75%" tone="violet" />
        </div>
        <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-900">
          הפרופיל עומד במגבלות בנק ישראל — אפשר להגיש בקשה עד ₪1,310,000
        </div>
      </DemoCard>

      <DemoCard
        title="דוח הפרופיל — מה שהבנק יראה"
        icon={<FileText className="h-4 w-4 text-blue-600" />}
        action={<DemoPill tone="blue">להורדה כ-PDF</DemoPill>}
      >
        <div className="space-y-1.5">
          <DemoCheckRow label="שני לווים שכירים · ותק 4 ו-7 שנים" hint="מאומת" />
          <DemoCheckRow label="הלוואת רכב פעילה — ₪2,150 לחודש" state="progress" hint="ממליצים לסגור" />
          <DemoCheckRow label="אין חריגות עו״ש בשלושת החודשים האחרונים" hint="תקין" />
          <DemoCheckRow label="צפי לפירעון מוקדם מקרן השתלמות בעוד 3 שנים" hint="נלקח בתמהיל" />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-slate-200 p-2">
            <p className="text-[10px] text-slate-500">מחיר נכס מקסימלי</p>
            <p className="text-[14px] font-black text-slate-900">₪1,930,000</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-2">
            <p className="text-[10px] text-slate-500">החזר חודשי מומלץ</p>
            <p className="text-[14px] font-black text-slate-900">₪6,400</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-2">
            <p className="text-[10px] text-slate-500">תקופה מומלצת</p>
            <p className="text-[14px] font-black text-slate-900">24 שנים</p>
          </div>
        </div>
      </DemoCard>
    </div>
  ),

  MIX: (
    <div className="grid flex-1 grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] items-stretch gap-2.5">
      <DemoCard title="פאנל בניית התמהיל" icon={<Layers className="h-4 w-4 text-violet-600" />}>
        <div className="space-y-2">
          {[
            { name: 'קבועה לא צמודה', amount: '₪496,000', rate: '4.9%', years: '24 שנים', fill: 62 },
            { name: 'פריים', amount: '₪434,000', rate: 'P-0.6%', years: '20 שנים', fill: 48 },
            { name: 'משתנה כל 5 לא צמודה', amount: '₪310,000', rate: '4.35%', years: '18 שנים', fill: 38 },
          ].map((track) => (
            <div key={track.name} className="rounded-xl border border-slate-200 p-2">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[12px] font-black text-slate-900">{track.name}</span>
                <DemoPill tone="violet">{track.rate}</DemoPill>
                <span className="mr-auto text-[12px] font-black text-blue-700">{track.amount}</span>
              </div>
              <DemoSlider label="סכום" value={track.years} fill={track.fill} tone="violet" />
            </div>
          ))}
        </div>
      </DemoCard>

      <DemoCard
        title="התמהיל מול הסלים האחידים"
        icon={<BarChart3 className="h-4 w-4 text-violet-600" />}
        action={<DemoPill tone="emerald">חיסכון ₪138,400 בריבית</DemoPill>}
      >
        <DemoComposition
          segments={[
            { label: 'קבועה לא צמודה', share: 40, color: '#2563eb' },
            { label: 'פריים', share: 35, color: '#7c3aed' },
            { label: 'משתנה כל 5', share: 25, color: '#0891b2' },
          ]}
        />
        <div className="mt-2 grid grid-cols-4 gap-2 rounded-xl border border-slate-200 p-2">
          <DemoStat label="החזר חודשי" value="₪6,240" delta={{ text: '−₪520', good: true }} emphasized />
          <DemoStat label="סך ריבית" value="₪412,900" delta={{ text: '−₪138,400', good: true }} />
          <DemoStat label="ריבית ממוצעת" value="4.62%" delta={{ text: '−0.38 נק׳', good: true }} />
          <DemoStat label="תקופה" value="24 שנים" />
        </div>
        <div className="mt-2 rounded-xl border border-slate-200 p-2">
          <p className="mb-1 text-[11px] font-bold text-slate-700">יתרת החוב לאורך השנים</p>
          <DemoCurve height={86} />
          <p className="mt-0.5 text-[10px] text-slate-400">
            קו מלא — הסל האחיד · קו מקווקו — התמהיל שבניתם
          </p>
        </div>
      </DemoCard>
    </div>
  ),

  APPLICATIONS: (
    <div className="grid flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-2.5">
      <DemoCard
        title="תיק המסמכים"
        icon={<FolderOpen className="h-4 w-4 text-emerald-600" />}
        action={<DemoPill tone="emerald">9 מתוך 12 הועלו</DemoPill>}
      >
        <div className="space-y-1.5">
          <DemoCheckRow label="תעודות זהות + ספח של שני הלווים" hint="הועלה" />
          <DemoCheckRow label="3 תלושי שכר אחרונים" hint="הועלה" />
          <DemoCheckRow label="דפי חשבון 3 חודשים" hint="הועלה" />
          <DemoCheckRow label="הסכם מכר חתום" state="progress" hint="ממתין לעו״ד" />
          <DemoCheckRow label="אישור ניהול חשבון" state="open" hint="נדרש" />
          <DemoCheckRow label="נסח טאבו" state="open" hint="נדרש" />
        </div>
      </DemoCard>

      <DemoCard
        title="הבקשה לבנק והריביות שהתקבלו"
        icon={<FileStack className="h-4 w-4 text-emerald-600" />}
      >
        <div className="mb-2 flex flex-wrap gap-1.5">
          {['לאומי', 'מזרחי טפחות', 'הפועלים', 'דיסקונט'].map((bank, index) => (
            <span
              key={bank}
              className={`rounded-lg border px-2 py-1 text-[11px] font-bold ${
                index === 1
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 text-slate-500'
              }`}
            >
              {bank}
            </span>
          ))}
        </div>
        <DemoTable
          head={['הסל האחיד', 'ריבית', 'החזר חודשי', 'סך ריבית']}
          rows={[
            ['100% קבועה לא צמודה', '5.10%', '₪7,180', '₪828,000'],
            ['50% קבועה + 50% פריים', '4.95%', '₪6,840', '₪731,500'],
            ['33/33/33', '4.80%', '₪6,610', '₪684,200'],
          ]}
          highlight={2}
        />
        <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-900">
          האישור העקרוני התקבל · בתוקף עד 21.3 · הריביות נשמרו כבסיס למכרז
        </div>
      </DemoCard>
    </div>
  ),

  AUCTION: (
    <div className="flex flex-1 flex-col gap-2.5">
      <div className="grid grid-cols-4 gap-2.5">
        <DemoKpi
          icon={<Gavel className="h-3.5 w-3.5 text-amber-600" />}
          tone="amber"
          label="הצעות שהתקבלו"
          value="4"
          hint="מתוך 5 בנקים שפנינו אליהם"
        />
        <DemoKpi
          icon={<TrendingDown className="h-3.5 w-3.5 text-emerald-600" />}
          tone="emerald"
          label="החיסכון מול ההצעה הראשונה"
          value="₪96,300"
          hint="בריבית, לאורך כל התקופה"
        />
        <DemoKpi
          icon={<Wallet className="h-3.5 w-3.5 text-blue-600" />}
          tone="blue"
          label="החזר חודשי מוביל"
          value="₪6,240"
          hint="מזרחי טפחות · הצעה משופרת"
        />
        <DemoKpi
          icon={<Timer className="h-3.5 w-3.5 text-slate-600" />}
          tone="slate"
          label="הצעה בתוקף עד"
          value="21.3"
          hint="9 ימים לסגירה"
        />
      </div>

      <DemoCard title="כל ההצעות מול התמהיל שבניתם" icon={<Gavel className="h-4 w-4 text-amber-600" />}>
        <DemoTable
          head={['בנק', 'ריבית ממוצעת', 'החזר חודשי', 'סך ריבית', 'פער מהתמהיל']}
          rows={[
            ['מזרחי טפחות · סבב 2', '4.62%', '₪6,240', '₪412,900', <span key="a" className="font-black text-emerald-600">−₪96,300</span>],
            ['לאומי · סבב 2', '4.78%', '₪6,390', '₪451,700', <span key="b" className="font-black text-emerald-600">−₪57,500</span>],
            ['הפועלים · סבב 1', '4.95%', '₪6,540', '₪489,300', <span key="c" className="font-black text-rose-600">+₪19,900</span>],
            ['דיסקונט · סבב 1', '5.04%', '₪6,620', '₪509,200', <span key="d" className="font-black text-rose-600">+₪39,800</span>],
          ]}
          highlight={0}
        />
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
          <div className="rounded-xl border border-slate-200 p-2">
            <p className="mb-1 text-[11px] font-bold text-slate-700">סך הריבית בכל הצעה</p>
            <DemoBars
              values={[412, 451, 489, 509]}
              colors={['#059669', '#0891b2', '#f59e0b', '#e11d48']}
              labels={['מזרחי', 'לאומי', 'הפועלים', 'דיסקונט']}
            />
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2">
            <p className="text-[11.5px] font-black text-amber-900">מה עושים עכשיו</p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-900/80">
              ההצעה המובילה נשמרת ועוברת לשלב החתימה. אפשר להזין סבב נוסף מול כל בנק ולראות מיד
              את ההפרש — או להעביר את המכרז ליועץ משכלנתא שינהל אותו עבורכם.
            </p>
            <div className="mt-2 flex gap-1.5">
              <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-black text-white">
                בחירת ההצעה המובילה
              </span>
              <span className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                הזנת סבב נוסף
              </span>
            </div>
          </div>
        </div>
      </DemoCard>
    </div>
  ),

  SIGNING: (
    <div className="grid flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-stretch gap-2.5">
      <DemoCard title="מה חותמים בבנק" icon={<PenLine className="h-4 w-4 text-rose-600" />}>
        <div className="space-y-1.5">
          <DemoCheckRow label="מסמכי המשכנתא וטופסי ההלוואה" hint="מוכן" />
          <DemoCheckRow label="ביטוח חיים וביטוח מבנה" hint="הופק" />
          <DemoCheckRow label="הערת אזהרה ורישום שעבוד" state="progress" hint="בטיפול עו״ד" />
          <DemoCheckRow label="אישור העברת כספים למוכר" state="open" hint="ביום החתימה" />
        </div>
        <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-900">
          שימו לב: ריבית הפריים באישור הסופי חייבת להיות זהה למה שנסגר במכרז
        </div>
      </DemoCard>

      <DemoCard
        title="בדיקת התאמה — המכרז מול האישור הסופי"
        icon={<Check className="h-4 w-4 text-emerald-600" />}
        action={<DemoPill tone="emerald">הכול תואם</DemoPill>}
      >
        <DemoTable
          head={['מסלול', 'סוכם במכרז', 'באישור הסופי', 'תואם']}
          rows={[
            ['קבועה לא צמודה', '4.90%', '4.90%', <span key="a" className="font-black text-emerald-600">✓</span>],
            ['פריים', 'P-0.60%', 'P-0.60%', <span key="b" className="font-black text-emerald-600">✓</span>],
            ['משתנה כל 5', '4.35%', '4.35%', <span key="c" className="font-black text-emerald-600">✓</span>],
            ['עמלת פתיחת תיק', '₪0', '₪0', <span key="d" className="font-black text-emerald-600">✓</span>],
          ]}
        />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <DemoStat label="החזר חודשי סופי" value="₪6,240" emphasized />
          <DemoStat label="סך ריבית" value="₪412,900" />
          <DemoStat label="חיסכון מול הסל האחיד" value="₪138,400" delta={{ text: 'נחסך', good: true }} />
        </div>
      </DemoCard>
    </div>
  ),
};

/* ================================================================== */
/* הכלים                                                              */
/* ================================================================== */

/** הכלי «מה אני יכול להרשות לעצמי» — מסך התוצאות עם המכוונים */
export function AffordabilityScreen() {
  return (
    <div dir="rtl" className="flex h-full flex-col bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 px-6 py-4">
      <ToolTopBar active="הלוואות צרכניות" />

      <div className="mt-3 text-center">
        <h1 className="text-[24px] font-black text-slate-900">התוצאות שלך</h1>
        <p className="mt-0.5 text-[12px] text-slate-600">
          הנתונים שלך: גיל 35 · הון עצמי ₪620,000 · הכנסה פנויה ₪24,800
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-center text-[12px] font-black text-slate-700">החזר חודשי צפוי</p>
          <p className="mt-1 text-center text-[26px] font-black text-violet-600">₪6,400</p>
          <div className="mt-2">
            <DemoSlider label="החזר חודשי נבחר" value="₪6,400" fill={64} min="₪0" max="₪9,900" tone="violet" />
          </div>
          <p className="mt-1.5 text-center text-[10px] text-slate-500">
            מקסימום לפי בנק ישראל: 40% מההכנסה הפנויה
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-center text-[12px] font-black text-slate-700">סכום משכנתא מקסימלי</p>
          <p className="mt-1 text-center text-[26px] font-black text-emerald-600">₪1,310,000</p>
          <div className="mt-2">
            <DemoSlider label="סכום משכנתא נבחר" value="₪1,240,000" fill={78} min="₪0" max="₪1,310,000" tone="emerald" />
          </div>
          <p className="mt-1.5 text-center text-[10px] text-slate-500">
            לאורך 24 שנים ישולמו ₪1,652,900 · מתוכם ₪412,900 ריבית
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-center text-[12px] font-black text-slate-700">מחיר נכס מקסימלי</p>
          <p className="mt-1 text-center text-[26px] font-black text-blue-600">₪1,930,000</p>
          <div className="mt-2">
            <DemoSlider label="אחוז מימון" value="66%" fill={66} min="0%" max="75%" />
          </div>
          <p className="mt-1.5 text-center text-[10px] text-slate-500">
            אחוז מימון מקסימלי לדירה ראשונה: 75%
          </p>
        </div>
      </div>

      <div className="mt-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-black text-slate-900">תקופת משכנתא:</span>
          <span className="text-[15px] font-black text-orange-600">24 שנים</span>
          <div className="flex-1">
            <DemoSlider label="" value="288 חודשים" fill={70} min="48" max="360" tone="amber" />
          </div>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2.5">
        <div className="rounded-xl bg-blue-50 px-3 py-2 text-[11.5px] font-bold text-blue-900">
          ההון העצמי שלך: ₪620,000 · הכנסה חודשית: ₪24,800
        </div>
        <div className="rounded-xl bg-violet-50 px-3 py-2 text-[11.5px] font-bold text-violet-900">
          יחס החזר מההכנסה הפנויה: 31% · אחוז מימון: 66%
        </div>
        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-[11.5px] font-bold text-emerald-900">
          נשאר לך לאחר תשלומי המשכנתא: ₪18,400 בחודש
        </div>
      </div>

      <div className="mt-2.5 grid flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-2.5">
        <DemoCard title="פירוט ההחזר החודשי" icon={<Wallet className="h-4 w-4 text-blue-600" />}>
          <div className="space-y-1.5">
            {[
              { label: 'החזר על חשבון הבנק', value: '₪6,028' },
              { label: 'ביטוח חיים לשני הלווים', value: '₪186' },
              { label: 'ביטוח מבנה', value: '₪186' },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-2.5 py-1.5"
              >
                <span className="text-[11.5px] font-bold text-slate-600">{row.label}</span>
                <span className="text-[12px] font-black text-slate-900">{row.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl bg-blue-50 px-2.5 py-1.5">
              <span className="text-[11.5px] font-black text-blue-900">סך הכול בחודש</span>
              <span className="text-[13px] font-black text-blue-700">₪6,400</span>
            </div>
          </div>
        </DemoCard>

        <DemoCard
          title="מה קורה אם הריבית תעלה"
          icon={<TrendingDown className="h-4 w-4 text-blue-600" />}
          action={<DemoPill tone="amber">סימולציית זעזוע</DemoPill>}
        >
          <DemoBars
            values={[6400, 6860, 7340, 7840]}
            colors={['#2563eb', '#0891b2', '#f59e0b', '#e11d48']}
            labels={['היום', '+1%', '+2%', '+3%']}
            height={86}
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
            כך ייראה ההחזר החודשי אם ריבית הפריים תעלה — עוד לפני שבוחרים תמהיל.
          </p>
        </DemoCard>
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-2">
        <span className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-[12px] font-bold text-slate-600">
          חזור לעריכה
        </span>
        <span className="rounded-xl bg-blue-600 px-5 py-2 text-[12px] font-black text-white shadow-lg">
          המשך לתכנון ולקיחת המשכנתא ←
        </span>
      </div>
    </div>
  );
}

/** כלי המיחזור — פאנל השליטה והדאשבורד שמתעדכן מולו */
export function RefinanceScreen() {
  return (
    <div dir="rtl" className="flex h-full flex-col bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 px-6 py-4">
      <ToolTopBar active="מיחזור משכנתא" />

      <div className="mt-3 flex items-center justify-center gap-2 text-center">
        <h1 className="text-[18px] font-black text-slate-900">מיחזור המשכנתא שלכם</h1>
        <span className="text-[12px] text-slate-500">— שנו פרמטרים בפאנל וראו מיד את התוצאה</span>
      </div>

      <div className="mt-2.5 grid flex-1 grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] items-stretch gap-2.5">
        <DemoCard title="פאנל השליטה" icon={<RefreshCw className="h-4 w-4 text-violet-600" />}>
          <div className="space-y-2">
            {[
              { name: 'קבועה צמודה', rate: '3.9% → 3.2%', fill: 42 },
              { name: 'פריים', rate: 'P-0.1% → P-0.75%', fill: 58 },
              { name: 'משתנה כל 5 צמודה', rate: '4.4% → 3.8%', fill: 36 },
            ].map((track) => (
              <div key={track.name} className="rounded-xl border border-slate-200 p-2">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[12px] font-black text-slate-900">{track.name}</span>
                  <DemoPill tone="emerald">{track.rate}</DemoPill>
                </div>
                <DemoSlider label="ריבית" value="מחושב" fill={track.fill} tone="violet" />
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-900">
            עמלת פירעון מוקדם מחושבת אוטומטית ומקוזזת מהחיסכון
          </div>
        </DemoCard>

        <div className="flex flex-col gap-2.5">
          <div className="rounded-2xl border border-slate-200 bg-white p-2.5">
            <p className="mb-1 text-[12px] font-black text-slate-900">המשכנתא הנוכחית</p>
            <div className="grid grid-cols-5 gap-2">
              <DemoStat label="החזר חודשי" value="₪7,120" emphasized />
              <DemoStat label="סך ריבית" value="₪548,300" />
              <DemoStat label="סך תשלום" value="₪1,688,300" />
              <DemoStat label="ריבית ממוצעת" value="4.42%" />
              <DemoStat label="תקופה" value="19 שנים" />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-2.5">
            <p className="mb-1 text-[12px] font-black text-emerald-900">לאחר המיחזור</p>
            <div className="grid grid-cols-5 gap-2">
              <DemoStat label="החזר חודשי" value="₪6,480" delta={{ text: '−₪640', good: true }} emphasized />
              <DemoStat label="סך ריבית" value="₪421,500" delta={{ text: '−₪126,800', good: true }} />
              <DemoStat label="סך תשלום" value="₪1,561,500" delta={{ text: '−₪126,800', good: true }} />
              <DemoStat label="ריבית ממוצעת" value="3.71%" delta={{ text: '−0.71 נק׳', good: true }} />
              <DemoStat label="תקופה" value="19 שנים" />
            </div>
          </div>

          <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-2.5">
            <p className="mb-1 text-[11px] font-bold text-slate-700">יתרת החוב — לפני ואחרי</p>
            <div className="flex flex-1 items-center">
              <DemoCurve height={150} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** כלי ניתוח ההלוואות — פאנל שליטה ודאשבורד */
export function LoansScreen() {
  return (
    <div dir="rtl" className="flex h-full flex-col bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 px-6 py-4">
      <ToolTopBar active="הלוואות צרכניות" />

      <div className="mt-3 flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
          <CreditCard className="h-4 w-4 text-white" />
        </span>
        <div className="flex-1">
          <h1 className="text-[18px] font-black text-slate-900">ניתוח ההלוואות וכלכלת המשפחה</h1>
          <p className="text-[11.5px] text-slate-600">
            מזיזים מכוון ורואים מיד מה זה עושה להחזר החודשי, לריבית הכוללת וליחס ההחזר שהבנק בוחן
          </p>
        </div>
        <DemoPill tone="blue">
          <Percent className="h-3 w-3" />
          ריבית משוקללת 11.4%
        </DemoPill>
      </div>

      <div className="mt-2.5 grid flex-1 grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] items-stretch gap-2.5">
        <DemoCard title="פאנל השליטה" icon={<Wallet className="h-4 w-4 text-orange-600" />}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'הלוואת רכב', color: '#2563eb', amount: '₪74,000', rate: '9.8%' },
              { name: 'כרטיס אשראי', color: '#e11d48', amount: '₪38,000', rate: '13.5%' },
              { name: 'הלוואה בנקאית', color: '#f59e0b', amount: '₪120,000', rate: '8.4%' },
              { name: 'הלוואה מהמעסיק', color: '#059669', amount: '₪24,000', rate: '3.2%' },
            ].map((loan) => (
              <div key={loan.name} className="rounded-xl border border-slate-200 p-2">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: loan.color }} />
                  <span className="text-[11.5px] font-black text-slate-900">{loan.name}</span>
                  <span className="mr-auto text-[11px] font-black text-blue-700">{loan.amount}</span>
                </div>
                <DemoSlider label="ריבית" value={loan.rate} fill={Number(loan.rate.replace('%', '')) * 3} tone="amber" />
              </div>
            ))}
          </div>
        </DemoCard>

        <div className="flex flex-col gap-2.5">
          <div className="rounded-2xl border border-slate-200 bg-white p-2.5">
            <p className="mb-1 text-[12px] font-black text-slate-900">התיק שלכם היום</p>
            <div className="grid grid-cols-5 gap-2">
              <DemoStat label="סך חוב" value="₪256,000" />
              <DemoStat label="החזר חודשי" value="₪5,780" emphasized />
              <DemoStat label="סך ריבית" value="₪61,400" />
              <DemoStat label="ריבית משוקללת" value="11.4%" />
              <DemoStat label="סיום" value="54 ח׳" />
            </div>
            <div className="mt-2">
              <DemoComposition
                segments={[
                  { label: 'בנקאית', share: 47, color: '#f59e0b' },
                  { label: 'רכב', share: 29, color: '#2563eb' },
                  { label: 'אשראי', share: 15, color: '#e11d48' },
                  { label: 'מעסיק', share: 9, color: '#059669' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-2">
              <p className="text-[11.5px] font-black text-rose-900">ההלוואה היקרה: כרטיס אשראי — 13.5%</p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-600">
                כל שקל פנוי שמופנה אליה קודם חוסך יותר מכל הלוואה אחרת בתיק.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2">
              <p className="text-[11.5px] font-black text-emerald-900">איחוד ב-9.4% חוסך ₪18,900 ריבית</p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-600">
                ויחס ההחזר יורד מ-23% ל-19% — בדיוק מה שהבנק בוחן לפני אישור המשכנתא.
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-2.5">
            <p className="mb-1 text-[11px] font-bold text-slate-700">החוב לאורך הזמן</p>
            <div className="flex flex-1 items-center">
              <DemoCurve height={120} />
            </div>
          </div>
        </div>
      </div>

      {/* הכפתור הצף של הפנייה ליועץ כלכלת המשפחה, כפי שהוא מופיע בכלי */}
      <div className="mt-2.5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-l from-emerald-50 to-teal-50 px-3 py-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-l from-emerald-600 to-teal-600 text-white shadow-lg">
          <Sparkles className="h-4 w-4" />
        </span>
        <p className="text-[11.5px] font-bold leading-relaxed text-emerald-900">
          עלות הייעוץ תמיד קטנה משמעותית מהכסף שתרוויחו מהאסטרטגיה שהיועץ יבנה — החיסכון בריבית
          ובעלויות, והתשואה הנוספת על הכסף שברשותכם.
        </p>
        <span className="mr-auto shrink-0 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600 px-3 py-1.5 text-[11px] font-black text-white">
          פנה ליועץ כלכלת המשפחה
        </span>
      </div>
    </div>
  );
}

/** סרגל הניווט העליון של האתר, כפי שהוא מופיע מעל הכלים */
function ToolTopBar({ active }: { active: string }) {
  const items = ['איך זה עובד', 'תמחור', 'תכנון הון עצמי', 'הלוואות צרכניות', 'מיחזור משכנתא', 'מרכז למידה'];
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5">
      <span className="text-[14px] font-black text-slate-900">משכלנתא</span>
      <nav className="flex items-center gap-3">
        {items.map((item) => (
          <span
            key={item}
            className={`text-[11px] font-bold ${item === active ? 'text-blue-600' : 'text-slate-500'}`}
          >
            {item}
          </span>
        ))}
      </nav>
      <span className="mr-auto flex items-center gap-1.5">
        <span className="rounded-lg border border-slate-200 px-2 py-1 text-[10.5px] font-bold text-slate-600">
          התחברות
        </span>
        <span className="rounded-lg bg-blue-600 px-2 py-1 text-[10.5px] font-black text-white">
          כניסה ליועצים
        </span>
      </span>
    </div>
  );
}

/* ================================================================== */
/* אינדקס המסכים                                                      */
/* ================================================================== */

export type DemoScreenId =
  | 'dashboard'
  | 'stage-analysis'
  | 'stage-mix'
  | 'stage-applications'
  | 'stage-auction'
  | 'stage-signing'
  | 'tool-affordability'
  | 'tool-refinance'
  | 'tool-loans';

export const DEMO_SCREENS: Record<DemoScreenId, { url: string; render: () => React.ReactNode }> = {
  dashboard: { url: 'mashklanta.co.il/dashboard', render: () => <DashboardScreen /> },
  'stage-analysis': {
    url: 'mashklanta.co.il/dashboard/plans/…#profile',
    render: () => <StageScreen stage="ANALYSIS" />,
  },
  'stage-mix': {
    url: 'mashklanta.co.il/dashboard/plans/…#mix',
    render: () => <StageScreen stage="MIX" />,
  },
  'stage-applications': {
    url: 'mashklanta.co.il/dashboard/plans/…#applications',
    render: () => <StageScreen stage="APPLICATIONS" />,
  },
  'stage-auction': {
    url: 'mashklanta.co.il/dashboard/plans/…#auction',
    render: () => <StageScreen stage="AUCTION" />,
  },
  'stage-signing': {
    url: 'mashklanta.co.il/dashboard/plans/…#signing',
    render: () => <StageScreen stage="SIGNING" />,
  },
  'tool-affordability': {
    url: 'mashklanta.co.il/mortgage-planning',
    render: () => <AffordabilityScreen />,
  },
  'tool-refinance': {
    url: 'mashklanta.co.il/mortgage-refinance',
    render: () => <RefinanceScreen />,
  },
  'tool-loans': { url: 'mashklanta.co.il/consumer-loans', render: () => <LoansScreen /> },
};
