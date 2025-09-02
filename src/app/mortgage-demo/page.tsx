import { Metadata } from 'next';
import { MortgageDemo } from '@/components/mortgage-application/MortgageDemo';

export const metadata: Metadata = {
  title: 'דמו מערכת משכנתא | משכלנתא',
  description: 'דמו מקיף של המערכת החדשה לבקשת משכנתא עם כל הרכיבים והפיצ\'רים',
  keywords: ['דמו משכנתא', 'מערכת חכמה', 'בקשת משכנתא', 'כלים מתקדמים'],
};

export default function MortgageDemoPage() {
  return <MortgageDemo />;
}