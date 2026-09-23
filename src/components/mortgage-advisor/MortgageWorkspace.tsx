'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  BookmarkCheck,
  Home,
  LogIn,
  Plus,
  SquarePen,
  Save,
  Settings2,
  ShieldAlert,
  Table2,
  Target,
  Undo2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { ClientList } from '@/components/advisor/ClientList';
import { useAdvisorClients } from '@/components/advisor/useAdvisorClients';
import type { AdvisorClient } from '@/components/advisor/useAdvisorClients';
import { SaveMixDialog } from '@/components/advisor/SaveMixDialog';
import { useAdvisorSettings } from '@/components/advisor/useAdvisorCrm';
import { rateKey } from '@/lib/advisor-crm';
import type { SaveTarget } from './savedMixes';
import type { MixEvent, MixResult, OptimizationConstraints, WorkspaceMix } from './engine';
import { applyMarketRates, cloneWorkspaceMix, computeMix, remainingAmount } from './engine';
import {
  NoChangeNotice,
  StateBlocksRow,
  snapshotFromMixResult,
} from './analysisDashboard';
import { formatShekel } from './workspace/primitives';
import { useSavedMixes } from './savedMixes';
import type { SavedMix } from './savedMixes';
import { dealTypeOf, mixNameExistsForProperty, sameProperty } from './propertyContext';
import { checkDealLimits } from './dealGuard';
import type { DealField } from './dealGuard';
import type { DealPatch } from './workspace/PropertyHeader';
import { DEFAULT_CONSTRAINTS, useMortgageWorkspace } from './workspace/useMortgageWorkspace';
import { createFirstMix } from './workspace/firstMix';
import type { PropertySetup } from './workspace/firstMix';
import { PropertyHeader } from './workspace/PropertyHeader';
import { MixList } from './workspace/MixList';
import { MixControlPanel } from './workspace/MixControlPanel';
import { SavedMixPicker } from './workspace/SavedMixPicker';
import { RiskPanel } from './workspace/RiskPanel';
import { GoalsPanel } from './workspace/GoalsPanel';
import { EventsPanel } from './workspace/EventsPanel';
import { MixSliderSection } from './workspace/MixList';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnalysisTabs } from './workspace/AnalysisTabs';
import { AmortizationDialog } from './workspace/AmortizationDialog';
import { SnapshotDialog } from './workspace/SnapshotDialog';
import { PrepaymentDialog } from './workspace/PrepaymentDialog';
import { RefinanceDialog } from './workspace/RefinanceDialog';
import { consumeLegacyAdvisorMixes } from './workspace/legacy';
import { clearDraft, consumeStagedMix, readDraft, writeDraft } from './workspace/draft';
import type { ComparisonEntry } from './MixComparison';
import { useMarketRates } from '@/hooks/use-market-rates';
import { demoId } from '@/demo/demo-attr';

/**
 * הכלי נפתח ישר על תמהיל: 'loading' הוא רק הרגע שבו מתברר איזה תמהיל לפתוח —
 * שמור, טיוטה, או תמהיל ראשון חדש — ומיד אחריו הכלי במצב עבודה.
 */
type Phase = 'loading' | 'ready';

export interface PendingPrepay {
  mixId: string;
  trackId: string;
  amount: number;
  month: number;
  label?: string;
}

type PrepayTarget = {
  trackId?: string;
  amount?: number;
  month?: number;
  label?: string;
};

interface MortgageWorkspaceProps {
  initialMix?: WorkspaceMix;
  /** בתוך דשבורד התהליך — בלי סרגל ניווט כפול */
  embedded?: boolean;
  /** תמהילי הסלים האחידים שנשמרו בשלב הקודם — נפתחים ברשימה */
  preferredMixIds?: string[];
  /** התמהיל הפעיל בתהליך, אם כבר נבחר אחד */
  activeMixKey?: string | null;
  /** פרטי הנכס והעסקה שהתמהיל הראשון נפתח איתם (סוג עסקה, סכום ותקרת החזר מהפרופיל) */
  defaultSetupSeed?: Partial<PropertySetup>;
  /** ההכנסה הפנויה שחושבה בשלב הניתוח הפיננסי — מוצגת במכתב הבקשה לבנקים */
  disposableIncome?: number;
  /** אירועים שמצטרפים לכל תמהיל חדש — למשל פירעון מוקדם מהכנסה עתידית שהוצהרה */
  defaultEvents?: MixEvent[];
  /** ייעוד סכום עתידי למסלול בתמהיל שמור — פותח את התמהיל בניתוח ואת חלון הפרעון */
  pendingPrepay?: PendingPrepay | null;
  onPendingPrepayHandled?: () => void;
  /** כשנשמר או נטען תמהיל — כדי שהתהליך יקבל את פרטי הנכס והסכום */
  onActiveMix?: (item: SavedMix) => void;
  /**
   * עריכה תקינה של פרטי העסקה בכותרת הנכס (סכום, עלות, הון עצמי, תקרת החזר,
   * סוג עסקה, כתובת). נקרא רק אחרי שהבדיקה הרגולטורית עברה — כדי שהתהליך
   * ישמור את הנתונים ושאר המסכים ימשכו אותם משם.
   */
  onDealChange?: (deal: DealChange) => void;
  /** תהליך המשכנתא שאליו משויכות השמירות */
  planId?: string;
  /** הלקוח שהכלי נפתח עליו — כשהוא מוטמע בדף הלקוח אצל היועץ */
  clientId?: string;
  /** פתיחה של תמהיל בודד — בלי שאר תמהילי הנכס */
  soloMixKey?: string;
  /** הצגת כפתור בחירת תמהיל סופי בהשוואה */
  allowSelectFinal?: boolean;
  finalMixKey?: string | null;
  onSelectFinal?: (item: SavedMix) => void;
  /** אחרי שהתמהיל הסופי אושר — התהליך ממשיך לשלב הבא */
  onFinalConfirmed?: () => void;
  /** התמהיל הסופי נפתח חזרה לעריכה — הוא כבר לא הסופי של התהליך */
  onReopenFinal?: (item: SavedMix) => void;
}

/** פרטי העסקה אחרי עריכה שעברה את הבדיקה הרגולטורית */
export interface DealChange {
  propertyValue: number | null;
  mortgageAmount: number;
  equity: number | null;
  dealType: WorkspaceMix['dealType'];
  propertyAddress: string;
  maxMonthlyPayment: number | null;
}

/** שינוי סכום המשכנתא שומר על הרכב התמהיל — כמו ב-setTotalAmount של ה-reducer */
function rescaleTracks(mix: WorkspaceMix, amount: number): WorkspaceMix['tracks'] {
  const previous = mix.tracks.reduce((sum, track) => sum + track.amount, 0);
  if (previous > 0) {
    return mix.tracks.map((track) => ({ ...track, amount: (track.amount / previous) * amount }));
  }
  return mix.tracks.map((track, index) => ({ ...track, amount: index === 0 ? amount : 0 }));
}

/** חתימת התמהיל לזיהוי שינויים שלא נשמרו. חותמות הזמן לא נחשבות שינוי. */
function signatureOf(mix: WorkspaceMix): string {
  const { updatedAt: _updatedAt, createdAt: _createdAt, ...rest } = mix;
  return JSON.stringify(rest);
}


/**
 * מסך העבודה של יועץ המשכנתאות. הכלי נפתח ישר על תמהיל — שמור אם יש, ואחרת
 * תמהיל ראשון עם מסלול קבועה לא צמודה בשליש מהמשכנתא — וכל הבקרים, הסיכום,
 * הגרפים וההשוואה חיים באותו מסך, כשכל שינוי מחשב מחדש את התמונה כולה.
 */
export function MortgageWorkspace({
  initialMix,
  embedded = false,
  preferredMixIds,
  activeMixKey,
  defaultSetupSeed,
  disposableIncome,
  defaultEvents,
  pendingPrepay,
  onPendingPrepayHandled,
  onActiveMix,
  onDealChange,
  planId,
  clientId,
  soloMixKey,
  allowSelectFinal = false,
  finalMixKey,
  onSelectFinal,
  onFinalConfirmed,
  onReopenFinal,
}: MortgageWorkspaceProps) {
  const { mix, result, baseResult, scenarioActive, state, actions } = useMortgageWorkspace(initialMix);
  const { data: session } = useSession();
  const isAdvisor = session?.user?.role === 'ADVISOR';
  const personalAreaHref = isAdvisor ? '/advisor-dashboard' : '/dashboard';

  /** הלקוח שהתמהילים נשמרים עבורו. ריק כשעובדים בלי שיוך ללקוח */
  const [activeClientId, setActiveClientId] = useState<string | null>(clientId ?? null);
  const clients = useAdvisorClients(isAdvisor);

  const { saved, save, rename, signedIn, ready, refresh } = useSavedMixes(
    activeClientId ? { clientId: activeClientId, planId } : { planId }
  );

  // כניסה מדף הלקוח: הכלי נפתח כשהלקוח כבר נבחר, וכל שמירה נרשמת עליו — בין
  // אם הוא הוטמע בדף הלקוח ובין אם נפתח ממנו בקישור
  const [enteredFromClient, setEnteredFromClient] = useState(Boolean(clientId));
  useEffect(() => {
    if (clientId) return;
    const requested = new URLSearchParams(window.location.search).get('client');
    if (requested) {
      setActiveClientId(requested);
      setEnteredFromClient(true);
    }
  }, [clientId]);

  /**
   * ריביות ברירת המחדל של היועץ נטענות פעם אחת ומוזרקות לאזור העבודה, כדי שכל
   * מסלול חדש ייפתח עם הריבית ששמורה בהגדרות לאותו בנק וללוח הסילוקין שלו.
   */
  const advisorSettings = useAdvisorSettings(isAdvisor);
  useEffect(() => {
    if (!isAdvisor) return;
    const map: Record<string, number> = {};
    const spreads: Record<string, number> = {};
    advisorSettings.settings.rates.forEach((item) => {
      const key = rateKey(item.bank, item.amortizationType, item.trackType);
      map[key] = item.rate;
      if (typeof item.spread === 'number' && Number.isFinite(item.spread)) spreads[key] = item.spread;
    });
    actions.setRateDefaults(map, spreads);
  }, [isAdvisor, advisorSettings.settings.rates, actions]);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const [phase, setPhase] = useState<Phase>(initialMix ? 'ready' : 'loading');
  /** התמהיל החדש שנבנה עכשיו בכלי וטרם נשמר — עד שכל סכום המשכנתא משובץ */
  const [newMixId, setNewMixId] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [amortizationTarget, setAmortizationTarget] = useState<{ trackId?: string } | null>(null);
  const [prepayTarget, setPrepayTarget] = useState<PrepayTarget | null>(null);
  const [refinanceTarget, setRefinanceTarget] = useState<{ trackId?: string } | null>(null);
  /**
   * רשימת השינויים המתוכננים ירדה מהזרימה שמתחת לגרפים ועברה לחלון שנפתח
   * מהשורה. היא נדרשת רק כשיש מה להסיר, ולא הצדיקה שורה קבועה מתחת לדאשבורד.
   */
  const [eventsOpen, setEventsOpen] = useState(false);
  /**
   * מחזור נפתח רק על התמהיל שנבחר כסופי. בשלב תכנון התמהיל אין משמעות למחזור —
   * מה שרוצים לשנות משנים במסלול עצמו, ולא כאירוע עתידי על תמהיל שעוד לא נבחר.
   */
  const isFinalMix = mix.locked || (Boolean(finalMixKey) && mix.id === finalMixKey);

  const [showRisk, setShowRisk] = useState(false);
  const [showGoals, setShowGoals] = useState(false);

  /**
   * הריביות והעקומים של בנק ישראל נמשכים בכל טעינה של הכלי ומתגלגלים לתמהיל:
   * העקומים נכנסים להנחות, והעוגן החי מעדכן את הריבית של כל מסלול שיש עליו
   * מרווח. כך ההחזרים, סך הריבית ולוח ההחזרים תמיד לפי המצב העדכני בשוק.
   */
  const { snapshot: marketRates } = useMarketRates();
  useEffect(() => {
    actions.applyMarketRates(marketRates);
    // dispatch יציב; התלות היחידה שמעניינת היא התצלום עצמו
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketRates]);

  /** התמהיל שבניתוח נפתח סגור, כמו כל שאר התמהילים ברשימה */
  const [editorExpanded, setEditorExpanded] = useState(false);
  /** המסלול שמוצג כרגע באזור הגרפים. null — כל התמהיל */
  const [focusTrackId, setFocusTrackId] = useState<string | null>(null);
  /**
   * התמהיל כפי שנפתח בפאנל, לפני השינויים. מולו נמדד "מה השתנה" בדאשבורד,
   * כדי שהיועץ יראה בדיוק מה עשה השינוי שביצע.
   */
  const [panelBaseline, setPanelBaseline] = useState<WorkspaceMix | null>(null);

  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [flashSave, setFlashSave] = useState(false);
  /** משוב אחרי "שמור תמהיל": ההודעה נשארת כמה שניות, ההנפשה של כפתור הטעינה פעם אחת */
  const [saveFeedback, setSaveFeedback] = useState<{ message: string; nudge: boolean } | null>(null);
  const saveFeedbackTimers = useRef<number[]>([]);
  /** תמהיל ששוכפל או נשמר כחדש ומחכה לשם לפני שהוא נשאר באזור העבודה */
  const [pendingCloneId, setPendingCloneId] = useState<string | null>(null);
  const [savedPickerOpen, setSavedPickerOpen] = useState(false);
  const [hiddenFromPage, setHiddenFromPage] = useState<Set<string>>(() => new Set());
  const [nameNotice, setNameNotice] = useState<string | null>(null);

  const signature = useMemo(() => signatureOf(mix), [mix]);
  const dirty = phase === 'ready' && signature !== savedSignature;

  const profileCap = defaultSetupSeed?.maxMonthlyPayment;
  const withProfileCap = useCallback(
    (next: WorkspaceMix): WorkspaceMix => {
      if (!profileCap || profileCap <= 0 || (next.maxMonthlyPayment ?? 0) > 0) return next;
      return { ...next, maxMonthlyPayment: profileCap };
    },
    [profileCap]
  );

  /**
   * סימון שהכלי כבר קיבל תמהיל לעבודה. הוא נקבע בתוך `openMix` כדי שכל הפותחים —
   * תמהיל שמור, סל אחיד, טיוטה — יסמנו אותו מיד, בלי להמתין לרינדור הבא, וכך
   * פתיחת התמהיל הראשון החדש לא תדרוס תמהיל שכבר נפתח באותו מחזור.
   */
  const mixClaimed = useRef(Boolean(initialMix));

  const openMix = useCallback(
    (next: WorkspaceMix, constraints?: OptimizationConstraints) => {
      mixClaimed.current = true;
      // כל תמהיל שנפתח מתומחר מחדש לפי הנתונים שנמשכו מבנק ישראל, גם אם נשמר
      // לפני חודשים עם ריביות אחרות.
      const withCap = withProfileCap(applyMarketRates(next, marketRates));
      // תקרת ההחזר שנקבעה ללקוח היא גם התקרה שהאופטימיזציה עובדת מולה
      actions.load(
        withCap,
        constraints ?? {
          ...DEFAULT_CONSTRAINTS,
          maxMonthlyPayment: withCap.maxMonthlyPayment,
        }
      );
      setSavedSignature(signatureOf(withCap));
      setSelectedMonth(null);
      // נקודת הייחוס של "מה השתנה" היא התמהיל כפי שנפתח כאן
      setPanelBaseline(withCap);
      setFocusTrackId(null);
      setPhase('ready');
    },
    [actions, withProfileCap, marketRates]
  );

  // תמהילים שהגיעו משלב אחר: פתיחת תמהיל שמור מהאזור האישי, או הסלים האחידים
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current || initialMix) {
      bootstrapped.current = true;
      return;
    }
    bootstrapped.current = true;

    // בתהליך התכנון לא שואבים תמהיל ששוגר מכלי אחר — הלקוח מזין נכס ומשכנתא מאפס
    if (embedded) return;

    const staged = consumeStagedMix();
    if (staged) {
      openMix(staged);
      return;
    }

    const incoming = consumeLegacyAdvisorMixes();
    if (incoming.length > 0) {
      incoming.forEach((item) => save(item));
      openMix(incoming[incoming.length - 1]);
      actions.setCompared(incoming.map((item) => item.id));
    }
  }, [initialMix, save, actions, openMix, embedded]);

  // הטיוטה נשמרת רק כשיש תמהיל בעבודה, כדי שהכלי ייפתח נקי בפעם הבאה אלא אם
  // היועץ יבחר במפורש להמשיך ממנה
  useEffect(() => {
    if (phase !== 'ready') return;
    if (embedded) return;
    writeDraft({ mix, constraints: state.constraints });
  }, [phase, mix, state.constraints, embedded]);

  /**
   * כפתור השמירה מהבהב פעם אחת כשנוצר שינוי, ולא באופן מתמשך. בזמן גרירת
   * סליידר נוצרים שינויים רצופים, ולכן ההבזק מווסת לאחד לכל שתי שניות וחצי.
   */
  const previousSignature = useRef<string | null>(null);
  const lastFlashAt = useRef(0);
  useEffect(() => {
    if (phase !== 'ready') return;
    const previous = previousSignature.current;
    previousSignature.current = signature;
    if (previous === null || previous === signature || signature === savedSignature) return;

    const now = Date.now();
    if (now - lastFlashAt.current < 2500) return;
    lastFlashAt.current = now;

    setFlashSave(true);
    const timer = window.setTimeout(() => setFlashSave(false), 900);
    return () => window.clearTimeout(timer);
  }, [phase, signature, savedSignature]);

  const notifyActive = useCallback(
    (item: SavedMix) => {
      onActiveMix?.(item);
    },
    [onActiveMix]
  );

  const preferredKey = (preferredMixIds ?? []).join('|');
  const basketsOpened = useRef(false);
  /**
   * בפתיחת הכלי נפתח התמהיל שהמשתמש עבד עליו לאחרונה, ואם אין כזה — האחרון
   * שנוצר. הסלים האחידים אינם נבחרים להשוואה מאליהם: השוואה היא פעולה שהמשתמש
   * מבקש, ובחירה אוטומטית שלהם הציפה את המסך בתמהילים שלא ביקש לראות.
   */
  useEffect(() => {
    if (basketsOpened.current || initialMix || !ready) return;
    const ids = preferredKey ? preferredKey.split('|') : [];
    if (ids.length === 0) return;

    const matches = ids
      .map((id) => saved.find((item) => item.mix.id === id))
      .filter((item): item is SavedMix => Boolean(item));
    if (matches.length === 0) return;

    basketsOpened.current = true;
    const mostRecent = [...matches].sort(
      (a, b) =>
        Date.parse(b.mix.updatedAt || b.mix.createdAt || '') -
        Date.parse(a.mix.updatedAt || a.mix.createdAt || '')
    )[0];
    const selected =
      (activeMixKey ? matches.find((item) => item.mix.id === activeMixKey) : undefined) ??
      mostRecent ??
      matches[0];
    notifyActive(selected);
    openMix(selected.mix);
    actions.setCompared([]);
  }, [ready, saved, preferredKey, activeMixKey, initialMix, openMix, actions, notifyActive]);

  const soloOpened = useRef(false);
  useEffect(() => {
    if (soloOpened.current || !soloMixKey || !ready) return;
    const item = saved.find((entry) => entry.mix.id === soloMixKey);
    if (!item) return;
    soloOpened.current = true;
    notifyActive(item);
    openMix(item.mix);
    actions.setCompared([]);
  }, [ready, saved, soloMixKey, openMix, actions, notifyActive]);

  /**
   * כשהכלי מוטמע בדף לקוח, הוא נפתח על התמהיל האחרון שנשמר לו — כדי ששורת
   * התמהילים של אותו לקוח תוצג מיד, ולא מסך פתיחה ריק.
   */
  const clientMixOpened = useRef(false);
  useEffect(() => {
    if (!clientId || clientMixOpened.current || initialMix || !ready) return;
    if (mixClaimed.current || saved.length === 0) return;
    const newest = [...saved].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    )[0];
    clientMixOpened.current = true;
    notifyActive(newest);
    openMix(newest.mix);
  }, [clientId, ready, saved, initialMix, openMix, notifyActive]);

  /**
   * אין מסך ביניים: אם אף תמהיל שמור לא נתפס לאזור העבודה, הכלי נפתח על תמהיל
   * ראשון חדש — פרטי הנכס מהשלבים הקודמים ומסלול קבועה לא צמודה בשליש מהמשכנתא —
   * ומכאן ממשיכים בתוך הכלי עצמו. טיוטה שנשארה מהפעם הקודמת קודמת לתמהיל חדש,
   * כדי שעבודה שלא נשמרה לא תאבד.
   */
  const firstMixSeeded = useRef(false);
  useEffect(() => {
    if (firstMixSeeded.current || mixClaimed.current || initialMix || !ready) return;
    firstMixSeeded.current = true;

    const draft = embedded ? null : readDraft();
    if (draft && draft.mix.tracks.length > 0) {
      // טיוטה שלא הגיעה לשמירה ממשיכה להיחשב תמהיל בבנייה, ותישמר כשתכוסה במלואה
      if (!saved.some((item) => item.mix.id === draft.mix.id)) setNewMixId(draft.mix.id);
      openMix(draft.mix, draft.constraints);
      setEditorExpanded(true);
      return;
    }

    const first = createFirstMix({ seed: defaultSetupSeed, existingMixes: saved });
    setNewMixId(first.id);
    openMix(first);
    setEditorExpanded(true);
  }, [ready, initialMix, embedded, defaultSetupSeed, saved, openMix]);

  const persistMix = useCallback(
    (next: WorkspaceMix) => {
      if (next.locked) return;
      void save(next).then((stored) => notifyActive(stored));
    },
    [save, notifyActive]
  );

  // מתהליך חמשת השלבים: אם לתמהיל אין תקרת החזר, ממלאים 40% מההכנסה הפנויה
  useEffect(() => {
    if (phase !== 'ready') return;
    if (!profileCap || profileCap <= 0) return;
    if ((mix.maxMonthlyPayment ?? 0) > 0) return;
    actions.patchMix({ maxMonthlyPayment: profileCap });
    actions.setConstraints({ maxMonthlyPayment: profileCap });
  }, [phase, mix.id, mix.maxMonthlyPayment, profileCap, actions]);

  /** תמהיל חדש שנבנה עכשיו בכלי וטרם כוסה במלואו */
  const buildingNewMix = phase === 'ready' && newMixId === mix.id;

  /**
   * התמהיל החדש נשמר ברגע שכל סכום המשכנתא שובץ במסלולים — זו נקודת ה"נוצר"
   * שלו. מכאן הוא תמהיל רגיל לכל דבר, וכל שינוי נוסף נשמר כרגיל דרך הכלי.
   */
  const autoSavedId = useRef<string | null>(null);
  useEffect(() => {
    if (!buildingNewMix) return;
    if (mix.totalAmount <= 0 || mix.tracks.length === 0) return;
    if (remainingAmount(mix) > 0) return;
    if (autoSavedId.current === mix.id) return;

    autoSavedId.current = mix.id;
    persistMix(mix);
    setSavedSignature(signatureOf(mix));
    setNewMixId(null);
  }, [buildingNewMix, mix, persistMix]);

  /**
   * שמירת המצב הנוכחי כתמהיל חדש: המקור נשאר כמו שנשמר, והעותק עם השינויים
   * עולה לאזור העבודה עם שדה שם ריק.
   */
  const saveAsNewMix = useCallback(() => {
    const clone = cloneWorkspaceMix(mix, { name: '' });
    setPendingCloneId(clone.id);
    openMix(clone);
    setEditorExpanded(true);
    setFlashSave(false);
    void save(clone).then((stored) => notifyActive(stored));
  }, [mix, openMix, save, notifyActive]);

  /**
   * שמירת התמהיל שבעבודה כמו שהוא — כפתור "שמור תמהיל" של הלקוח. אחרי השמירה
   * מוצגת ההודעה "התמהיל נשמר", וכפתור "טען תמהיל" מודגש פעם אחת כדי להראות
   * מאיפה טוענים אותו ומשווים אליו.
   */
  const saveCurrentMix = useCallback(() => {
    if (phase !== 'ready' || mix.tracks.length === 0 || mix.locked) return;
    persistMix(mix);
    setSavedSignature(signatureOf(mix));
    setFlashSave(false);
    saveFeedbackTimers.current.forEach((timer) => window.clearTimeout(timer));
    setSaveFeedback({ message: 'התמהיל נשמר', nudge: true });
    saveFeedbackTimers.current = [
      window.setTimeout(() => setSaveFeedback((current) => (current ? { ...current, nudge: false } : null)), 1600),
      window.setTimeout(() => setSaveFeedback(null), 6000),
    ];
  }, [phase, mix, persistMix]);

  useEffect(
    () => () => {
      saveFeedbackTimers.current.forEach((timer) => window.clearTimeout(timer));
    },
    []
  );

  /** הודעת חסימה מעריכת פרטי העסקה שחרגה ממגבלות בנק ישראל */
  const [dealNotice, setDealNotice] = useState<string | null>(null);

  /**
   * עריכת פרטי העסקה מכותרת הנכס. כל השדות התלויים נגזרים מהמצב הסופי —
   * ההון העצמי מעלות הנכס פחות המשכנתא, יחס המימון משניהם, וההחזר החודשי
   * מהתמהיל אחרי שינוי הסכום — ורק אם אף מגבלה לא נחרגה השינוי נכנס לתמהיל
   * ונשלח לתהליך לשמירה. עריכה שחורגת נחסמת עם ההסבר ולא נשמרת.
   */
  const commitDeal = useCallback(
    (patch: DealPatch, edited: DealField): boolean => {
      if (mix.locked) return false;
      if (edited === 'propertyAddress') {
        const propertyAddress = patch.propertyAddress?.trim() || undefined;
        actions.patchMix({ propertyAddress });
        onDealChange?.({
          propertyValue: mix.propertyValue ?? null,
          mortgageAmount: Math.round(mix.totalAmount),
          equity: mix.propertyValue ? Math.max(0, Math.round(mix.propertyValue - mix.totalAmount)) : null,
          dealType: dealTypeOf(mix),
          propertyAddress: propertyAddress ?? '',
          maxMonthlyPayment: mix.maxMonthlyPayment ?? null,
        });
        return true;
      }
      const nextTotal = patch.totalAmount ?? mix.totalAmount;
      const candidate: WorkspaceMix = {
        ...mix,
        ...(patch.propertyValue !== undefined
          ? { propertyValue: patch.propertyValue > 0 ? patch.propertyValue : undefined }
          : {}),
        ...(patch.dealType ? { dealType: patch.dealType } : {}),
        ...(patch.propertyAddress !== undefined
          ? { propertyAddress: patch.propertyAddress.trim() || undefined }
          : {}),
        ...(patch.maxMonthlyPayment !== undefined
          ? { maxMonthlyPayment: patch.maxMonthlyPayment > 0 ? patch.maxMonthlyPayment : undefined }
          : {}),
        totalAmount: nextTotal,
        tracks: patch.totalAmount !== undefined ? rescaleTracks(mix, nextTotal) : mix.tracks,
      };
      const monthlyPayment =
        patch.totalAmount !== undefined
          ? computeMix(candidate).summary.monthlyPayment
          : result.summary.monthlyPayment;

      const violations = checkDealLimits(
        {
          propertyValue: candidate.propertyValue ?? 0,
          totalAmount: nextTotal,
          dealType: dealTypeOf(candidate),
          maxMonthlyPayment: candidate.maxMonthlyPayment,
          monthlyPayment,
          profileCap,
        },
        edited
      );
      if (violations.length > 0) {
        setDealNotice(violations.map((violation) => violation.message).join(' '));
        return false;
      }
      setDealNotice(null);

      const mixPatch: Partial<WorkspaceMix> = {};
      if (patch.propertyValue !== undefined) mixPatch.propertyValue = candidate.propertyValue;
      if (patch.dealType) mixPatch.dealType = candidate.dealType;
      if (patch.propertyAddress !== undefined) mixPatch.propertyAddress = candidate.propertyAddress;
      if (patch.maxMonthlyPayment !== undefined) mixPatch.maxMonthlyPayment = candidate.maxMonthlyPayment;
      if (Object.keys(mixPatch).length > 0) actions.patchMix(mixPatch);
      if (patch.totalAmount !== undefined) actions.setTotalAmount(nextTotal);
      if (patch.maxMonthlyPayment !== undefined && (candidate.maxMonthlyPayment ?? 0) > 0) {
        actions.setConstraints({ maxMonthlyPayment: candidate.maxMonthlyPayment });
      }

      const propertyValue = candidate.propertyValue ?? null;
      onDealChange?.({
        propertyValue,
        mortgageAmount: Math.round(nextTotal),
        equity: propertyValue && propertyValue > 0 ? Math.max(0, Math.round(propertyValue - nextTotal)) : null,
        dealType: dealTypeOf(candidate),
        propertyAddress: candidate.propertyAddress ?? '',
        maxMonthlyPayment: candidate.maxMonthlyPayment ?? null,
      });
      return true;
    },
    [mix, result.summary.monthlyPayment, profileCap, actions, onDealChange]
  );

  /**
   * תמהיל חדש נוסף לרשימה ולא מחליף את הקודם, ולכן כל מעבר לתמהיל אחר שומר
   * קודם את זה שבעבודה. כך התמהילים נערמים תחת אותו נכס במקום להידרס.
   */
  const keepCurrentMix = useCallback((): boolean => {
    if (phase !== 'ready' || mix.tracks.length === 0) return false;
    // תמהיל חדש שסכום המשכנתא בו טרם שובץ במלואו עדיין לא נוצר, ולכן אינו נשמר
    if (newMixId === mix.id && remainingAmount(mix) > 0) return false;
    if (dirty) {
      persistMix(mix);
      setSavedSignature(signatureOf(mix));
    }
    return true;
  }, [phase, mix, dirty, persistMix, newMixId]);

  const openSavedMix = useCallback(
    (item: SavedMix) => {
      setHiddenFromPage((prev) => {
        if (!prev.has(item.mix.id)) return prev;
        const next = new Set(prev);
        next.delete(item.mix.id);
        return next;
      });
      const previousId = mix.id;
      const hadTracks = mix.tracks.length > 0;
      keepCurrentMix();
      // התמהיל שהיה בפאנל עובר להשוואה, כך שהתמהיל החדש נמדד מולו
      if (hadTracks && previousId !== item.mix.id && !state.comparedIds.includes(previousId)) {
        actions.toggleCompared(previousId);
      }
      // התמהיל נשאר משויך ללקוח שלו, גם כשמגיעים אליו מהאזור האישי
      if (item.clientId) setActiveClientId(item.clientId);
      notifyActive(item);
      openMix(item.mix);
      setEditorExpanded(true);
    },
    [keepCurrentMix, openMix, notifyActive, mix.id, mix.tracks.length, state.comparedIds, actions]
  );

  /**
   * שכפול: אותם פרמטרים, שם ריק. העותק עולה מיד לאזור העבודה כדי שלא יישאר
   * ריק עד בחירת תמהיל אחר, ושדה השם נפתח על השורה הפעילה.
   */
  const duplicateMix = useCallback(
    (source: WorkspaceMix) => {
      keepCurrentMix();
      const clone = cloneWorkspaceMix(source, { name: '' });
      setPendingCloneId(clone.id);
      openMix(clone);
      setEditorExpanded(true);
      void save(clone).then((stored) => notifyActive(stored));
    },
    [keepCurrentMix, openMix, save, notifyActive]
  );

  /**
   * תמהיל שהריביות בו התקבלו מבנק נשמר כתמהיל רגיל לאותו נכס, ומופיע ברשימה
   * עם סימון הבנק ותאריך ההצעה. המקור נשאר כמו שהוא, ולכן אפשר להזין ריביות
   * לאותו תמהיל שוב, מבנק אחר או בסבב נוסף.
   */
  const saveBankQuote = useCallback(
    async (quoted: WorkspaceMix) => {
      const stored = await save(quoted);
      notifyActive(stored);
      await refresh();
    },
    [save, notifyActive, refresh]
  );

  const openBankQuote = useCallback(
    (quoted: WorkspaceMix) => {
      keepCurrentMix();
      openMix(quoted);
      setEditorExpanded(true);
    },
    [keepCurrentMix, openMix]
  );

  const renameMix = useCallback(
    (id: string, name: string): boolean => {
      const item = saved.find((entry) => entry.mix.id === id);
      if (
        item &&
        mixNameExistsForProperty(name, item.mix, saved, id)
      ) {
        setNameNotice('כבר קיים תמהיל בשם הזה לנכס זה. בחרו שם ייחודי.');
        return false;
      }
      setNameNotice(null);
      void rename(id, name);
      if (id === pendingCloneId) setPendingCloneId(null);
      return true;
    },
    [rename, pendingCloneId, saved]
  );

  const renameActiveMix = useCallback(
    (name: string): boolean => {
      if (mixNameExistsForProperty(name, mix, saved, mix.id)) {
        setNameNotice('כבר קיים תמהיל בשם הזה לנכס זה. בחרו שם ייחודי.');
        return false;
      }
      setNameNotice(null);
      const next = { ...mix, name };
      actions.patchMix({ name });
      persistMix(next);
      setSavedSignature(signatureOf(next));
      if (pendingCloneId === mix.id) setPendingCloneId(null);
      return true;
    },
    [actions, persistMix, mix, pendingCloneId, saved]
  );

  const plannedPrepay = useMemo(() => {
    const event = defaultEvents?.find((item) => item.kind === 'prepayment');
    return event && event.kind === 'prepayment' ? event : undefined;
  }, [defaultEvents]);

  const consumedPrepay = useRef<PendingPrepay | null>(null);
  useEffect(() => {
    if (!pendingPrepay) {
      consumedPrepay.current = null;
      return;
    }
    if (consumedPrepay.current === pendingPrepay) return;

    const openDialog = () => {
      consumedPrepay.current = pendingPrepay;
      setPrepayTarget({
        trackId: pendingPrepay.trackId,
        amount: pendingPrepay.amount,
        month: pendingPrepay.month,
        label: pendingPrepay.label,
      });
      setEditorExpanded(true);
      onPendingPrepayHandled?.();
    };

    if (mix.id === pendingPrepay.mixId) {
      if (phase !== 'ready') openMix(mix);
      openDialog();
      return;
    }

    const item = saved.find((entry) => entry.mix.id === pendingPrepay.mixId);
    if (!item) return;
    openSavedMix(item);
    openDialog();
  }, [pendingPrepay, mix, phase, saved, openMix, openSavedMix, onPendingPrepayHandled]);


  /**
   * תמהיל חדש נבנה בתוך הכלי עצמו: התמהיל שבעבודה נשמר, ובמקומו נפתח תמהיל
   * עם אותם פרטי נכס ומסלול פתיחה אחד, מוכן להוספת מסלולים.
   */
  const startNewMix = useCallback(
    (seed?: Partial<PropertySetup>) => {
      keepCurrentMix();
      const next = createFirstMix({ seed: seed ?? defaultSetupSeed, existingMixes: saved });
      setNewMixId(next.id);
      openMix(next);
      setEditorExpanded(true);
    },
    [keepCurrentMix, defaultSetupSeed, saved, openMix]
  );

  /** תמהיל נוסף לאותו נכס — פרטי הנכס והעסקה עוברים כמו שהם */
  const startMixForSameProperty = useCallback(() => {
    startNewMix({
      propertyValue: mix.propertyValue ?? 0,
      dealType: dealTypeOf(mix),
      totalAmount: mix.totalAmount,
      maxMonthlyPayment: mix.maxMonthlyPayment ?? 0,
      propertyAddress: mix.propertyAddress ?? '',
    });
  }, [mix, startNewMix]);

  /**
   * הסרת התמהיל האחרון מאזור העבודה לא משאירה מסך ריק — הוא נשמר בתמהילים
   * השמורים, ובמקומו נפתח תמהיל חדש לאותו נכס.
   */
  const resetToNewMix = useCallback(() => {
    if (keepCurrentMix()) clearDraft();
    startNewMix({
      propertyValue: mix.propertyValue ?? 0,
      dealType: dealTypeOf(mix),
      totalAmount: mix.totalAmount,
      maxMonthlyPayment: mix.maxMonthlyPayment ?? 0,
      propertyAddress: mix.propertyAddress ?? '',
    });
  }, [keepCurrentMix, startNewMix, mix]);

  /**
   * השוואה נעשית רק בין תמהילים לאותו נכס — או לאותו סכום משכנתא כשלא הוזנה
   * כתובת — כדי שההשוואה תהיה בין חלופות לאותה עסקה.
   */
  const propertyMixes = useMemo(
    () =>
      saved.filter((item) => {
        if (soloMixKey && item.mix.id !== soloMixKey) return false;
        if (planId && item.planId && item.planId !== planId) return false;
        return (
          item.mix.id !== mix.id &&
          sameProperty(item.mix, mix) &&
          !hiddenFromPage.has(item.mix.id)
        );
      }),
    [saved, mix, hiddenFromPage, planId, soloMixKey]
  );

  const propertySavedMixes = useMemo(
    () => saved.filter((item) => sameProperty(item.mix, mix)),
    [saved, mix]
  );

  const comparedCount = useMemo(
    () => propertyMixes.filter((item) => state.comparedIds.includes(item.mix.id)).length,
    [propertyMixes, state.comparedIds]
  );

  /**
   * הכיתוב של אזור העבודה כשבונים בו תמהיל חדש. התמהיל הראשון לנכס הוא נקודת
   * הפתיחה להשוואה, ולכן הוא מסומן ככזה.
   */
  const buildLabel = buildingNewMix
    ? propertyMixes.length === 0
      ? 'בנה תמהיל ראשון להשוואה'
      : 'בנה תמהיל נוסף להשוואה'
    : null;

  /**
   * סימון תמהיל מכניס אותו לאזור העבודה להשוואה. אין תקרה על מספר התמהילים —
   * הטבלה והגרפים שמתחת מציגים את כולם יחד.
   */
  const toggleCompared = useCallback((id: string) => actions.toggleCompared(id), [actions]);

  /** סיווג התמהיל לצורך הקיבוץ בסרגל הבחירה — זהה לזה שברשימת התמהילים */
  const originOf = useCallback(
    (item: SavedMix): 'quote' | 'bank' | 'custom' => {
      if (item.mix.quote) return 'quote';
      return (preferredMixIds ?? []).includes(item.mix.id) ? 'bank' : 'custom';
    },
    [preferredMixIds]
  );

  const dismissFromPage = useCallback(
    (id: string) => {
      setHiddenFromPage((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      if (state.comparedIds.includes(id)) actions.toggleCompared(id);

      if (id !== mix.id) return;

      const remaining = propertyMixes.filter((item) => !hiddenFromPage.has(item.mix.id));
      if (remaining[0]) {
        openSavedMix(remaining[0]);
        return;
      }
      resetToNewMix();
    },
    [state.comparedIds, actions, mix.id, propertyMixes, hiddenFromPage, openSavedMix, resetToNewMix]
  );

  const restoreSavedMix = useCallback(
    (item: SavedMix) => {
      const wasHidden = hiddenFromPage.has(item.mix.id);
      setHiddenFromPage((prev) => {
        if (!prev.has(item.mix.id)) return prev;
        const next = new Set(prev);
        next.delete(item.mix.id);
        return next;
      });
      setSavedPickerOpen(false);
      if (!wasHidden && item.mix.id !== mix.id) openSavedMix(item);
    },
    [hiddenFromPage, mix.id, openSavedMix]
  );

  /**
   * התמהיל כפי שנפתח בפאנל — הבסיס לשורת "מה השתנה".
   *
   * הוא מחושב עם ההנחות הנוכחיות ולא עם אלה שהיו ברגע הפתיחה: עקומי הפריים
   * והאינפלציה נטענים מהשרת אחרי הפתיחה, ותרחיש ריבית חל על שני הצדדים.
   * בלי היישור הזה ההפרש היה מציג את טעינת העקום כאילו היא שינוי שהיועץ ביצע.
   */
  const baselineResult = useMemo<MixResult | null>(
    () =>
      panelBaseline
        ? computeMix({ ...panelBaseline, assumptions: mix.assumptions })
        : null,
    [panelBaseline, mix.assumptions]
  );

  /** האם השינויים בפאנל הזיזו את המספרים */
  const panelChanged = useMemo(() => {
    if (!baselineResult) return false;
    const a = result.summary;
    const b = baselineResult.summary;
    return (
      Math.abs(a.monthlyPayment - b.monthlyPayment) > 1 ||
      Math.abs(a.totalInterest - b.totalInterest) > 1 ||
      Math.abs(a.totalPaid - b.totalPaid) > 1 ||
      Math.abs(a.months - b.months) > 0.5
    );
  }, [result.summary, baselineResult]);

  const comparisonEntries = useMemo<ComparisonEntry[]>(() => {
    const compared = propertyMixes.filter((item) => state.comparedIds.includes(item.mix.id));
    if (compared.length === 0) return [];
    return [
      {
        id: mix.id,
        label: `${mix.name || 'תמהיל בעבודה'}${mix.locked ? ' · סופי' : ' (בעבודה)'}`,
        mix,
        current: true,
        recordId: saved.find((item) => item.mix.id === mix.id)?.recordId,
        isFinal: mix.id === finalMixKey || mix.locked,
        locked: mix.locked,
      },
      ...compared.map((item) => ({
        id: item.mix.id,
        label: item.mix.name,
        mix: item.mix,
        recordId: item.recordId,
        isFinal: item.mix.id === finalMixKey || Boolean(item.isFinal),
        locked: Boolean(item.locked),
      })),
    ];
  }, [state.comparedIds, propertyMixes, mix, saved, finalMixKey]);

  /**
   * בחירת התמהיל הסופי היא מעבר חד-כיווני: התמהיל ננעל, הוא זה שנשלח לבנקים
   * לתמחור, והתהליך עובר לשלב הבא. לכן היא עוברת קודם דרך חלון אישור שאומר
   * בדיוק את זה, ורק "אישור" בו מבצע אותה.
   */
  const [finalCandidateId, setFinalCandidateId] = useState<string | null>(null);
  const [confirmingFinal, setConfirmingFinal] = useState(false);

  const selectFinalMix = useCallback(
    async (entryId: string) => {
      if (!planId || !allowSelectFinal) return;
      const fromList = saved.find((item) => item.mix.id === entryId);
      const item = fromList ?? (entryId === mix.id ? await save(mix) : null);
      if (!item?.recordId) return;
      const response = await fetch(`/api/mixes/${item.recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFinal: true, planId }),
      });
      if (!response.ok) return;
      const stored = (await response.json()) as SavedMix;
      onSelectFinal?.(stored);
      await refresh();
      if (!stored.mix || stored.mix.id === mix.id) {
        actions.patchMix({ locked: true });
      }
      onFinalConfirmed?.();
    },
    [planId, allowSelectFinal, saved, mix, save, onSelectFinal, actions, refresh, onFinalConfirmed]
  );

  /**
   * פתיחת התמהיל הסופי חזרה לעריכה. הנעילה יורדת והבחירה כסופי מתבטלת — כדי
   * שהלקוח לא ישלח לבנקים תמהיל ששונה אחרי שנבחר. בחירה מחדש נועלת שוב.
   */
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopening, setReopening] = useState(false);

  const reopenFinalMix = useCallback(async () => {
    setReopening(true);
    try {
      const item = saved.find((entry) => entry.mix.id === mix.id);
      if (planId && item?.recordId) {
        const response = await fetch(`/api/mixes/${item.recordId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFinal: false, planId }),
        });
        if (!response.ok) return;
        const stored = (await response.json()) as SavedMix;
        onReopenFinal?.(stored);
        await refresh();
      }
      actions.patchMix({ locked: false });
      setReopenOpen(false);
    } finally {
      setReopening(false);
    }
  }, [saved, mix.id, planId, onReopenFinal, refresh, actions]);

  /** התמהיל שעליו נשאלת שאלת האישור — מהשורה שנלחצה, ואחרת זה שבעבודה */
  const finalCandidate = useMemo(() => {
    if (!finalCandidateId) return null;
    if (finalCandidateId === mix.id) return { name: mix.name, summary: result.summary, totalAmount: mix.totalAmount, tracks: mix.tracks.length };
    const item = saved.find((entry) => entry.mix.id === finalCandidateId);
    return item
      ? {
          name: item.mix.name,
          summary: item.summary,
          totalAmount: item.mix.totalAmount,
          tracks: item.mix.tracks.length,
        }
      : null;
  }, [finalCandidateId, mix, result.summary, saved]);

  const confirmFinalMix = useCallback(async () => {
    if (!finalCandidateId) return;
    setConfirmingFinal(true);
    try {
      await selectFinalMix(finalCandidateId);
    } finally {
      setConfirmingFinal(false);
      setFinalCandidateId(null);
    }
  }, [finalCandidateId, selectFinalMix]);

  // עד שמתברר איזה תמהיל נפתח — שמור, טיוטה או תמהיל ראשון חדש — לא מוצג מסך ביניים
  if (phase !== 'ready') {
    return <div className={`${embedded ? '' : 'min-h-screen'} bg-slate-50`} dir="rtl" />;
  }

  return (
    <div className={`${embedded ? '' : 'min-h-screen'} bg-slate-50`} dir="rtl">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-2 px-3 py-2.5 sm:justify-start sm:px-4">
          {!embedded && (
          <Button variant="ghost" size="sm" className="h-9" asChild>
            <Link href="/">
              <Home className="h-4 w-4 ml-1" />
              עמוד ראשי
            </Link>
          </Button>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Settings2 className="h-4 w-4 ml-1" />
                הגדרות
                {(showRisk || showGoals) && (
                  <span className="mr-1.5 rounded-full bg-slate-200 px-1.5 text-2xs font-semibold text-slate-700">
                    {Number(showRisk) + Number(showGoals)}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent dir="rtl" align="end" className="w-72 p-2">
              <p className="px-2 py-1.5 text-2xs font-semibold text-slate-500">
                כלים נוספים למסך
              </p>
              <SettingToggle
                checked={showRisk}
                onChange={setShowRisk}
                icon={<ShieldAlert className="h-4 w-4 text-blue-600" />}
                label="הצג סרגל ניתוח סיכונים"
                hint="הזזת ריבית ומדד כדי לבחון את חשיפת התמהיל"
              />
              <SettingToggle
                checked={showGoals}
                onChange={setShowGoals}
                icon={<Target className="h-4 w-4 text-blue-600" />}
                label="שנה סכום החזר חודשי"
                hint="הגדרת תקרת החזר ובחירת מטרות לאופטימיזציה"
              />
            </PopoverContent>
          </Popover>

          {!embedded && (
          <Button variant="ghost" size="sm" className="h-9" asChild>
            <Link href={personalAreaHref}>
              {isAdvisor ? <Users className="h-4 w-4 ml-1" /> : <UserRound className="h-4 w-4 ml-1" />}
              <span className="hidden md:inline">{isAdvisor ? 'האזור שלי והלקוחות' : 'האזור האישי'}</span>
              <span className="md:hidden">{isAdvisor ? 'האזור שלי' : 'אזור אישי'}</span>
            </Link>
          </Button>
          )}

          {isAdvisor && phase === 'ready' && (
            <Button
              size="sm"
              className="h-9"
              onClick={() => setSaveDialogOpen(true)}
              title="שמירת התמהיל ללקוח או לקטגוריה"
              {...demoId('ws-save')}
            >
              <Save className="h-4 w-4 ml-1" />
              <span className="hidden sm:inline">שמור תמהיל</span>
            </Button>
          )}

          {isAdvisor && (
            <ClientSelector
              clients={clients.clients}
              activeClientId={activeClientId}
              onSelect={setActiveClientId}
            />
          )}
        </div>
      </div>

      <div className="container mx-auto space-y-3 px-3 py-3 sm:px-4">
        {!signedIn && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <LogIn className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-900">
              אתם לא מחוברים, ולכן התמהילים נשמרים בדפדפן הזה בלבד.{' '}
              <Link href="/auth/login" className="font-semibold underline">
                התחברו
              </Link>{' '}
              כדי לשמור אותם בחשבון — הם יעברו אליו אוטומטית ויהיו זמינים בכל מכשיר.
            </p>
          </div>
        )}

        {/* פרטי הנכס והעסקה בכותרת אחת מעל כל התמהילים ששייכים אליהם */}
        <PropertyHeader
          mix={mix}
          monthlyPayment={result.summary.monthlyPayment}
          mixCount={propertyMixes.length + 1}
          profileMaxMonthlyPayment={profileCap}
          onCommitDeal={commitDeal}
          notice={dealNotice}
          onDismissNotice={() => setDealNotice(null)}
        />

        {/* שינוי שנחסם בגלל חריגה מתקרת ההחזר. נדבק לראש המסך כדי שההודעה תיראה
            גם כשהשינוי נעשה בעריכת מסלול שרחוקה מכאן */}
        {state.blockedNotice && (
          <div className="sticky top-14 z-20 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 shadow-md">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <p className="flex-1 text-xs leading-relaxed text-red-900">{state.blockedNotice}</p>
            <button
              type="button"
              onClick={actions.dismissNotice}
              title="סגירת ההודעה"
              className="rounded-md p-1 text-red-400 transition-colors hover:bg-red-100 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/*
          אזור העבודה והניתוח זה לצד זה במסך רחב: אזור העבודה מימין, והמצב
          והגרפים משמאל ונדבקים לראש המסך — כך כל שינוי בפרמטרים של מסלול
          נראה מיד בתוצאות בלי לגלול. במסך צר הם אחד מעל השני כמו קודם.
        */}
        <div className="space-y-3 xl:grid xl:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] xl:items-start xl:gap-3 xl:space-y-0">
        <div className="min-w-0 space-y-3">
        {/* כל התמהילים של הנכס באותה תצוגה; זה שבניתוח בראש הרשימה */}
        <div {...demoId('ws-mix-list')}>
        <MixList
          activeResult={result}
          others={propertyMixes}
          comparedIds={state.comparedIds}
          address={mix.propertyAddress}
          expanded={editorExpanded}
          scenarioActive={scenarioActive}
          onToggleExpanded={() => setEditorExpanded((open) => !open)}
          onActivate={openSavedMix}
          onToggleCompare={toggleCompared}
          onRenameActive={renameActiveMix}
          onRename={renameMix}
          onDismiss={dismissFromPage}
          onDuplicate={(item) => duplicateMix(item.mix)}
          onDuplicateActive={() => duplicateMix(mix)}
          pendingRenameId={pendingCloneId}
          onCreateForProperty={startMixForSameProperty}
          buildLabel={buildLabel}
          saveDirty={dirty && !buildingNewMix}
          flashSave={flashSave}
          onSaveAsNew={saveAsNewMix}
          onSaveCurrent={isAdvisor ? undefined : saveCurrentMix}
          savedCount={propertySavedMixes.length}
          saveFeedback={saveFeedback}
          uniformMixIds={preferredMixIds}
          nameNotice={nameNotice}
          disposableIncome={disposableIncome}
          onSaveBankQuote={saveBankQuote}
          onOpenBankQuote={openBankQuote}
          onSelectAsFinal={allowSelectFinal ? setFinalCandidateId : undefined}
          activeFinal={Boolean(mix.locked)}
          focusTrackId={focusTrackId}
          onFocusTrack={setFocusTrackId}
          onReopenFinal={allowSelectFinal ? () => setReopenOpen(true) : undefined}
          activeActions={
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-10 px-3 text-xs sm:h-8 sm:px-3"
                onClick={() => setPrepayTarget({})}
                {...demoId('ws-prepay')}
              >
                <Banknote className="h-3.5 w-3.5 ml-1" />
                פרעון מוקדם
              </Button>
              {mix.events.some((event) => event.kind === 'prepayment') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 px-3 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 sm:h-8"
                  title="הסרת כל הפרעונות המוקדמים והצגת ערכי התמהיל המקוריים"
                  onClick={() =>
                    actions.patchMix({
                      events: mix.events.filter((event) => event.kind !== 'prepayment'),
                    })
                  }
                >
                  <Undo2 className="h-3.5 w-3.5 ml-1" />
                  הסר פרעון
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-10 px-3 text-xs sm:h-8 sm:px-3"
                onClick={() => setAmortizationTarget({})}
                {...demoId('ws-amortization')}
              >
                <Table2 className="h-3.5 w-3.5 ml-1" />
                לוח החזרים
              </Button>
              {mix.events.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 px-3 text-xs sm:h-8 sm:px-3"
                  title="הצגה והסרה של הפרעונות והמחזורים המתוכננים"
                  onClick={() => setEventsOpen(true)}
                >
                  <CalendarClock className="h-3.5 w-3.5 ml-1" />
                  שינויים מתוכננים · {mix.events.length}
                </Button>
              )}
            </>
          }
          editor={
            <MixControlPanel
              key={result.mix.id}
              result={result}
              locked={mix.locked}
              onUpdateTrack={mix.locked ? () => undefined : actions.updateTrack}
              onTrackAmountChange={mix.locked ? () => undefined : actions.setTrackAmount}
              onRemoveTrack={mix.locked ? () => undefined : actions.removeTrack}
              onAddTrack={mix.locked ? () => undefined : actions.addTrack}
              onPrepay={(trackId: string) => setPrepayTarget({ trackId })}
              onRefinance={(trackId: string) => setRefinanceTarget({ trackId })}
              allowRefinance={isFinalMix}
              onAmortization={(trackId: string) => setAmortizationTarget({ trackId })}
              focusTrackId={focusTrackId}
              onFocusTrack={setFocusTrackId}
            />
          }
          editorPlaceholder={
            <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-white">
              {/* הפאנל מוצג מטושטש עד שנבחר תמהיל לניתוח */}
              <div className="pointer-events-none select-none blur-[3px] opacity-60">
                <MixControlPanel
                  result={result}
                  locked
                  onUpdateTrack={() => undefined}
                  onTrackAmountChange={() => undefined}
                  onRemoveTrack={() => undefined}
                  onAddTrack={() => undefined}
                  onPrepay={() => undefined}
                  onRefinance={() => undefined}
                  onAmortization={() => undefined}
                />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/40 p-4 text-center">
                <p className="text-sm font-bold text-slate-900">
                  בחרו תמהיל לניתוח מתוך התמהילים השמורים, או צרו תמהיל חדש
                </p>
                <p className="max-w-md text-2xs text-slate-600">
                  לחיצה על שורת תמהיל פותחת אותו כאן בפאנל השליטה — כל המסלולים והפרמטרים שלהם
                  פתוחים לשינוי, והדאשבורד שמתחת מתעדכן מיד.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  <Button size="sm" className="h-8 text-xs" onClick={() => setEditorExpanded(true)}>
                    <SquarePen className="h-3.5 w-3.5 ml-1" />
                    פתחו את התמהיל שבאזור העבודה
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setSavedPickerOpen(true)}
                    {...demoId('ws-load-saved')}
                  >
                    <BookmarkCheck className="h-3.5 w-3.5 ml-1" />
                    טענו תמהיל שמור
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={startMixForSameProperty}
                  >
                    <Plus className="h-3.5 w-3.5 ml-1" />
                    תמהיל חדש
                  </Button>
                </div>
              </div>
            </div>
          }
        />
        </div>

        {isAdvisor && (
        <SaveMixDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          mixName={mix.name}
          clients={clients.clients.map((client) => ({ id: client.id, name: client.name }))}
          lockedClientId={enteredFromClient ? activeClientId : null}
          onSave={async (target: SaveTarget) => {
            const stored = await save(mix, target);
            notifyActive(stored);
            setSavedSignature(signatureOf(mix));
            if (target.clientId) setActiveClientId(target.clientId);
            await refresh();
          }}
        />
      )}

      <SavedMixPicker
          open={savedPickerOpen}
          onOpenChange={setSavedPickerOpen}
          items={propertySavedMixes}
          address={mix.propertyAddress}
          totalAmount={mix.totalAmount}
          activeId={mix.id}
          onSelect={restoreSavedMix}
        />

        {showGoals && (
          <GoalsPanel
            result={result}
            constraints={state.constraints}
            lastOptimization={state.lastOptimization}
            onConstraintsChange={actions.setConstraints}
            onOptimize={actions.optimize}
            onPreview={actions.previewOptimization}
            onHide={() => setShowGoals(false)}
          />
        )}

        {showRisk && (
          <RiskPanel
            mix={mix}
            scenarioActive={scenarioActive}
            onRateDeltaChange={actions.setRateDelta}
            onInflationChange={actions.setInflation}
            onResetAssumptions={actions.resetAssumptions}
            onHide={() => setShowRisk(false)}
          />
        )}
        </div>

        <div className="min-w-0 space-y-3 xl:sticky xl:top-[4.25rem] xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto xl:overscroll-contain xl:pb-1">
        {/* דאשבורד: מצב התמהיל שבפאנל, ומה השתנה מאז שנפתח */}
        <div className="space-y-2">
          <StateBlocksRow
            title={panelChanged ? 'התמהיל כפי שנפתח' : 'מצב התמהיל'}
            caption={`${mix.name || 'התמהיל בעבודה'} · ${formatShekel(mix.totalAmount)}`}
            snapshot={snapshotFromMixResult(baselineResult ?? result)}
            tone="current"
          />

          {panelChanged && baselineResult ? (
            <StateBlocksRow
              title="אחרי השינויים בתמהיל בפאנל השליטה"
              caption="ההפרש מול התמהיל כפי שנפתח"
              snapshot={snapshotFromMixResult(result)}
              baseline={snapshotFromMixResult(baselineResult)}
              tone="refinanced"
            />
          ) : (
            <NoChangeNotice text="טרם בוצע שינוי בתמהיל — שנו פרמטר בפאנל השליטה כדי לראות כאן את ההפרש." />
          )}
        </div>

        {/* הניתוח הגרפי וההשוואה באותו אזור */}
        <div {...demoId('ws-analysis')}>
        <AnalysisTabs
          result={result}
          baseResult={baseResult}
          scenarioActive={scenarioActive}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          entries={comparisonEntries}
          comparedCount={comparedCount}
          allowSelectFinal={allowSelectFinal}
          onSelectFinal={setFinalCandidateId}
          focusTrackId={focusTrackId}
          onFocusTrack={setFocusTrackId}
          comparePicker={
            propertyMixes.length > 0 ? (
              <MixSliderSection
                items={propertyMixes}
                originOf={originOf}
                comparedIds={state.comparedIds}
                onActivate={openSavedMix}
                onToggleCompare={toggleCompared}
                onRequestQuote={() => undefined}
              />
            ) : null
          }
          split
        />
        </div>
        </div>
        </div>
      </div>

      <Dialog open={eventsOpen} onOpenChange={setEventsOpen}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>שינויים מתוכננים בתמהיל</DialogTitle>
          </DialogHeader>
          <EventsPanel
            result={result}
            onRemove={actions.removeEvent}
            onAddPrepayment={() => {
              setEventsOpen(false);
              setPrepayTarget({});
            }}
            onAddRefinance={
              isFinalMix
                ? () => {
                    setEventsOpen(false);
                    setRefinanceTarget({});
                  }
                : undefined
            }
          />
        </DialogContent>
      </Dialog>

      <AmortizationDialog
        result={result}
        open={amortizationTarget !== null}
        initialTrackId={amortizationTarget?.trackId}
        onClose={() => setAmortizationTarget(null)}
        onSelectMonth={setSelectedMonth}
      />

      <SnapshotDialog
        result={result}
        month={selectedMonth}
        onMonthChange={setSelectedMonth}
        onClose={() => setSelectedMonth(null)}
      />

      <PrepaymentDialog
        open={prepayTarget !== null}
        mix={mix}
        baseResult={result}
        initialTrackId={prepayTarget?.trackId}
        initialAmount={prepayTarget?.amount ?? plannedPrepay?.amount}
        initialMonth={prepayTarget?.month ?? plannedPrepay?.month}
        initialLabel={prepayTarget?.label ?? plannedPrepay?.label}
        otherMixes={propertyMixes}
        onContinueToMix={(item, trackId, leftover, month, events) => {
          persistMix({
            ...mix,
            events: [
              ...mix.events,
              ...events.map((event, index) => ({
                ...event,
                id: `prepay-${Date.now()}-${index}`,
                kind: 'prepayment' as const,
              })),
            ],
          });
          if (item.clientId) setActiveClientId(item.clientId);
          notifyActive(item);
          openMix(item.mix);
          setPrepayTarget({
            trackId,
            amount: leftover,
            month,
            label: prepayTarget?.label ?? plannedPrepay?.label,
          });
        }}
        onClose={() => setPrepayTarget(null)}
        onConfirm={actions.addPrepayment}
      />

      <RefinanceDialog
        open={refinanceTarget !== null}
        mix={mix}
        baseResult={result}
        initialTrackId={refinanceTarget?.trackId}
        onClose={() => setRefinanceTarget(null)}
        onConfirm={actions.addRefinance}
      />

      {/* פתיחת התמהיל הסופי לעריכה — הבחירה כסופי מתבטלת עד שייבחר שוב */}
      <Dialog
        open={reopenOpen}
        onOpenChange={(open) => {
          if (!open && !reopening) setReopenOpen(false);
        }}
      >
        <DialogContent dir="rtl" className="max-w-lg text-right">
          <DialogHeader>
            <DialogTitle className="text-right text-lg font-black text-slate-900">
              לפתוח את התמהיל הסופי לעריכה?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-slate-700">
            הנעילה תוסר ואפשר יהיה לשנות את המסלולים. התמהיל כבר לא יסומן כתמהיל הסופי להגשה
            לבנקים, ואחרי העריכה בוחרים אותו שוב כתמהיל סופי.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" disabled={reopening} onClick={() => setReopenOpen(false)}>
              ביטול
            </Button>
            <Button className="min-w-32" disabled={reopening} onClick={() => void reopenFinalMix()}>
              {reopening ? 'רגע…' : 'פתח לעריכה'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* אישור בחירת התמהיל הסופי — מה שקורה אחריו, לפני שהוא קורה */}
      <Dialog
        open={finalCandidateId !== null}
        onOpenChange={(open) => {
          if (!open && !confirmingFinal) setFinalCandidateId(null);
        }}
      >
        <DialogContent dir="rtl" className="max-w-lg text-right">
          <DialogHeader>
            <DialogTitle className="text-right text-lg font-black text-slate-900">
              לבחור את התמהיל הזה כתמהיל הסופי?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {finalCandidate && (
              <div className="rounded-2xl border-2 border-blue-300 bg-blue-50/60 p-3">
                <p className="text-sm font-black text-blue-950">
                  {finalCandidate.name || 'תמהיל ללא שם'}
                </p>
                <p className="mt-0.5 text-xs font-bold text-blue-800">
                  {formatShekel(finalCandidate.totalAmount)} · {finalCandidate.tracks} מסלולים ·
                  החזר חודשי {formatShekel(finalCandidate.summary.monthlyPayment)}
                </p>
              </div>
            )}

            <p className="text-sm leading-relaxed text-slate-700">
              התמהיל הזה ייבחר כתמהיל הסופי, והוא זה שיישלח לבנקים לצורך תמחור מולם: כל בנק
              יתמחר בדיוק את המבנה הזה, וכך אפשר יהיה להשוות בין ההצעות שיחזרו.
            </p>
            <p className="text-sm leading-relaxed text-slate-700">
              מרגע האישור התמהיל ננעל לשינויים, והתהליך עובר לשלב הבא. אפשר להמשיך לבנות
              תמהילים נוספים להשוואה בכל שלב.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="ghost"
              disabled={confirmingFinal}
              onClick={() => setFinalCandidateId(null)}
            >
              ביטול
            </Button>
            <Button className="min-w-32" disabled={confirmingFinal} onClick={() => void confirmFinalMix()}>
              {confirmingFinal ? 'רגע…' : 'אישור'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * בורר הלקוח שהתמהילים נשמרים עבורו. בלי בחירה התמהיל נשמר ליועץ בלבד, וניתן
 * לשייך אותו ללקוח מאוחר יותר.
 */
function ClientSelector({
  clients,
  activeClientId,
  onSelect,
}: {
  clients: AdvisorClient[];
  activeClientId: string | null;
  onSelect: (clientId: string | null) => void;
}) {
  const active = clients.find((client) => client.id === activeClientId) ?? null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 max-w-[220px]">
          <UserRound className="h-4 w-4 ml-1 shrink-0" />
          <span className="truncate">{active ? active.name : 'ללא שיוך ללקוח'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" align="end" className="w-72 p-2">
        <p className="px-2 py-1.5 text-2xs font-semibold text-slate-500">
          שמירת התמהילים עבור
        </p>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`w-full rounded-lg p-2 text-right text-xs transition-colors hover:bg-slate-50 ${
            activeClientId === null ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-700'
          }`}
        >
          ללא שיוך ללקוח
        </button>
        {clients.length === 0 ? (
          <p className="px-2 py-2 text-2xs text-slate-500">
            עדיין אין לקוחות. אפשר לצרף לקוח מהאזור האישי.
          </p>
        ) : (
          clients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => onSelect(client.id)}
              className={`w-full rounded-lg p-2 text-right transition-colors hover:bg-slate-50 ${
                activeClientId === client.id ? 'bg-blue-50' : ''
              }`}
            >
              <span
                className={`block text-xs ${
                  activeClientId === client.id ? 'font-semibold text-blue-700' : 'text-slate-800'
                }`}
              >
                {client.name}
              </span>
              <span className="block text-2xs text-slate-500">{client.email}</span>
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}

function SettingToggle({
  checked,
  onChange,
  icon,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-2.5 rounded-lg p-2 text-right hover:bg-slate-50 transition-colors"
    >
      <Checkbox checked={checked} className="mt-0.5 pointer-events-none" tabIndex={-1} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          {icon}
          {label}
        </span>
        <span className="block text-2xs text-slate-500 leading-snug mt-0.5">{hint}</span>
      </span>
    </button>
  );
}
