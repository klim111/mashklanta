import { Metadata } from 'next';
import { LoanPlanner } from '@/components/consumer-loans/LoanPlanner';

export const metadata: Metadata = {
  title: 'מתכנן הלוואות צרכניות | משכלנתא',
  description: 'כלי מתקדם לתכנון, השוואה ואופטימיזציה של הלוואות צרכניות עם חישובי אנונה מדויקים',
  keywords: ['הלוואות צרכניות', 'מחשבון הלוואה', 'השוואת הלוואות', 'אופטימיזציה פיננסית', 'אנונה'],
};

export default function ConsumerLoansPage() {
  return <LoanPlanner />;
}