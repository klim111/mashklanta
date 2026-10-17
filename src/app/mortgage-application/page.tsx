import { Metadata } from 'next';
import { MortgageApplication } from '@/components/mortgage-application/MortgageApplication';
import NavBar from '@/components/ui/navbar';

export const metadata: Metadata = {
  title: 'בקשת משכנתא חכמה | משכלנתא',
  description: 'מערכת חכמה לבקשת משכנתא עם מצב מודרך ומצב מקצועי, מעקב התקדמות ומחשבונים מתקדמים',
  keywords: ['בקשת משכנתא', 'משכנתא חכמה', 'יועץ משכנתא', 'מחשבון משכנתא', 'השוואת בנקים'],
};

export default function MortgageApplicationPage() {
  return (
    <>
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
        <NavBar />
      </div>
      <MortgageApplication />
    </>
  );
}