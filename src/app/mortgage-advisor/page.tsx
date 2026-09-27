import { Metadata } from 'next';
import { MortgageWorkspace } from '@/components/mortgage-advisor/MortgageWorkspace';
import NavBar from '@/components/ui/navbar';

export const metadata: Metadata = {
  title: 'כלי יועצי משכנתא | משכלנתא',
  description: 'כלי מתקדם ליועצי משכנתא לבניית תמהילי משכנתא, השוואות והדמיות פיננסיות מקצועיות',
  keywords: ['יועצי משכנתא', 'תמהיל משכנתא', 'השוואת משכנתאות', 'כלי יועץ', 'חישובי משכנתא'],
};

export default function MortgageAdvisorPage() {
  return (
    <>
      <div className="relative z-50 bg-white/95 backdrop-blur-md shadow-sm">
        <NavBar />
      </div>
      <MortgageWorkspace />
    </>
  );
}
