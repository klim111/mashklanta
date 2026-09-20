'use client';

/**
 * מנוע ההדגמה — מכונת המצבים שמריצה הדגמה על הממשק האמיתי.
 *
 * המנוע חי מעל כל הדפים (ב-DemoHost שבשורש), ולכן הוא שורד ניווט בין מסכים:
 * צעד יכול לעבור מדף הבית למחשבון ומשם לאזור האישי, והמצב — הצעד, הכתובית,
 * הערכים שהוקלדו ומה שהמשתמש שינה בהתנסות — נשאר איתו.
 *
 * מצבים: playing (ניגון), paused (השהיה — הצעד הנוכחי נשאר מואר), user-control
 * ("נסו בעצמכם" — ההארה יורדת והמסך פתוח), resumed (רגע החזרה — קריאת מה
 * שהמשתמש שינה), completed (מסך הסיום).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { DemoCatalogEntry, DemoFlow, DemoState, DemoStatus, DemoStep } from '../types';
import { demoStore } from '../store';
import type { DemoRequest } from '../store';
import { executeAction, readUserValues } from './actions';
import type { ActionContext, DemoCursorApi } from './actions';
import { findTarget, scrollTo, sleep, waitForRoute, waitForTarget } from './dom';
import { Spotlight } from './spotlight';
import { captionsOnlyNarration } from './narration';
import type { NarrationAdapter } from './narration';
import { readingTime, resolveText } from './text';

export interface DemoEngineValue {
  entry: DemoCatalogEntry | null;
  flow: DemoFlow | null;
  status: DemoStatus;
  stepIndex: number;
  step: DemoStep | null;
  caption: string;
  title: string;
  state: DemoState;
  /** רכיבים שלא נמצאו — מוצגים בקונסולה, ההדגמה ממשיכה */
  warnings: string[];
  loadError: string | null;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  restart: () => void;
  exit: () => void;
  tryIt: () => void;
  resume: () => void;
  goTo: (index: number) => void;
  registerCursor: (api: DemoCursorApi | null) => void;
  /** מזהה מוצג של ההדגמה, לכרטיסי ההמשך */
  catalog: DemoCatalogEntry[];
  startAnother: (flowId: string) => void;
}

const DemoEngineContext = createContext<DemoEngineValue | null>(null);

export function useDemoEngine(): DemoEngineValue | null {
  return useContext(DemoEngineContext);
}

const emptyState = (initial?: Record<string, unknown>): DemoState => ({ values: { ...(initial ?? {}) }, userSet: [] });

const noCursor: DemoCursorApi = {
  moveTo: async () => undefined,
  press: async () => undefined,
  hide: () => undefined,
};

interface Props {
  request: DemoRequest;
  catalog: DemoCatalogEntry[];
  narration?: NarrationAdapter;
  children: React.ReactNode;
}

export function DemoEngineProvider({ request, catalog, narration = captionsOnlyNarration, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const entry = useMemo(() => catalog.find((item) => item.id === request.flowId) ?? null, [catalog, request.flowId]);
  const [flow, setFlow] = useState<DemoFlow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<DemoStatus>('loading');
  const [stepIndex, setStepIndex] = useState(request.stepIndex);
  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [state, setState] = useState<DemoState>(() => emptyState());
  const [warnings, setWarnings] = useState<string[]>([]);

  const statusRef = useRef<DemoStatus>('loading');
  statusRef.current = status;
  const stateRef = useRef<DemoState>(state);
  stateRef.current = state;
  const flowRef = useRef<DemoFlow | null>(null);
  flowRef.current = flow;
  const stepRef = useRef(stepIndex);
  stepRef.current = stepIndex;
  const cursorRef = useRef<DemoCursorApi | null>(null);
  const spotlight = useRef<Spotlight | null>(null);
  const runToken = useRef<{ cancelled: boolean }>({ cancelled: false });
  const startedRef = useRef(false);
  /** הפעולות של הצעד עדיין רצות — "הבא" מחכה להן במקום לדלג עליהן */
  const actionsBusy = useRef(false);
  const skipHold = useRef(false);

  const getSpotlight = () => {
    if (!spotlight.current) spotlight.current = new Spotlight();
    return spotlight.current;
  };

  // ─── טעינת ההדגמה (הצעדים נטענים בעצלות) ───
  useEffect(() => {
    let cancelled = false;
    if (!entry) {
      setLoadError('ההדגמה לא נמצאה');
      setStatus('idle');
      return;
    }
    entry
      .load()
      .then((module) => {
        if (cancelled) return;
        const loaded = module.default;
        setFlow(loaded);
        setState(emptyState(loaded.initialState));
      })
      .catch(() => {
        if (!cancelled) setLoadError('לא הצלחנו לטעון את ההדגמה');
      });
    return () => {
      cancelled = true;
    };
  }, [entry]);

  const cancelRun = useCallback(() => {
    runToken.current.cancelled = true;
    runToken.current = { cancelled: false };
    narration.cancel();
    return runToken.current;
  }, [narration]);

  /** המסך שבו צעד מתרחש — הצעד האחרון לפניו שהגדיר מסך */
  const routeFor = useCallback((index: number): string => {
    const current = flowRef.current;
    if (!current) return '/';
    for (let i = index; i >= 0; i -= 1) {
      const route = current.steps[i]?.route;
      if (route) return route;
    }
    return current.route;
  }, []);

  const isOnRoute = (route: string) => {
    const wanted = new URL(route, window.location.origin);
    if (wanted.pathname !== window.location.pathname) return false;
    const params = new URLSearchParams(window.location.search);
    let ok = true;
    wanted.searchParams.forEach((value, key) => {
      if (params.get(key) !== value) ok = false;
    });
    return ok;
  };

  const hold = useCallback(async (ms: number, signal: { cancelled: boolean }) => {
    let elapsed = 0;
    while (elapsed < ms) {
      if (signal.cancelled) return false;
      if (statusRef.current === 'paused') {
        await sleep(120);
        continue;
      }
      await sleep(100);
      elapsed += 100;
    }
    return !signal.cancelled;
  }, []);

  const finish = useCallback(() => {
    getSpotlight().clear();
    cursorRef.current?.hide();
    setStatus('completed');
    setTitle('');
    setCaption('');
  }, []);

  const runStep = useCallback(
    async (index: number, options: { keepPaused?: boolean } = {}) => {
      const current = flowRef.current;
      if (!current) return;
      if (index >= current.steps.length) {
        finish();
        return;
      }
      const signal = cancelRun();
      const step = current.steps[index];
      setStepIndex(index);
      demoStore.setStep(index);
      const wasPaused = options.keepPaused && statusRef.current === 'paused';
      setStatus(wasPaused ? 'paused' : 'playing');
      statusRef.current = wasPaused ? 'paused' : 'playing';
      getSpotlight().clear();

      const currentState = stateRef.current;
      const resolvedTitle = resolveText(step.title, currentState);
      const resolvedCaption = resolveText(step.caption, currentState);
      setTitle(resolvedTitle);
      setCaption(resolvedCaption);

      // ניווט למסך של הצעד, אם צריך
      const route = routeFor(index);
      if (!isOnRoute(route)) {
        router.push(route);
        await waitForRoute(route, 12000, signal);
        await sleep(400);
        if (signal.cancelled) return;
      }

      const ctx: ActionContext = {
        state: stateRef.current,
        cursor: cursorRef.current ?? noCursor,
        signal,
        navigate: (to) => router.push(to),
        setCaption: (text) => setCaption(text),
        highlight: (element, opts) =>
          getSpotlight().highlight(element, {
            title: opts.title,
            description: opts.text,
            side: opts.side,
            lockInteraction: true,
          }),
        clearHighlight: () => getSpotlight().clear(),
        setValue: (key, value) => {
          setState((prev) => {
            const next = { ...prev, values: { ...prev.values, [key]: value } };
            stateRef.current = next;
            return next;
          });
        },
        isUserSet: (key) => stateRef.current.userSet.includes(key),
        onMissingTarget: (id) => {
          console.warn(`[demo] לא נמצא רכיב עם data-demo-id="${id}" בצעד "${step.id}"`);
          setWarnings((prev) => (prev.includes(id) ? prev : [...prev, id]));
        },
      };

      const narrate = narration.speak(resolveText(step.narration ?? step.caption, currentState), { stepId: step.id });

      actionsBusy.current = true;
      skipHold.current = false;
      for (const action of step.actions ?? []) {
        if (signal.cancelled) return;
        ctx.state = stateRef.current;
        try {
          await executeAction(action, ctx);
        } catch (error) {
          console.warn('[demo] פעולה נכשלה', action, error);
        }
      }
      actionsBusy.current = false;
      if (signal.cancelled) return;

      // הכתובית עשויה להשתנות אחרי הפעולות — הערכים כבר במצב
      const finalCaption = resolveText(step.caption, stateRef.current);
      setCaption(finalCaption);

      if (step.target) {
        const element = await waitForTarget(step.target, { timeout: 8000, signal });
        if (signal.cancelled) return;
        if (element) {
          await scrollTo(element);
          const center = element.getBoundingClientRect();
          await (cursorRef.current ?? noCursor).moveTo(
            center.left + Math.min(center.width - 12, Math.max(12, center.width * 0.7)),
            center.top + Math.min(center.height - 8, Math.max(8, center.height * 0.6)),
            500
          );
          if (signal.cancelled) return;
          getSpotlight().highlight(element, {
            title: resolvedTitle,
            description: resolveText(step.tooltip, stateRef.current),
            side: step.spotlight?.side,
            align: step.spotlight?.align,
            padding: step.spotlight?.padding,
            lockInteraction: true,
          });
        } else {
          ctx.onMissingTarget?.(step.target);
        }
      }

      const duration = skipHold.current ? 0 : step.duration ?? readingTime(finalCaption);
      const held = await hold(duration, signal);
      if (!held) return;
      if (narration.audible) await narrate;
      if (signal.cancelled) return;

      if (step.pauseAfter && !skipHold.current) {
        setStatus('paused');
        statusRef.current = 'paused';
        await hold(Number.MAX_SAFE_INTEGER, signal);
        return;
      }
      void runStep(index + 1, { keepPaused: true });
    },
    [cancelRun, finish, hold, narration, routeFor, router]
  );

  // ─── התחלה אוטומטית אחרי הטעינה ───
  useEffect(() => {
    if (!flow || startedRef.current) return;
    startedRef.current = true;
    if (request.autoplay) {
      void runStep(Math.min(request.stepIndex, flow.steps.length - 1));
    } else {
      setStatus('paused');
      statusRef.current = 'paused';
      void runStep(Math.min(request.stepIndex, flow.steps.length - 1), { keepPaused: true });
    }
  }, [flow, request.autoplay, request.stepIndex, runStep]);

  // ─── ניקוי ביציאה ───
  useEffect(
    () => () => {
      runToken.current.cancelled = true;
      spotlight.current?.clear();
      narration.cancel();
    },
    [narration]
  );

  // ההארה עוקבת אחרי גלילה ושינוי גודל
  useEffect(() => {
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => spotlight.current?.refresh());
    };
    window.addEventListener('scroll', refresh, true);
    window.addEventListener('resize', refresh);
    return () => {
      window.removeEventListener('scroll', refresh, true);
      window.removeEventListener('resize', refresh);
      cancelAnimationFrame(frame);
    };
  }, []);

  // ─── פקדים ───
  const play = useCallback(() => {
    if (statusRef.current === 'completed') {
      void runStep(0);
      return;
    }
    setStatus('playing');
    statusRef.current = 'playing';
  }, [runStep]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    setStatus('paused');
    statusRef.current = 'paused';
  }, []);

  const next = useCallback(() => {
    // באמצע פעולות (הקלדה, לחיצה) מסיימים אותן ורק אז עוברים — אחרת המסך נשאר חצי מלא
    if (actionsBusy.current) {
      skipHold.current = true;
      if (statusRef.current === 'paused') {
        setStatus('playing');
        statusRef.current = 'playing';
      }
      return;
    }
    void runStep(stepRef.current + 1, { keepPaused: true });
  }, [runStep]);

  const prev = useCallback(() => {
    void runStep(Math.max(0, stepRef.current - 1), { keepPaused: true });
  }, [runStep]);

  const goTo = useCallback(
    (index: number) => {
      void runStep(Math.max(0, index), { keepPaused: true });
    },
    [runStep]
  );

  const restart = useCallback(() => {
    cancelRun();
    setState(emptyState(flowRef.current?.initialState));
    setWarnings([]);
    void runStep(0);
  }, [cancelRun, runStep]);

  const exit = useCallback(() => {
    cancelRun();
    getSpotlight().clear();
    cursorRef.current?.hide();
    const returnTo = flowRef.current?.exitRoute ?? request.returnTo ?? '/';
    demoStore.stop();
    router.push(returnTo);
  }, [cancelRun, request.returnTo, router]);

  const tryIt = useCallback(() => {
    cancelRun();
    getSpotlight().clear();
    cursorRef.current?.hide();
    setStatus('user-control');
    statusRef.current = 'user-control';
  }, [cancelRun]);

  /** חזרה מההתנסות: קוראים מהמסך מה שהמשתמש שינה, ומשם ממשיכים */
  const resume = useCallback(() => {
    const current = flowRef.current;
    if (!current) return;
    const actions = current.steps.slice(0, stepRef.current + 1).flatMap((step) => step.actions ?? []);
    const observed = readUserValues(actions);
    setState((prev) => {
      const values = { ...prev.values };
      const userSet = new Set(prev.userSet);
      Object.entries(observed).forEach(([key, value]) => {
        const before = prev.values[key];
        const changed = typeof before === 'number' && typeof value === 'number' ? Math.abs(before - value) > 1e-6 : String(before ?? '') !== String(value);
        if (changed) userSet.add(key);
        values[key] = value;
      });
      const next = { values, userSet: Array.from(userSet) };
      stateRef.current = next;
      return next;
    });
    setStatus('resumed');
    statusRef.current = 'resumed';
    window.setTimeout(() => {
      void runStep(stepRef.current + 1);
    }, 350);
  }, [runStep]);

  const startAnother = useCallback(
    (flowId: string) => {
      cancelRun();
      getSpotlight().clear();
      startedRef.current = false;
      setFlow(null);
      setStepIndex(0);
      setWarnings([]);
      demoStore.start(flowId, { returnTo: request.returnTo });
    },
    [cancelRun, request.returnTo]
  );

  // ─── מקלדת: רווח = ניגון/השהיה, חץ שמאלה = הבא (RTL), חץ ימינה = הקודם, Esc = יציאה ───
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // אירועי מקלדת שההדגמה עצמה משגרת (סליידרים, Escape לחלונות) אינם קיצורי דרך
      if (!event.isTrusted) return;
      if (statusRef.current === 'user-control') return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === ' ') {
        event.preventDefault();
        if (statusRef.current === 'playing') pause();
        else play();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        prev();
      } else if (event.key === 'Escape') {
        exit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exit, next, pause, play, prev]);

  // מעבר בין דפים באמצע צעד: ההארה מתייחסת לרכיב שכבר לא קיים — מנקים ומחכים לצעד הבא
  useEffect(() => {
    const step = flowRef.current?.steps[stepRef.current];
    if (!step?.target) return;
    if (!findTarget(step.target)) spotlight.current?.clear();
  }, [pathname]);

  const value = useMemo<DemoEngineValue>(
    () => ({
      entry,
      flow,
      status,
      stepIndex,
      step: flow?.steps[stepIndex] ?? null,
      caption,
      title,
      state,
      warnings,
      loadError,
      play,
      pause,
      next,
      prev,
      restart,
      exit,
      tryIt,
      resume,
      goTo,
      registerCursor: (api) => {
        cursorRef.current = api;
      },
      catalog,
      startAnother,
    }),
    [entry, flow, status, stepIndex, caption, title, state, warnings, loadError, play, pause, next, prev, restart, exit, tryIt, resume, goTo, catalog, startAnother]
  );

  return <DemoEngineContext.Provider value={value}>{children}</DemoEngineContext.Provider>;
}
