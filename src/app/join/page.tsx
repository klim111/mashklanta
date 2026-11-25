import type { Metadata } from 'next';
import { AdvisorJoinPage } from '@/components/join/AdvisorJoinPage';

export const metadata: Metadata = {
  title: 'משרד דיגיטלי ליועצי משכנתאות | משכלנתא',
  description:
    'משרד דיגיטלי ממותג ליועצי משכנתאות: דף משרד עם הלוגו והשם שלכם, אזור אישי ללקוחות, תמהילים, מכרזי ריביות ותיק מסמכים. הגישו בקשה להצטרפות.',
};

export default function JoinPage() {
  return <AdvisorJoinPage />;
}
