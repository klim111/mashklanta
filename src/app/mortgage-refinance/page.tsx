'use client';

import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, LayoutDashboard, Upload, Target, Banknote, Clock } from 'lucide-react';
import type { MortgageMix } from '@/components/mortgage-advisor/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import NavBar from '@/components/ui/navbar';
import { ScenarioAnalysis } from '@/components/mortgage-advisor/ScenarioAnalysis';
import { MortgageDetailsModal } from '@/components/mortgage-advisor/MortgageDetailsModal';
import { RefinanceMortgageInput } from '@/components/mortgage-refinance/RefinanceMortgageInput';
import { calculateMortgageMix } from '@/components/mortgage-advisor/mortgageCalculations';
import { useMarketRates } from '@/hooks/useMarketRates';
import { mixWithRemainingTerms } from '@/lib/refinance';
import { AdvisorHelpButton } from '@/components/plan/stages/analysis/AdvisorHelpButton';
import { AdvisorLeadDialog } from '@/components/plan/advisor/AdvisorLeadDialog';
import { useClientConversation } from '@/components/conversation/ClientChatDock';
import { saveRefinanceAsNewPlan } from '@/components/mortgage-refinance/refinancePlan';
import { RefinanceCheck } from '@/components/refinance-check/RefinanceCheck';
import { RefinancePreviewBar } from '@/components/refinance-check/RefinancePreviewBar';
import { guestRefinanceMix, reviveMix, saveGuestMix } from '@/components/refinance-check/refinanceCheckStore';
import { useToolData } from '@/components/tool-data/toolData';
import { PhoneBlockedScreen, useIsPhone } from '@/components/device/PhoneGate';

type RefinanceStep = 'tracks' | 'goal';

const EMPTY_MIX: MortgageMix = {
  id: 'refinance-current',
  name: 'המשכנתא הנוכחית',
  totalAmount: 0,
  tracks: [],
  createdAt: new Date(),
};

/**
 * מיחזור משכנתא.
 *
 * משתמש רשום (וכל הדגמה) מקבל את כלי המיחזור המלא, בלי שינוי. אורח מקבל את
 * בדיקת המיחזור המהירה; ממנה הוא יכול לפתוח את מסך ההצצה (`?view=preview`) —
 * הכלי המלא עם המסלולים שהזין ו-3 שינויים לדפדפן.
 *
 * מה שהאורח הזין נשמר בדפדפן, ובכניסה הראשונה אחרי ההרשמה עובר לחשבון: הכלי
 * של המשתמש הרשום נפתח עם אותם מסלולים, ושומר כל שינוי בחשבון.
 */
export default function MortgageRefinancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <RefinanceEntry />
    </Suspense>
  );
}

function RefinanceEntry() {
  const { status } = useSession();
  const view = useSearchParams().get('view');
  const isPhone = useIsPhone();

  if (status === 'loading') return <div className="min-h-screen bg-slate-50" />;
  if (status === 'authenticated') return <SignedInTool />;

  if (view === 'preview') {
    // הדאשבורד והשלבים אינם מותאמים לטלפון, ולכן גם ההצצה אליהם
    if (isPhone) return <PhoneBlockedScreen signedIn={false} />;
    return <PreviewTool />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="relative z-50 bg-white/98 backdrop-blur-sm shadow-sm border-b border-slate-100">
        <NavBar />
      </div>
      <RefinanceCheck />
    </div>
  );
}

function PreviewTool() {
  const [mix, setMix] = useState<MortgageMix | null | undefined>(undefined);
  useEffect(() => setMix(guestRefinanceMix()), []);
  if (mix === undefined) return <div className="min-h-screen bg-slate-50" />;
  return (
    <FullRefinanceTool initialMix={mix ?? undefined} banner={<RefinancePreviewBar />} onMixPersist={saveGuestMix} />
  );
}

/** משתמש רשום: המשכנתא הנוכחית נפתחת מהחשבון — כולל מה שהזין לפני שנרשם */
function SignedInTool() {
  const { ready, initial, save } = useToolData('refinance', reviveMix);
  if (!ready) return <div className="min-h-screen bg-slate-50" />;
  return <FullRefinanceTool initialMix={initial ?? undefined} onMixPersist={save} />;
}

function FullRefinanceTool({
  initialMix,
  banner,
  onMixPersist,
}: {
  initialMix?: MortgageMix;
  banner?: ReactNode;
  /** שמירת המשכנתא הנוכחית אחרי כל שינוי — לדפדפן אצל האורח, לחשבון אצל הרשום */
  onMixPersist?: (mix: MortgageMix) => void;
} = {}) {
  const { data: session, status } = useSession();
  /** הכלי פתוח לכולם. למשתמש שאינו רשום הוא מוגבל לבדיקה אחת */
  const isGuest = status !== 'loading' && !session;
  const { market } = useMarketRates();
  const [currentMix, setCurrentMix] = useState<MortgageMix>(initialMix ?? EMPTY_MIX);
  const persistRef = useRef(onMixPersist);
  persistRef.current = onMixPersist;
  const firstMix = useRef(currentMix);
  useEffect(() => {
    // מה שנפתח כבר שמור — שומרים רק מה שהשתנה מאז
    if (currentMix === firstMix.current) return;
    persistRef.current?.(currentMix);
  }, [currentMix]);
  const [currentStep, setCurrentStep] = useState<RefinanceStep>('tracks');
  const [inputMethod, setInputMethod] = useState<'scan' | 'manual'>('manual');
  const [showScenarioAnalysis, setShowScenarioAnalysis] = useState<MortgageMix | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<MortgageMix | null>(null);
  const [perTrackRefinanceEnabled, setPerTrackRefinanceEnabled] = useState(false);
  const [mixSummaryRevealed, setMixSummaryRevealed] = useState(false);
  const [readyForGoal, setReadyForGoal] = useState(false);
  /** טופס הפנייה ליועץ — נפתח מהכפתור הצף */
  const [leadOpen, setLeadOpen] = useState(false);
  /** משתמש רשום מגיע מהאזור האישי, וחוזר אליו */
  const signedIn = status === 'authenticated';
  const conversation = useClientConversation();

  const totalTracksAmount = currentMix.tracks.reduce((sum, track) => sum + track.amount, 0);
  const isMixValid =
    !!currentMix.bank &&
    currentMix.tracks.length > 0 &&
    (perTrackRefinanceEnabled ||
      (currentMix.totalAmount > 0 && Math.abs(totalTracksAmount - currentMix.totalAmount) < 1000));

  const mixWithCalculations = (): MortgageMix => {
    if (currentMix.tracks.length === 0) return currentMix;
    // התקופה של כל מסלול היא מה שנותר עד סוף המשכנתא לפי התאריכים שהוזנו
    const calc = calculateMortgageMix(mixWithRemainingTerms(currentMix));
    return {
      ...calc.mix,
      name: `המשכנתא הנוכחית${currentMix.bank ? ` - ${currentMix.bank}` : ''}`,
    };
  };

  const handleGoalSelect = (_goal: 'reduce-payment' | 'shorten-period') => {
    setShowScenarioAnalysis(mixWithCalculations());
  };

  const renderRefinanceGoalSelection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className="text-title font-bold text-slate-900 mb-6">מה המטרה שלך במיחזור?</h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          בחר את הכיוון שמתאים לך ונמשיך לניתוח האפשרויות
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <motion.div whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
          <Card
            className="group cursor-pointer border border-slate-200 hover:border-purple-300 transition-all duration-300 bg-white shadow-xl hover:shadow-2xl min-h-[320px]"
            onClick={() => handleGoalSelect('reduce-payment')}
          >
            <CardContent className="p-8 text-center h-full flex flex-col justify-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Banknote className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-subtitle font-bold text-slate-900 mb-4 group-hover:text-purple-600 transition-colors">
                הקטנת תשלום חודשי
              </h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                מציאת תנאים טובים יותר שיפחיתו את ההחזר החודשי תוך שמירה על תקופת המשכנתא
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
          <Card
            className="group cursor-pointer border border-slate-200 hover:border-orange-300 transition-all duration-300 bg-white shadow-xl hover:shadow-2xl min-h-[320px]"
            onClick={() => handleGoalSelect('shorten-period')}
          >
            <CardContent className="p-8 text-center h-full flex flex-col justify-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Clock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-subtitle font-bold text-slate-900 mb-4 group-hover:text-orange-600 transition-colors">
                הקטנת סכום
              </h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                קיצור תקופת המשכנתא להקטנת הסכום הכולל שישולם עד סיום ההלוואה
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="text-center mt-8">
        <Button
          variant="outline"
          onClick={() => {
            setMixSummaryRevealed(false);
            setReadyForGoal(false);
            setCurrentStep('tracks');
          }}
          className="px-6 py-3"
        >
          <ArrowLeft className="w-5 h-5 ml-2" />
          חזור לפרטי התמהיל
        </Button>
      </div>
    </motion.div>
  );

  const renderScanUpload = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className="text-title font-bold text-slate-900 mb-6">סריקת דוח יתרות לסילוק</h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          העלה את דוח היתרות לסילוק של המשכנתא הנוכחית שלך
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 mb-6">
          <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">גרור קובץ לכאן או לחץ לבחירה</p>
          <Button variant="outline" className="px-6 py-3">
            בחר קובץ
          </Button>
        </div>

        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => setInputMethod('manual')} className="px-6 py-3">
            <ArrowLeft className="w-5 h-5 ml-2" />
            חזור להזנה ידנית
          </Button>
          <Button onClick={() => setInputMethod('manual')} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white">
            <Target className="w-5 h-5 ml-2" />
            המשך להזנת מסלולים
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const renderManualInput = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={mixSummaryRevealed ? "max-w-7xl mx-auto" : "max-w-6xl mx-auto"}
    >
      {/* אחרי שהניתוח נפתח הכותרת מתכווצת לשורה אחת — כדי שהפאנל והדאשבורד
          ייכנסו למסך בלי גלילה מיותרת */}
      {mixSummaryRevealed ? (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-center">
          <h1 className="text-title font-bold text-slate-900">מיחזור המשכנתא שלכם</h1>
          <span className="text-sm text-slate-500">— שנו פרמטרים בפאנל וראו מיד את התוצאה</span>
        </div>
      ) : (
        <div className="text-center mb-10">
          <h1 className="text-title font-bold text-slate-900 mb-4">הזנת פרטי המשכנתא הנוכחית</h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            הזן את נתוני המשכנתא והמסלולים כדי לחשב את אפשרויות המיחזור
          </p>
          <Button variant="link" className="mt-4 text-blue-600" onClick={() => setInputMethod('scan')}>
            <Upload className="w-4 h-4 ml-2" />
            העלאת דוח יתרות לסילוק במקום הזנה ידנית
          </Button>
        </div>
      )}

      <RefinanceMortgageInput
        mix={currentMix}
        onMixChange={setCurrentMix}
        perTrackRefinanceEnabled={perTrackRefinanceEnabled}
        onPerTrackRefinanceEnabledChange={setPerTrackRefinanceEnabled}
        onMixSummaryRevealedChange={(revealed) => {
          setMixSummaryRevealed(revealed);
          if (revealed) setReadyForGoal(true);
        }}
        readyForGoal={readyForGoal}
        onReadyForGoalChange={setReadyForGoal}
        onProceedToRefinanceOptions={() => setCurrentStep('goal')}
        onShowDetails={setShowDetailsModal}
        onAnalyzeScenarios={setShowScenarioAnalysis}
        isGuest={isGuest}
        market={market}
        onSaveRefinance={saveRefinanceAsNewPlan}
        saveContext="tool"
      />

      <div className="flex gap-4 justify-center mt-8">
        {/* למחובר יש את הכפתור הצף «חזרה לדאשבורד», ולכן אין כאן כפתור חזרה נוסף */}
        {!signedIn && (
          <Link href="/">
            <Button variant="outline" className="px-6 py-3">
              <ArrowLeft className="w-5 h-5 ml-2" />
              חזור לעמוד הבית
            </Button>
          </Link>
        )}
        {/* בזרימה הרגילה בחירת מטרת המיחזור מתבצעת בתוך תיבת המצב הנוכחי. הכפתור נשאר לזרימת מיחזור לכל מסלול. */}
        {perTrackRefinanceEnabled && (
          <Button
            onClick={() => setCurrentStep('goal')}
            disabled={!isMixValid || !readyForGoal}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Target className="w-5 h-5 ml-2" />
            המשך לבחירת מטרת המיחזור
          </Button>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="relative z-50 bg-white/98 backdrop-blur-sm shadow-sm border-b border-slate-100">
        <NavBar />
      </div>

      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        {banner && <div className="mb-8">{banner}</div>}
        {currentStep === 'goal' && renderRefinanceGoalSelection()}
        {currentStep === 'tracks' && inputMethod === 'scan' && renderScanUpload()}
        {currentStep === 'tracks' && inputMethod === 'manual' && renderManualInput()}
      </div>

      <MortgageDetailsModal
        mix={showDetailsModal}
        isOpen={!!showDetailsModal}
        onClose={() => setShowDetailsModal(null)}
      />

      {showScenarioAnalysis && (
        <ScenarioAnalysis baseMix={showScenarioAnalysis} onClose={() => setShowScenarioAnalysis(null)} />
      )}

      {/* הכפתורים הצפים — אותם כפתורים שמלווים את שלבי המשכנתא החדשה */}
      <AdvisorHelpButton
        stageLabel="כלי המיחזור"
        title="היעזרו ביועץ משכנתא במיחזור"
        description="יועץ משכלנתא יבחן איתכם את המשכנתא הנוכחית, יבנה את התמהיל למיחזור וינהל את המשא ומתן מול הבנק. הפנייה חינמית — התשלום מסודר מולו בהמשך, רק אם תחליטו להמשיך."
        onRequestAdvisor={() => setLeadOpen(true)}
        opensDialog
      />
      <AdvisorLeadDialog open={leadOpen} onOpenChange={setLeadOpen} topic="REFINANCE_HYBRID" />

      {/* ללקוח מחובר עיגול הפעולות מחזיק את החזרה לדאשבורד; כאן רק למי שאין לו אותו */}
      {signedIn && !conversation?.enabled && (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2.5 print:hidden">
          <Link
            href="/dashboard"
            aria-label="חזרה לדאשבורד"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 p-3.5 sm:px-5 sm:py-3 text-button font-black text-white shadow-xl shadow-blue-600/30 transition-transform hover:-translate-y-0.5"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="sr-only sm:not-sr-only">חזרה לדאשבורד</span>
          </Link>
        </div>
      )}
    </div>
  );
}
