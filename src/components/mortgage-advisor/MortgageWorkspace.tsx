'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertTriangle,
  Banknote,
  BookmarkCheck,
  Home,
  Plus,
  Save,
  Settings2,
  ShieldAlert,
  Table2,
  Target,
  X,
} from 'lucide-react';
import type { OptimizationConstraints, WorkspaceMix } from './engine';
import { useSavedMixes } from './savedMixes';
import type { SavedMix } from './savedMixes';
import { dealTypeOf, sameProperty } from './propertyContext';
import { DEFAULT_CONSTRAINTS, useMortgageWorkspace } from './workspace/useMortgageWorkspace';
import { WorkspaceLanding } from './workspace/WorkspaceLanding';
import { MixSetupWizard } from './workspace/MixSetupWizard';
import type { PropertySetup } from './workspace/MixSetupWizard';
import { PropertyHeader } from './workspace/PropertyHeader';
import { MixList } from './workspace/MixList';
import { MixEditor } from './workspace/MixEditor';
import { RiskPanel } from './workspace/RiskPanel';
import { GoalsPanel } from './workspace/GoalsPanel';
import { EventsPanel } from './workspace/EventsPanel';
import { AnalysisTabs } from './workspace/AnalysisTabs';
import { AmortizationDialog } from './workspace/AmortizationDialog';
import { SnapshotDialog } from './workspace/SnapshotDialog';
import { PrepaymentDialog } from './workspace/PrepaymentDialog';
import { RefinanceDialog } from './workspace/RefinanceDialog';
import { consumeLegacyAdvisorMixes } from './workspace/legacy';
import { clearDraft, consumeStagedMix, readDraft, writeDraft } from './workspace/draft';
import type { WorkspaceDraft } from './workspace/draft';
import type { ComparisonEntry } from './MixComparison';

type Phase = 'landing' | 'setup' | 'ready';

interface MortgageWorkspaceProps {
  initialMix?: WorkspaceMix;
}

/** חתימת התמהיל לזיהוי שינויים שלא נשמרו. חותמות הזמן לא נחשבות שינוי. */
function signatureOf(mix: WorkspaceMix): string {
  const { updatedAt: _updatedAt, createdAt: _createdAt, ...rest } = mix;
  return JSON.stringify(rest);
}

/**
 * מסך העבודה של יועץ המשכנתאות. הכלי נפתח ריק ומציע ליצור תמהיל חדש או לטעון
 * תמהיל שמור; משהתמהיל קיים, כל הבקרים, הסיכום, הגרפים וההשוואה חיים באותו מסך
 * וכל שינוי מחשב מחדש את התמונה כולה.
 */
export function MortgageWorkspace({ initialMix }: MortgageWorkspaceProps) {
  const { mix, result, baseResult, scenarioActive, state, actions } = useMortgageWorkspace(initialMix);
  const { saved, save, remove, rename } = useSavedMixes();

  const [phase, setPhase] = useState<Phase>(initialMix ? 'ready' : 'landing');
  const [pendingDraft, setPendingDraft] = useState<WorkspaceDraft | null>(null);
  /** פרטי נכס שממולאים מראש באשף, כשבונים תמהיל נוסף לאותו נכס */
  const [setupSeed, setSetupSeed] = useState<Partial<PropertySetup> | undefined>();

  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [amortizationTarget, setAmortizationTarget] = useState<{ trackId?: string } | null>(null);
  const [prepayTarget, setPrepayTarget] = useState<{ trackId?: string } | null>(null);
  const [refinanceTarget, setRefinanceTarget] = useState<{ trackId?: string } | null>(null);

  const [showRisk, setShowRisk] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  /** התמהיל שבניתוח נפתח סגור, כמו כל שאר התמהילים ברשימה */
  const [editorExpanded, setEditorExpanded] = useState(false);

  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [flashSave, setFlashSave] = useState(false);

  const signature = useMemo(() => signatureOf(mix), [mix]);
  const dirty = phase === 'ready' && signature !== savedSignature;

  const openMix = useCallback(
    (next: WorkspaceMix, constraints?: OptimizationConstraints) => {
      // תקרת ההחזר שנקבעה ללקוח היא גם התקרה שהאופטימיזציה עובדת מולה
      actions.load(
        next,
        constraints ?? {
          ...DEFAULT_CONSTRAINTS,
          maxMonthlyPayment: next.maxMonthlyPayment,
        }
      );
      setSavedSignature(signatureOf(next));
      setSelectedMonth(null);
      setPhase('ready');
    },
    [actions]
  );

  // תמהילים שהגיעו משלב אחר: פתיחת תמהיל שמור מהאזור האישי, או הסלים האחידים
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current || initialMix) {
      bootstrapped.current = true;
      return;
    }
    bootstrapped.current = true;

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
      return;
    }

    setPendingDraft(readDraft());
  }, [initialMix, save, actions, openMix]);

  // הטיוטה נשמרת רק כשיש תמהיל בעבודה, כדי שהכלי ייפתח נקי בפעם הבאה אלא אם
  // היועץ יבחר במפורש להמשיך ממנה
  useEffect(() => {
    if (phase !== 'ready') return;
    writeDraft({ mix, constraints: state.constraints });
  }, [phase, mix, state.constraints]);

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

  const handleSave = useCallback(() => {
    save(mix);
    setSavedSignature(signatureOf(mix));
    setFlashSave(false);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2200);
  }, [save, mix]);

  /**
   * תמהיל חדש נוסף לרשימה ולא מחליף את הקודם, ולכן כל מעבר לתמהיל אחר שומר
   * קודם את זה שבעבודה. כך התמהילים נערמים תחת אותו נכס במקום להידרס.
   */
  const keepCurrentMix = useCallback((): boolean => {
    if (phase !== 'ready' || mix.tracks.length === 0) return false;
    if (dirty) {
      save(mix);
      setSavedSignature(signatureOf(mix));
    }
    return true;
  }, [phase, mix, dirty, save]);

  const openSavedMix = useCallback(
    (item: SavedMix) => {
      keepCurrentMix();
      openMix(item.mix);
    },
    [keepCurrentMix, openMix]
  );


  const startNewMix = useCallback(
    (seed?: Partial<PropertySetup>) => {
      keepCurrentMix();
      setSetupSeed(seed);
      setPhase('setup');
    },
    [keepCurrentMix]
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

  const backToLanding = useCallback(() => {
    // תמהיל שנשמר אינו טיוטה, ולכן מסך הפתיחה לא יציע להמשיך ממנו
    if (keepCurrentMix()) clearDraft();
    setPendingDraft(readDraft());
    setPhase('landing');
  }, [keepCurrentMix]);

  /**
   * השוואה נעשית רק בין תמהילים לאותו נכס — או לאותו סכום משכנתא כשלא הוזנה
   * כתובת — כדי שההשוואה תהיה בין חלופות לאותה עסקה.
   */
  const propertyMixes = useMemo(
    () => saved.filter((item) => item.mix.id !== mix.id && sameProperty(item.mix, mix)),
    [saved, mix]
  );

  const comparedCount = useMemo(
    () => propertyMixes.filter((item) => state.comparedIds.includes(item.mix.id)).length,
    [propertyMixes, state.comparedIds]
  );

  const comparisonEntries = useMemo<ComparisonEntry[]>(() => {
    const compared = propertyMixes.filter((item) => state.comparedIds.includes(item.mix.id));
    if (compared.length === 0) return [];
    // התמהיל שבעבודה מוצג מהמצב החי שלו, ולא מהעותק השמור, כדי שהשוואה תשקף שינויים מיד
    return [
      { id: 'current', label: `${mix.name} (בעבודה)`, mix, current: true },
      ...compared.map((item) => ({ id: item.mix.id, label: item.mix.name, mix: item.mix })),
    ];
  }, [state.comparedIds, propertyMixes, mix]);

  if (phase === 'landing') {
    return (
      <div className="min-h-screen bg-slate-50" dir="rtl">
        <WorkspaceTopBar />
        <div className="container mx-auto px-4 py-6">
          <WorkspaceLanding
            saved={saved}
            draftMix={pendingDraft?.mix ?? null}
            onCreateNew={() => {
              setSetupSeed(undefined);
              setPhase('setup');
            }}
            onOpenSaved={openSavedMix}
            onResumeDraft={() => {
              if (pendingDraft) openMix(pendingDraft.mix, pendingDraft.constraints);
            }}
            onDiscardDraft={() => {
              clearDraft();
              setPendingDraft(null);
            }}
          />
        </div>
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-slate-50" dir="rtl">
        <WorkspaceTopBar />
        <div className="container mx-auto px-4 py-6">
          <MixSetupWizard
            onBack={backToLanding}
            initialProperty={setupSeed}
            onComplete={(next) => {
              // התמהיל נשמר מיד, ולכן הוא מתווסף לרשימת התמהילים של הנכס
              save(next);
              openMix(next);
              setSetupSeed(undefined);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container mx-auto px-4 py-2.5 flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9" asChild>
            <Link href="/">
              <Home className="h-4 w-4 ml-1" />
              עמוד ראשי
            </Link>
          </Button>

          <Button variant="ghost" size="sm" className="h-9" onClick={() => startNewMix()}>
            <Plus className="h-4 w-4 ml-1" />
            תמהיל חדש
          </Button>

          <Button variant="ghost" size="sm" className="h-9" onClick={backToLanding}>
            <BookmarkCheck className="h-4 w-4 ml-1" />
            טען תמהיל שמור
          </Button>

          <div className="flex items-center gap-2 sm:mr-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Settings2 className="h-4 w-4 ml-1" />
                  הגדרות
                  {(showRisk || showGoals) && (
                    <span className="mr-1.5 rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold text-slate-700">
                      {Number(showRisk) + Number(showGoals)}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent dir="rtl" align="end" className="w-72 p-2">
                <p className="px-2 py-1.5 text-[11px] font-semibold text-slate-500">
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

            <Button
              size="sm"
              className={`h-9 ${flashSave ? 'save-flash' : ''}`}
              variant={dirty ? 'default' : 'outline'}
              onClick={handleSave}
            >
              {justSaved ? (
                <>
                  <BookmarkCheck className="h-4 w-4 ml-1" />
                  נשמר
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-1" />
                  {dirty ? 'שמור מצב נוכחי כתמהיל' : 'שמור תמהיל'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* פרטי הנכס והעסקה בכותרת אחת מעל כל התמהילים ששייכים אליהם */}
        <PropertyHeader
          mix={mix}
          monthlyPayment={result.summary.monthlyPayment}
          mixCount={propertyMixes.length + 1}
          onPatch={actions.patchMix}
          onTotalAmountChange={actions.setTotalAmount}
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

        {/* כל התמהילים של הנכס באותה תצוגה; זה שבניתוח בראש הרשימה */}
        <MixList
          activeResult={result}
          others={propertyMixes}
          comparedIds={state.comparedIds}
          address={mix.propertyAddress}
          expanded={editorExpanded}
          scenarioActive={scenarioActive}
          onToggleExpanded={() => setEditorExpanded((open) => !open)}
          onActivate={openSavedMix}
          onToggleCompare={actions.toggleCompared}
          onRenameActive={(name) => actions.patchMix({ name })}
          onRename={rename}
          onDelete={remove}
          onCreateForProperty={startMixForSameProperty}
          activeActions={
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setPrepayTarget({})}
              >
                <Banknote className="h-3.5 w-3.5 ml-1" />
                פרעון מוקדם
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setAmortizationTarget({})}
              >
                <Table2 className="h-3.5 w-3.5 ml-1" />
                לוח החזרים
              </Button>
            </>
          }
          editor={
            <MixEditor
              result={result}
              onUpdateTrack={actions.updateTrack}
              onTrackAmountChange={actions.setTrackAmount}
              onRemoveTrack={actions.removeTrack}
              onAddTrack={actions.addTrack}
              onPrepay={(trackId) => setPrepayTarget({ trackId })}
              onRefinance={(trackId) => setRefinanceTarget({ trackId })}
              onAmortization={(trackId) => setAmortizationTarget({ trackId })}
            />
          }
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

        {/* הניתוח הגרפי וההשוואה באותו אזור */}
        <AnalysisTabs
          result={result}
          baseResult={baseResult}
          scenarioActive={scenarioActive}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          entries={comparisonEntries}
          comparedCount={comparedCount}
        />

        <EventsPanel
          result={result}
          onRemove={actions.removeEvent}
          onAddPrepayment={() => setPrepayTarget({})}
          onAddRefinance={() => setRefinanceTarget({})}
        />
      </div>

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
    </div>
  );
}

function WorkspaceTopBar() {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="container mx-auto px-4 py-2.5 flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-9" asChild>
          <Link href="/">
            <Home className="h-4 w-4 ml-1" />
            עמוד ראשי
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-9" asChild>
          <Link href="/saved-mixes">
            <BookmarkCheck className="h-4 w-4 ml-1" />
            האזור האישי
          </Link>
        </Button>
      </div>
    </div>
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
        <span className="block text-[10px] text-slate-500 leading-snug mt-0.5">{hint}</span>
      </span>
    </button>
  );
}
