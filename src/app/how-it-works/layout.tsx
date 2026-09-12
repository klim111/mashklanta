import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'איך זה עובד | משכלתנא',
  description:
    'צומת מפגש בין לקוח ליועץ משכנתאות. בחרו בכל שלב אם לעשות לבד או עם יועץ, ראו את הפער מול ברירת המחדל של הבנק, ושלמו רק על מה שלקחתם.',
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
