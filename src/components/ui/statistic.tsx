"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Landmark,
  Percent,
  Radio,
  TrendingUp,
} from "lucide-react";
import {
  INTEREST_RATES,
  INTEREST_RATES_LIST,
  INTEREST_RATES_METADATA,
} from "@/lib/interest-rates";
import {
  fallbackPrimeForecast,
  type PrimeForecast,
} from "@/lib/prime-forward-curve";
import {
  fallbackInflationForecast,
  expectedInflationPath,
  inflationRateAtMonth,
  type InflationForecast,
} from "@/lib/inflation-forecast";
import {
  PrimeForwardChart,
  VariableForwardChart,
  previewPrimeForwardPoints,
  previewVariableForwardPoints,
} from "@/components/mortgage-advisor/workspace/PrimeForwardChart";
import { InflationForecastChart } from "@/components/mortgage-advisor/workspace/InflationForecastChart";
import { TRACK_COLORS } from "@/components/mortgage-advisor/workspace/primitives";

const FORECAST_YEARS = 15;

const RATE_TILE_COLORS: Record<string, string> = {
  fixed_unlinked: TRACK_COLORS.fixed_unlinked,
  fixed_linked: TRACK_COLORS.fixed_linked,
  variable_unlinked_2y: TRACK_COLORS.variable_unlinked,
  variable_unlinked_5y: TRACK_COLORS.variable_unlinked,
  variable_linked_2y: TRACK_COLORS.variable_linked,
  variable_linked_5y: TRACK_COLORS.variable_linked,
  prime: TRACK_COLORS.prime,
  makam: TRACK_COLORS.makam,
  eligibility: TRACK_COLORS.eligibility,
  dollar: TRACK_COLORS.dollar,
  euro: TRACK_COLORS.euro,
};

const SHORT_RATE_LABELS: Record<string, string> = {
  fixed_unlinked: 'קל"צ',
  fixed_linked: 'ק"צ',
  variable_unlinked_2y: 'מל"צ 2',
  variable_unlinked_5y: 'מל"צ 5',
  variable_linked_2y: 'מ"צ 2',
  variable_linked_5y: 'מ"צ 5',
  prime: "פריים",
  makam: 'מק"מ',
  eligibility: "זכאות",
  dollar: "דולר",
  euro: "יורו",
};

function forecastFromPayload(data: unknown): PrimeForecast | null {
  if (!data || typeof data !== "object") return null;
  const payload = data as {
    asOf?: unknown;
    source?: unknown;
    boiRate?: unknown;
    spots?: unknown;
  };
  if (!Array.isArray(payload.spots) || payload.spots.length < 2) return null;
  return {
    asOf: typeof payload.asOf === "string" ? payload.asOf : "",
    source: payload.source === "boi" ? "boi" : "fallback",
    boiRate: Number(payload.boiRate) || 3.5,
    spots: payload.spots,
  };
}

function inflationFromPayload(data: unknown): InflationForecast | null {
  if (!data || typeof data !== "object") return null;
  const inflation = (data as { inflation?: unknown }).inflation;
  if (!inflation || typeof inflation !== "object") return null;
  const payload = inflation as {
    asOf?: unknown;
    source?: unknown;
    spots?: unknown;
  };
  if (!Array.isArray(payload.spots) || payload.spots.length < 2) return null;
  return {
    asOf: typeof payload.asOf === "string" ? payload.asOf : "",
    source: payload.source === "boi" ? "boi" : "fallback",
    spots: payload.spots,
  };
}

function formatPct(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

function formatDate(value: string) {
  if (!value) return INTEREST_RATES_METADATA.lastUpdated;
  return value;
}

export default function Statistic() {
  const [primeForecast, setPrimeForecast] = useState<PrimeForecast>(() =>
    fallbackPrimeForecast(INTEREST_RATES.prime - 1.5)
  );
  const [inflationForecast, setInflationForecast] = useState<InflationForecast>(
    () => fallbackInflationForecast()
  );
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/boi/prime-curve")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setPrimeForecast(
          forecastFromPayload(data) ?? fallbackPrimeForecast(INTEREST_RATES.prime - 1.5)
        );
        setInflationForecast(inflationFromPayload(data) ?? fallbackInflationForecast());
        setLive(true);
      })
      .catch(() => {
        if (!cancelled) setLive(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const primePoints = useMemo(
    () => previewPrimeForwardPoints(INTEREST_RATES.prime, FORECAST_YEARS, primeForecast),
    [primeForecast]
  );
  const variablePoints = useMemo(
    () =>
      previewVariableForwardPoints(
        INTEREST_RATES.variable_unlinked_5y,
        FORECAST_YEARS,
        5,
        primeForecast
      ),
    [primeForecast]
  );

  const yearOneInflation = inflationRateAtMonth(
    expectedInflationPath(inflationForecast.spots),
    1
  );

  const kpis = [
    {
      label: "ריבית פריים",
      value: INTEREST_RATES.prime,
      hint: "ברירת מחדל במסלול",
      icon: TrendingUp,
      tone: "from-orange-500 to-amber-600",
    },
    {
      label: "ריבית בנק ישראל",
      value: primeForecast.boiRate,
      hint: live ? `עודכן ${formatDate(primeForecast.asOf)}` : "נתוני נפילה",
      icon: Landmark,
      tone: "from-blue-500 to-indigo-600",
    },
    {
      label: "אינפלציה צפויה",
      value: yearOneInflation,
      hint: "שנה קרובה · ציפיות השוק",
      icon: Percent,
      tone: "from-violet-500 to-fuchsia-600",
    },
    {
      label: 'קל"צ',
      value: INTEREST_RATES.fixed_unlinked,
      hint: "קבועה לא צמודה",
      icon: Activity,
      tone: "from-cyan-500 to-blue-600",
    },
  ];

  return (
    <section
      id="stats"
      dir="rtl"
      className="relative overflow-hidden bg-slate-950 px-4 py-12 text-white md:py-28"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[8%] h-[28rem] w-[28rem] rounded-full bg-blue-600/25 blur-3xl animate-blob" />
        <div className="absolute bottom-[-8rem] left-[6%] h-[32rem] w-[32rem] rounded-full bg-violet-600/20 blur-3xl animate-blob [animation-delay:3s]" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            {live ? "נתוני שוק חיים" : "נתוני שוק"}
            <Radio className="h-4 w-4 text-cyan-200" />
          </div>
          <h2 className="mb-4 text-4xl font-black text-white md:text-5xl">
            שוק המשכנתאות עכשיו
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-200">
            אותן תחזיות וריביות שמופיעות בבניית התמהיל — פריים פורוורד, אינפלציה
            צפויה, ומדד הריביות העדכניות של ברירת המחדל.
          </p>
        </motion.div>

        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="group relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-md"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${kpi.tone} shadow-lg`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-semibold text-slate-300">{kpi.label}</p>
                <p className="mt-1 bg-gradient-to-l from-white to-slate-200 bg-clip-text text-4xl font-black text-transparent">
                  {formatPct(kpi.value)}
                </p>
                <p className="mt-2 text-xs text-slate-400">{kpi.hint}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mb-10 grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-white/10 bg-white p-4 shadow-[0_30px_80px_rgba(0,0,0,0.5)] md:p-5"
          >
            <PrimeForwardChart
              previewPoints={primePoints}
              quotedRate={INTEREST_RATES.prime}
              height={240}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-white/10 bg-white p-4 shadow-[0_30px_80px_rgba(0,0,0,0.5)] md:p-5"
          >
            <InflationForecastChart forecast={inflationForecast} years={FORECAST_YEARS} height={240} />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 rounded-3xl border border-white/10 bg-white p-4 shadow-[0_30px_80px_rgba(0,0,0,0.5)] md:p-5"
        >
          <VariableForwardChart
            previewPoints={variablePoints}
            quotedRate={INTEREST_RATES.variable_unlinked_5y}
            height={220}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-2xl font-black text-white">מדד ריביות עדכניות</h3>
              <p className="mt-1 text-sm text-slate-300">
                הריביות שמוזנות כברירת מחדל בבניית התמהיל · עודכן{" "}
                {INTEREST_RATES_METADATA.lastUpdated}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {INTEREST_RATES_LIST.map((item, index) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.03 }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md"
              >
                <span
                  className="absolute inset-y-0 right-0 w-1.5"
                  style={{ backgroundColor: RATE_TILE_COLORS[item.key] ?? "#94a3b8" }}
                />
                <p className="text-xs font-bold text-slate-300">
                  {SHORT_RATE_LABELS[item.key] ?? item.label}
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight text-white">
                  {formatPct(item.rate)}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-400">
                  {item.label}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
