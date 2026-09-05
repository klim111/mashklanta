'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { MortgagePlanningUserData } from '@/lib/mortgage-affordability';
import { startConsumerLoansImport } from '@/lib/consumer-loans-import';

type LoanManagementOfferMode = 'individual' | 'couple';

interface LoanManagementOfferProps {
  userData: MortgagePlanningUserData;
  mode: LoanManagementOfferMode;
  planningStep: 'personal-info' | 'personal-info-couple';
  onUserDataChange: (data: MortgagePlanningUserData) => void;
}

const copy: Record<
  LoanManagementOfferMode,
  { prompt: string; helpLabel: string; declineLabel: string }
> = {
  individual: {
    prompt: 'רוצה שמשכלנתא תעזור לך עם ההלוואות?',
    helpLabel: 'עזרו לי עם ההלוואות שלי',
    declineLabel: 'לא, תודה',
  },
  couple: {
    prompt: 'רוצה שמשכלנתא תעזור לכם עם ההלוואות?',
    helpLabel: 'עזרו לנו עם ההלוואות שלנו',
    declineLabel: 'לא, תודה',
  },
};

export function LoanManagementOffer({
  userData,
  mode,
  planningStep,
  onUserDataChange,
}: LoanManagementOfferProps) {
  const text = copy[mode];

  const goToConsumerLoans = () => {
    const nextUserData = { ...userData, wantsLoanManagement: true };
    onUserDataChange(nextUserData);
    localStorage.setItem(
      'mortgagePlanningData',
      JSON.stringify({ userData: nextUserData, currentStep: planningStep })
    );
    startConsumerLoansImport(nextUserData);
    window.location.href = '/consumer-loans?import=planning';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.3 }}
      className="text-center max-w-lg mx-auto"
    >
      <p className="text-gray-600 mb-4">{text.prompt}</p>
      <p className="text-sm text-gray-500 mb-4">(לאחד, לקחת הלוואה משתלמת יותר במקום?)</p>
      <div className="flex gap-4 justify-center flex-wrap">
        <Button
          variant={userData.wantsLoanManagement ? 'default' : 'outline'}
          onClick={goToConsumerLoans}
          className="px-6 py-2"
        >
          {text.helpLabel}
        </Button>
        <Button
          variant={!userData.wantsLoanManagement ? 'default' : 'outline'}
          onClick={() => onUserDataChange({ ...userData, wantsLoanManagement: false })}
          className="px-6 py-2"
        >
          {text.declineLabel}
        </Button>
      </div>
    </motion.div>
  );
}
