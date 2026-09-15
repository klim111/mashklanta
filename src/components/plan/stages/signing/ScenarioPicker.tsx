'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Check,
  ChevronLeft,
  FileStack,
  HardHat,
  Home,
  LandPlot,
  Landmark,
  RefreshCw,
  ScrollText,
  Wallet,
} from 'lucide-react';
import {
  SIGNING_DEAL_TYPES,
  dealScenarios,
  registryOfScenario,
  signingDealType,
  signingRegistry,
  signingScenario,
} from '@/lib/signing-documents';
import type { SigningDealType, SigningRegistry, SigningScenario } from '@/lib/signing-documents';

/**
 * בחירת תרחיש הרכישה, שקובעת את רשימת המסמכים שהבנק ידרוש.
 *
 * הבחירה נעשית בשלבים: קודם סוג העסקה, בעסקאות יד 2 גם אופן רישום הזכויות,
 * ולבסוף התרחיש עצמו. כל בחירה הופכת לכותרת של המסך הבא, וכל שלב אחורה
 * פתוח בלחיצה על הכותרת.
 */

export interface ScenarioSelection {
  dealTypeId: string | null;
  registryId: string | null;
  scenarioId: string | null;
}

const DEAL_ICONS: Record<string, typeof Home> = {
  new_from_developer: Building2,
  second_hand: Home,
  lot: LandPlot,
  self_build: HardHat,
  any_purpose: Wallet,
};

const REGISTRY_ICONS: Record<string, typeof Home> = {
  tabu: ScrollText,
  rmi: Landmark,
};

const reveal = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.28 },
};

export function resolveSelection(value: ScenarioSelection): {
  deal: SigningDealType | null;
  registry: SigningRegistry | null;
  scenario: SigningScenario | null;
} {
  const deal = signingDealType(value.dealTypeId);
  const scenario = signingScenario(deal, value.scenarioId);
  const registry = deal
    ? scenario
      ? registryOfScenario(deal, scenario.id)
      : signingRegistry(deal, value.registryId)
    : null;
  return { deal, registry, scenario };
}

export function ScenarioPicker({
  value,
  onChange,
}: {
  value: ScenarioSelection;
  onChange: (next: ScenarioSelection) => void;
}) {
  const { deal, registry, scenario } = resolveSelection(value);

  /** התרחישים שמוצגים כרגע: של אופן הרישום שנבחר, או של סוג העסקה עצמו */
  const scenarios: SigningScenario[] = registry
    ? registry.scenarios
    : deal && !deal.registries
      ? dealScenarios(deal)
      : [];

  const step: 'deal' | 'registry' | 'scenario' = !deal
    ? 'deal'
    : deal.registries && !registry
      ? 'registry'
      : 'scenario';

  const pickDeal = (next: SigningDealType) =>
    onChange({ dealTypeId: next.id, registryId: null, scenarioId: null });

  const pickRegistry = (next: SigningRegistry) =>
    onChange({ dealTypeId: deal?.id ?? null, registryId: next.id, scenarioId: null });

  const pickScenario = (next: SigningScenario) =>
    onChange({
      dealTypeId: deal?.id ?? null,
      registryId: registry?.id ?? null,
      scenarioId: next.id,
    });

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 w-full bg-gradient-to-l ${deal?.gradient ?? 'from-slate-300 to-slate-200'}`} />

      <div className="p-5 md:p-6">
        <Breadcrumb
          deal={deal}
          registry={registry}
          scenario={scenario}
          onReset={() => onChange({ dealTypeId: null, registryId: null, scenarioId: null })}
          onBackToRegistry={() =>
            onChange({ dealTypeId: deal?.id ?? null, registryId: null, scenarioId: null })
          }
          onBackToScenarios={() =>
            onChange({
              dealTypeId: deal?.id ?? null,
              registryId: registry?.id ?? null,
              scenarioId: null,
            })
          }
        />

        <AnimatePresence mode="wait" initial={false}>
          {step === 'deal' && (
            <motion.div key="deal" {...reveal}>
              <StepHeading
                eyebrow="שאלה ראשונה"
                title="איזו עסקה אתם חותמים?"
                hint="סוג העסקה הוא מה שקובע איזו רשימת מסמכים הבנק ידרוש מכם לקראת החתימה."
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {SIGNING_DEAL_TYPES.map((item, index) => {
                  const Icon = DEAL_ICONS[item.id] ?? FileStack;
                  return (
                    <ChoiceCard
                      key={item.id}
                      index={index}
                      icon={Icon}
                      gradient={item.gradient}
                      title={item.title}
                      description={item.tagline}
                      meta={`${dealScenarios(item).length} תרחישים`}
                      onClick={() => pickDeal(item)}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 'registry' && deal?.registries && (
            <motion.div key={`registry-${deal.id}`} {...reveal}>
              <StepHeading
                eyebrow={deal.title}
                title="איפה רשומות הזכויות בנכס?"
                hint="בדירה יד 2 הדרישה של הבנק נגזרת מהמקום שבו מנוהלות הזכויות — ומשם נפתחים התרחישים."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {deal.registries.map((item, index) => {
                  const Icon = REGISTRY_ICONS[item.id] ?? FileStack;
                  return (
                    <ChoiceCard
                      key={item.id}
                      index={index}
                      icon={Icon}
                      gradient={deal.gradient}
                      title={item.title}
                      description={item.description}
                      meta={`${item.scenarios.length} תרחישים`}
                      onClick={() => pickRegistry(item)}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 'scenario' && deal && !scenario && (
            <motion.div key={`scenario-${deal.id}-${registry?.id ?? 'all'}`} {...reveal}>
              <StepHeading
                eyebrow={registry ? `${deal.title} · ${registry.title}` : deal.title}
                title="מה מצב הזכויות בעסקה שלכם?"
                hint="בחרו את התרחיש המדויק. רשימת המסמכים שתוצג נגזרת ממנו במלואה."
              />
              <div className="grid gap-3">
                {scenarios.map((item, index) => (
                  <ScenarioRow
                    key={item.id}
                    index={index}
                    number={index + 1}
                    gradient={deal.gradient}
                    scenario={item}
                    onClick={() => pickScenario(item)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {step === 'scenario' && deal && scenario && (
            <motion.div key={`chosen-${scenario.id}`} {...reveal}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full bg-gradient-to-l ${deal.gradient} px-3 py-1 text-[11px] font-black text-white`}
                    >
                      {deal.short}
                    </span>
                    {registry && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                        {registry.title}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                      <Check className="h-3 w-3" />
                      התרחיש נבחר
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-xl font-black leading-snug text-slate-900 md:text-2xl">
                    {scenario.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-500">
                    {scenario.documents.length} מסמכים ודרישות שהבנק יבקש בתרחיש הזה.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ dealTypeId: null, registryId: null, scenarioId: null })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  שינוי התרחיש
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function StepHeading({
  eyebrow,
  title,
  hint,
}: {
  eyebrow: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="mb-6 text-center">
      <p className="text-[13px] font-black tracking-wide text-slate-400">{eyebrow}</p>
      <h3 className="mt-1.5 text-2xl font-black leading-snug text-slate-900 md:text-3xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-[15px] font-medium leading-relaxed text-slate-600">
        {hint}
      </p>
    </div>
  );
}

function Breadcrumb({
  deal,
  registry,
  scenario,
  onReset,
  onBackToRegistry,
  onBackToScenarios,
}: {
  deal: SigningDealType | null;
  registry: SigningRegistry | null;
  scenario: SigningScenario | null;
  onReset: () => void;
  onBackToRegistry: () => void;
  onBackToScenarios: () => void;
}) {
  if (!deal) return null;

  const crumbs: Array<{ label: string; onClick: (() => void) | null }> = [
    { label: deal.short, onClick: onReset },
  ];
  if (registry) crumbs.push({ label: registry.title, onClick: scenario ? onBackToScenarios : onBackToRegistry });
  if (scenario) crumbs.push({ label: scenario.short, onClick: null });

  return (
    <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-400">
      {crumbs.map((crumb, index) => (
        <span key={crumb.label} className="inline-flex items-center gap-1.5">
          {index > 0 && <ChevronLeft className="h-3.5 w-3.5 text-slate-300" />}
          {crumb.onClick ? (
            <button
              type="button"
              onClick={crumb.onClick}
              className="rounded-lg px-2 py-1 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              {crumb.label}
            </button>
          ) : (
            <span className="px-2 py-1 text-slate-700">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function ChoiceCard({
  index,
  icon: Icon,
  gradient,
  title,
  description,
  meta,
  onClick,
}: {
  index: number;
  icon: typeof Home;
  gradient: string;
  title: string;
  description: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      onClick={onClick}
      className="group relative flex h-full flex-col items-center overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-5 text-center transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${gradient} opacity-15 blur-2xl transition-opacity group-hover:opacity-40`}
      />
      <span
        className={`relative mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}
      >
        <Icon className="h-6 w-6 text-white" />
      </span>
      <h4 className="relative text-base font-black leading-snug text-slate-900">{title}</h4>
      <p className="relative mt-1.5 flex-1 text-[15px] font-medium leading-relaxed text-slate-600">
        {description}
      </p>
      <span className="relative mt-4 inline-flex items-center gap-1.5 text-xs font-black text-slate-400 transition-colors group-hover:text-slate-700">
        {meta}
        <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
      </span>
    </motion.button>
  );
}

function ScenarioRow({
  index,
  number,
  gradient,
  scenario,
  onClick,
}: {
  index: number;
  number: number;
  gradient: string;
  scenario: SigningScenario;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-4 transition-all hover:-translate-x-1 hover:border-slate-300 hover:shadow-lg"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-sm font-black text-white shadow-md`}
      >
        {number}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-black leading-snug text-slate-900 md:text-base">
          {scenario.title}
        </span>
        <span className="mt-1 block text-[13px] font-bold text-slate-500">
          {scenario.documents.length} מסמכים ודרישות
        </span>
      </span>
      <ChevronLeft className="h-5 w-5 shrink-0 text-slate-300 transition-all group-hover:-translate-x-1 group-hover:text-slate-600" />
    </motion.button>
  );
}
