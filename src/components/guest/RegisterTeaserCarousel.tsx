'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  FileStack,
  Gavel,
  LayoutDashboard,
  Layers,
  PenLine,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

/**
 * ההזמנה להרשמה שנפתחת מתוך הכלים הפתוחים.
 *
 * הלקוח שכבר הזיז את המכוונים וראה שהכלי עובד הוא הלקוח שכדאי להראות לו מה יש
 * בצד השני של ההרשמה. החלון מציג קרוסלה שמתחלפת מעצמה כל שתי שניות: הדאשבורד
 * של האזור האישי וחמשת שלבי תכנון ולקיחת המשכנתא, כשעל כל מסך הסבר קצר על מה
 * שקורה בו. אפשר לסגור אותו בכל רגע ולהמשיך לעבוד בכלי.
 */

const AUTO_ADVANCE_MS = 2000;

type TeaserSlide = {
  id: string;
  /** ההמשך של "הירשם למשכלנתא ותהנה מ…" */
  benefit: string;
  kicker: string;
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  mock: MockVariant;
};

const SLIDES: TeaserSlide[] = [
  {
    id: 'dashboard',
    benefit: 'אזור אישי שמנהל את המשכנתא שלכם מהתחלה ועד החתימה',
    kicker: 'האזור האישי',
    title: 'הדאשבורד שלכם',
    description:
      'מסך אחד שמרכז איפה אתם עומדים, מה הפעולה הבאה, אילו מסמכים חסרים ומה קרוב ביומן. כל מה שתזינו בכלים נשמר בחשבון וממשיך איתכם לשלב הבא.',
    icon: LayoutDashboard,
    gradient: 'from-slate-700 to-slate-900',
    mock: 'dashboard',
  },
  {
    id: 'analysis',
    benefit: 'פרופיל פיננסי שמגלה מה יעצור את הבקשה — לפני שהבנק מגלה',
    kicker: 'שלב 1',
    title: 'פרופיל פיננסי',
    description:
      'הכנסות מול התחייבויות, יחס החזר, הון עצמי ותקרת מימון — ודוח מלא עם המגבלות, הסיכונים והקווים המנחים לתמהיל. כך מגיעים לבנק בלי הפתעות ובלי סירוב בתיק.',
    icon: BarChart3,
    gradient: 'from-blue-500 to-cyan-500',
    mock: 'profile',
  },
  {
    id: 'applications',
    benefit: 'תיק מסמכים דיגיטלי שעובר בבנק בפעם הראשונה',
    kicker: 'שלב 2',
    title: 'אישור עקרוני',
    description:
      'רשימת מסמכים מותאמת לשכיר, לעצמאי או לבעל שליטה, עם מעקב התקדמות ובחירת הבנק שאליו מגישים — ורישום הריביות שקיבלתם באישור העקרוני.',
    icon: FileStack,
    gradient: 'from-emerald-500 to-teal-600',
    mock: 'documents',
  },
  {
    id: 'mix',
    benefit: 'תמהיל שחוסך עשרות אלפי שקלים על אותה משכנתא בדיוק',
    kicker: 'שלב 3',
    title: 'בניית תמהיל',
    description:
      'בונים תמהיל אישי מול הסלים האחידים, עם לוח סילוקין מלא, חישוב עלות אפקטיבית, סימולציית זעזוע ריבית ותכנון פירעונות מוקדמים.',
    icon: Layers,
    gradient: 'from-violet-500 to-purple-600',
    mock: 'mix',
  },
  {
    id: 'auction',
    benefit: 'מכרז ריביות בין הבנקים — במקום לקבל את ההצעה הראשונה',
    kicker: 'שלב 4',
    title: 'מכרז ריביות',
    description:
      'מזינים כל הצעה שקיבלתם ורואים מיד מה היא עושה להחזר החודשי ולסך הריבית מול התמהיל שבניתם. ההצעה שתבחרו עוברת לחתימה.',
    icon: Gavel,
    gradient: 'from-amber-500 to-orange-600',
    mock: 'auction',
  },
  {
    id: 'signing',
    benefit: 'חתימה שקטה, אחרי שבדקתם שכל תנאי תואם למה שהובטח',
    kicker: 'שלב 5',
    title: 'חתימה בבנק',
    description:
      'רשימת המסמכים שהבנק ידרוש לפי תרחיש הרכישה, ובדיקה שהתמהיל והתנאים באישור הסופי זהים בדיוק למה שתומחר במכרז.',
    icon: PenLine,
    gradient: 'from-rose-500 to-pink-600',
    mock: 'signing',
  },
];

export function RegisterTeaserCarousel({
  open,
  onOpenChange,
  onRegister,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** פתיחת ההרשמה עצמה. נסגור את הקרוסלה לפני שהיא נפתחת */
  onRegister: () => void;
}) {
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // הקרוסלה מתחלפת מעצמה כל שתי שניות, וחוזרת להתחלה בכל פתיחה מחדש
  useEffect(() => {
    if (!open) {
      setIndex(0);
      return;
    }
    timer.current = setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [open]);

  const register = useCallback(() => {
    onOpenChange(false);
    onRegister();
  }, [onOpenChange, onRegister]);

  const slide = SLIDES[index];
  const Icon = slide.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="w-[calc(100vw-1.5rem)] max-w-2xl overflow-hidden rounded-3xl border-0 bg-white p-0 text-right shadow-2xl sm:w-full [&>button]:hidden"
      >
        {/* כותרת */}
        <div className="relative bg-gradient-to-l from-blue-600 via-violet-600 to-fuchsia-600 px-5 py-4 text-white sm:px-7 sm:py-5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="סגירה"
            className="absolute left-3 top-3 rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="flex items-center gap-1.5 text-2xs font-bold text-white/80">
            <Sparkles className="h-3.5 w-3.5" />
            הכלי שאתם עובדים איתו הוא ההתחלה
          </p>
          <DialogTitle className="mt-1 text-lg font-black leading-snug sm:text-xl">
            הירשמו למשכלנתא ותהנו מ־
            <AnimatePresence mode="wait">
              <motion.span
                key={slide.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="mt-0.5 block text-info font-bold text-white/95 sm:text-base"
              >
                {slide.benefit}
              </motion.span>
            </AnimatePresence>
          </DialogTitle>
          <DialogDescription className="sr-only">
            מסכי האזור האישי ושלבי תכנון ולקיחת המשכנתא, מתחלפים מעצמם
          </DialogDescription>
        </div>

        {/* הקרוסלה */}
        <div className="px-5 py-4 sm:px-7 sm:py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35 }}
              className="grid gap-4 sm:grid-cols-[1.15fr_1fr] sm:items-center"
            >
              <MockScreen variant={slide.mock} gradient={slide.gradient} />

              <div className="min-w-0">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l ${slide.gradient} px-2.5 py-1 text-2xs font-black text-white`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {slide.kicker}
                </span>
                <h3 className="mt-2 text-base font-black text-slate-900">{slide.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {slide.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* נקודות ההתקדמות — גם מאפשרות לעצור על מסך מסוים */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {SLIDES.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(itemIndex)}
                aria-label={item.title}
                className={`h-1.5 rounded-full transition-all ${
                  itemIndex === index ? 'w-7 bg-violet-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* הפעולות */}
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row-reverse sm:items-center sm:px-7">
          <button
            type="button"
            onClick={register}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-blue-600 to-violet-600 px-6 py-3 text-button font-black text-white shadow-lg transition-all hover:shadow-xl sm:flex-1"
          >
            הרשמה חינם ופתיחת האזור האישי
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl px-4 py-2.5 text-button font-bold text-slate-500 transition-colors hover:bg-white hover:text-slate-700"
          >
            אמשיך לשחק עם הכלי
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* המסכים שבקרוסלה — הדמיה מעוצבת של המסך האמיתי                      */
/* ------------------------------------------------------------------ */

type MockVariant = 'dashboard' | 'profile' | 'documents' | 'mix' | 'auction' | 'signing';

function MockScreen({ variant, gradient }: { variant: MockVariant; gradient: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
      {/* סרגל החלון */}
      <div className={`flex items-center gap-1.5 bg-gradient-to-l ${gradient} px-3 py-2`}>
        <span className="h-2 w-2 rounded-full bg-white/70" />
        <span className="h-2 w-2 rounded-full bg-white/50" />
        <span className="h-2 w-2 rounded-full bg-white/30" />
        <span className="mr-auto text-2xs font-bold text-white/90">משכלנתא · האזור האישי</span>
      </div>

      <div className="space-y-2 p-3">
        {variant === 'dashboard' && (
          <>
            <MockBars values={[62, 100, 44]} gradient={gradient} />
            <div className="grid grid-cols-3 gap-1.5">
              <MockTile label="שלב נוכחי" value="3 מתוך 5" gradient={gradient} />
              <MockTile label="מסמכים" value="8/11" />
              <MockTile label="הפעולה הבאה" value="מכרז" />
            </div>
            <MockRows count={3} />
          </>
        )}

        {variant === 'profile' && (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              <MockTile label="יחס החזר" value="31%" gradient={gradient} />
              <MockTile label="תקרת מימון" value="75%" />
            </div>
            <MockBars values={[80, 55, 35]} gradient={gradient} />
            <MockRows count={3} />
          </>
        )}

        {variant === 'documents' && (
          <>
            <MockChecklist items={['תלושי שכר', 'דפי בנק', 'תעודת זהות', 'הסכם מכר']} />
            <MockTile label="הבנק שאליו מגישים" value="נבחר" gradient={gradient} />
          </>
        )}

        {variant === 'mix' && (
          <>
            <MockComposition segments={[40, 35, 25]} gradient={gradient} />
            <div className="grid grid-cols-3 gap-1.5">
              <MockTile label="החזר חודשי" value="₪6,240" gradient={gradient} />
              <MockTile label="סך ריבית" value="₪412K" />
              <MockTile label="תקופה" value="24 ש׳" />
            </div>
            <MockCurve />
          </>
        )}

        {variant === 'auction' && (
          <>
            <MockRows count={2} />
            <div className="grid grid-cols-3 gap-1.5">
              <MockTile label="בנק א׳" value="4.9%" />
              <MockTile label="בנק ב׳" value="4.6%" gradient={gradient} />
              <MockTile label="בנק ג׳" value="5.1%" />
            </div>
            <MockBars values={[70, 100, 52]} gradient={gradient} />
          </>
        )}

        {variant === 'signing' && (
          <>
            <MockChecklist items={['תמהיל תואם למכרז', 'ריביות תואמות', 'אישור סופי']} />
            <MockTile label="מצב התהליך" value="מוכן לחתימה" gradient={gradient} />
          </>
        )}
      </div>
    </div>
  );
}

function MockTile({
  label,
  value,
  gradient,
}: {
  label: string;
  value: string;
  gradient?: string;
}) {
  return (
    <div
      className={`rounded-lg border p-1.5 ${
        gradient ? 'border-transparent bg-slate-900 text-white' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <p className={`text-2xs font-bold ${gradient ? 'text-white/70' : 'text-slate-400'}`}>
        {label}
      </p>
      <p className={`text-2xs font-black ${gradient ? 'text-white' : 'text-slate-800'}`}>
        {value}
      </p>
    </div>
  );
}

function MockBars({ values, gradient }: { values: number[]; gradient: string }) {
  return (
    <div className="flex h-14 items-end gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
      {values.map((value, valueIndex) => (
        <span
          key={valueIndex}
          className={`flex-1 rounded-sm bg-gradient-to-t ${gradient}`}
          style={{ height: `${value}%` }}
        />
      ))}
    </div>
  );
}

function MockRows({ count }: { count: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          <span
            className="h-1.5 rounded-full bg-slate-200"
            style={{ width: `${70 - rowIndex * 14}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function MockChecklist({ items }: { items: string[] }) {
  return (
    <div className="space-y-1">
      {items.map((item, itemIndex) => (
        <div
          key={item}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1"
        >
          <span
            className={`flex h-3 w-3 items-center justify-center rounded-full text-2xs font-black text-white ${
              itemIndex === items.length - 1 ? 'bg-slate-300' : 'bg-emerald-500'
            }`}
          >
            ✓
          </span>
          <span className="text-2xs font-bold text-slate-600">{item}</span>
        </div>
      ))}
    </div>
  );
}

function MockComposition({ segments, gradient }: { segments: number[]; gradient: string }) {
  const tones = ['opacity-100', 'opacity-70', 'opacity-45'];
  return (
    <div className="flex h-5 overflow-hidden rounded-lg border border-slate-200">
      {segments.map((segment, segmentIndex) => (
        <span
          key={segmentIndex}
          className={`bg-gradient-to-l ${gradient} ${tones[segmentIndex] ?? 'opacity-30'}`}
          style={{ width: `${segment}%` }}
        />
      ))}
    </div>
  );
}

function MockCurve() {
  return (
    <svg viewBox="0 0 120 34" className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50">
      <polyline
        points="4,30 24,26 44,20 64,15 84,11 116,6"
        fill="none"
        stroke="#7c3aed"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <polyline
        points="4,31 24,29 44,26 64,23 84,20 116,17"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        strokeLinecap="round"
      />
    </svg>
  );
}
