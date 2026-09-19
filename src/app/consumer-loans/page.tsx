import { Metadata } from 'next';
import { Suspense } from 'react';
import { LoanWorkspace } from '@/components/consumer-loans/LoanWorkspace';
import NavBar from '@/components/ui/navbar';

export const metadata: Metadata = {
  title: 'ניתוח הלוואות צרכניות וכלכלת המשפחה | משכלנתא',
  description:
    'פאנל שליטה ודאשבורד חי לכל ההלוואות שלכם: החזר חודשי, ריבית עד הסוף, יחס החזר מההכנסה, תרחישי איחוד ופירעון מוקדם — וליווי של יועץ כלכלת המשפחה של משכלנתא',
  keywords: [
    'הלוואות צרכניות',
    'מחשבון הלוואה',
    'השוואת הלוואות',
    'איחוד הלוואות',
    'פירעון מוקדם',
    'יחס החזר',
    'כלכלת המשפחה',
  ],
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
        <LoanWorkspace />
      </Suspense>
    </>
  );
}