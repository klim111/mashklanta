import { Metadata } from 'next';
import { Suspense } from 'react';
import { LoanPlanner } from '@/components/consumer-loans/LoanPlanner';
import NavBar from '@/components/ui/navbar';

export const metadata: Metadata = {
  title: 'מתכנן הלוואות צרכניות | משכלנתא',
  description: 'כלי מתקדם לתכנון, השוואה ואופטימיזציה של הלוואות צרכניות עם חישובי אנונה מדויקים',
  keywords: ['הלוואות צרכניות', 'מחשבון הלוואה', 'השוואת הלוואות', 'אופטימיזציה פיננסית', 'אנונה'],
};

export default function ConsumerLoansPage() {
  return (
    <>
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <NavBar />
      </div>
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
            טוען...
          </div>
        }
      >
        <LoanPlanner />
      </Suspense>
    </>
  );
}