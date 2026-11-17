import Link from 'next/link';
import { ArrowLeft, BookOpen, Calculator, LineChart, PieChart, PiggyBank, RefreshCw, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface WorkTool {
  href: string;
  title: string;
  text: string;
  icon: LucideIcon;
  /** הכלי המרכזי של היועץ — כרטיס רחב בראש הרשימה */
  primary?: boolean;
}

const TOOLS: WorkTool[] = [
  {
    href: '/mortgage-advisor',
    title: 'בניית תמהיל',
    text: 'בונים ומשווים תמהילים ללקוח, ושומרים לתיק שלו או כתמהיל כללי.',
    icon: PieChart,
    primary: true,
  },
  {
    href: '/advisor-dashboard/tools/cash-flow',
    title: 'מצב הון ותזרים',
    text: 'המשכנתא וההלוואות מול ההכנסה הפנויה, לכל לקוח.',
    icon: LineChart,
  },
  {
    href: '/mortgage-planning?flow=affordability',
    title: 'בדיקת היתכנות',
    text: 'כמה נכס הלקוח יכול להרשות לעצמו.',
    icon: Calculator,
  },
  {
    href: '/equity-planning',
    title: 'תכנון הון עצמי',
    text: 'מקדמה, מס רכישה והוצאות נלוות על ציר זמן.',
    icon: PiggyBank,
  },
  {
    href: '/mortgage-refinance',
    title: 'מיחזור משכנתא',
    text: 'מה קורה להחזר ולריבית בשינוי תנאים.',
    icon: RefreshCw,
  },
  {
    href: '/consumer-loans',
    title: 'הלוואות צרכניות',
    text: 'מיפוי, איחוד ופירעון מוקדם של הלוואות.',
    icon: Wallet,
  },
  {
    href: '/learn',
    title: 'מרכז הלמידה',
    text: 'הסברים לשלוח ללקוחות: מסלולים, סלים ועמלות.',
    icon: BookOpen,
  },
];

/** כלי העבודה של היועץ — כל כלי נפתח במסך משלו */
export function AdvisorToolsGrid() {
  return (
    <div className="start-aligned grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        return (
          <Link
            key={tool.href}
            href={tool.href}
            className={`group flex items-start gap-3 rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
              tool.primary
                ? 'border-blue-600 bg-blue-600 text-white sm:col-span-2 xl:col-span-1'
                : 'border-slate-200 bg-white hover:border-blue-300'
            }`}
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                tool.primary ? 'bg-white/15 text-white' : 'bg-blue-50 text-blue-600'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-base font-black ${tool.primary ? 'text-white' : 'text-slate-900'}`}>
                {tool.title}
              </span>
              <span
                className={`mt-0.5 block text-sm leading-snug ${tool.primary ? 'text-white/80' : 'text-slate-500'}`}
              >
                {tool.text}
              </span>
            </span>
            <ArrowLeft
              className={`mt-1 h-4 w-4 shrink-0 ${tool.primary ? 'text-white/70' : 'text-slate-300 group-hover:text-blue-600'}`}
              aria-hidden
            />
          </Link>
        );
      })}
    </div>
  );
}
