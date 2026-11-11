import { journeyStages } from '@/data/platform/journey';

/** ניווט לאורך כל השלבים: חמשת שלבי המשכנתא בשורה אחת */
export function StagesSlide() {
  return (
    <div className="w-full px-4" dir="rtl">
      <div className="relative mb-6 lg:mb-10">
        <div className="absolute top-7 right-[6%] left-[6%] hidden h-1 rounded-full bg-slate-200 md:block" />
        <div className="absolute top-7 right-[6%] left-[6%] hidden h-1 overflow-hidden rounded-full md:block">
          <div className="h-full w-full bg-gradient-to-l from-blue-500 via-violet-500 to-rose-500 animate-draw-line" />
        </div>
        <ol className="relative mx-auto grid max-w-xs grid-cols-5 gap-0.5 sm:max-w-md sm:gap-1 md:max-w-none md:gap-2">
          {journeyStages.map((stage) => (
            <li key={stage.id} className="flex flex-col items-center text-center">
              <span
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-black text-white shadow-lg sm:h-12 sm:w-12 sm:rounded-2xl sm:text-base md:h-14 md:w-14 md:text-lg ${stage.gradient} animate-pulse-glow`}
              >
                {stage.number}
              </span>
              <span className="mt-1.5 text-2xs font-bold leading-tight text-slate-800 sm:mt-3 sm:text-2xs md:text-sm">
                {stage.shortTitle}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="text-center text-2xl font-black text-emerald-600 md:text-3xl">ניווט לאורך כל השלבים</p>
      <p className="mt-1 text-center text-base text-slate-600 md:text-lg">
        מנהלים את כל התהליך מול כל הגורמים, עם כל החישובים והמסמכים, במקום אחד.
      </p>
    </div>
  );
}
