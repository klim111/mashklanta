import { Metadata } from 'next';
import { MortgageAdvisorTool } from '@/components/mortgage-advisor/MortgageAdvisorTool';

export const metadata: Metadata = {
  title: 'כלי יועצי משכנתא | משכלנתא',
  description: 'כלי מתקדם ליועצי משכנתא לבניית תמהילי משכנתא, השוואות והדמיות פיננסיות מקצועיות',
  keywords: ['יועצי משכנתא', 'תמהיל משכנתא', 'השוואת משכנתאות', 'כלי יועץ', 'חישובי משכנתא'],
};

export default function MortgageAdvisorPage() {
  return <MortgageAdvisorTool />;
}