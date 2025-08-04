   
//   import { Button } from "@/components/ui/button";
// export default function statistic() {
//   return (
//       <section className="text-center py-20 px-4 bg-background">
//         <h1 className="text-4xl font-bold mb-4">ייעוץ משכנתאות חכם, אנושי ואמין</h1>
//         <p className="text-lg text-muted-foreground mb-6">
//           ליווי אישי ומקצועי בדרך לדירה שלך. ניתוח תמהילים, ניהול מו"מ עם הבנקים והצגת כל האפשרויות בפשטות.
//         </p>
//         <Button size="lg">התחל כאן</Button>
//       </section>
// )}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FaBaby, FaMoneyBillWave, FaChartLine, FaHandshake } from "react-icons/fa";

const OPTIONS = [
  {
    key: "first",
    label: "קחו אותי למשכנתא הראשונה שלי",
    icon: <FaBaby size={28} className="text-blue-600" />,
    message: "צעד ראשון לדירה שלך יכול להיות פשוט, ברור, ונעים. אנחנו נהיה שם מהשלב הראשון, נסביר כל מונח, נבנה תמהיל שמתאים לך ונדאג שתקבל תנאים מצוינים."
  },
  {
    key: "reduce",
    label: "לשחרר קצת את התשלום החודשי",
    icon: <FaMoneyBillWave size={28} className="text-green-600" />,
    message: "אם כל חודש מרגיש כמו מרתון – הגיע הזמן להוריד הילוך. נבנה יחד איתך תמהיל שיקנה לך אוויר לנשימה ויחסוך לך כסף."
  },
  {
    key: "finish",
    label: "לסיים כבר עם המשכנתא",
    icon: <FaChartLine size={28} className="text-red-600" />,
    message: "רוצה להוריד את העול כמה שיותר מהר? נבנה אסטרטגיה חכמה להחזר מואץ שיחסוך לך ריביות וזמן – בלי להכביד עליך כלכלית."
  },
  {
    key: "noEquity",
    label: "אין לי הון עצמי – מה עושים?",
    icon: <FaHandshake size={28} className="text-yellow-600" />,
    message: "אל דאגה. יש פתרונות. נבחן איתך אפשרויות מימון, הלוואות גישור, ואפילו פתרונות יצירתיים שיעזרו לך להתקדם גם בלי הון עצמי גבוה."
  },
];

export default function MortgageIntro() {
  const [selected, setSelected] = useState(null);

  return (
    <section className="text-center py-20 px-4 ">
      <h1 className="text-4xl font-bold mb-4">ייעוץ משכנתאות חכם, אנושי ואמין</h1>
      <p className="text-lg text-muted-foreground mb-6 max-w-3xl mx-auto">
        אנחנו כאן כדי להפוך את המסע לדירה שלך לפשוט יותר, עם ליווי אישי ומקצועי. בעזרת מחשבונים חכמים, כלים מתקדמים וליווי של יועצים מנוסים – נחסוך לך זמן, כסף ודאגות.
      </p>

      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {OPTIONS.map((opt) => (
          <Button
            key={opt.key}
            onClick={() => setSelected(opt.key)}
            variant={selected === opt.key ? "default" : "outline"}
            className="text-sm sm:text-base"
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {selected && (
        <div className="max-w-2xl mx-auto mt-6 bg-gray-100 rounded-xl p-6 text-right shadow-md animate-slide-in">
          <div className="flex items-center gap-3 mb-2">
            {OPTIONS.find((opt) => opt.key === selected)?.icon}
            <h2 className="text-xl font-semibold">המסלול שלך</h2>
          </div>
          <p className="text-gray-700 leading-relaxed">
            {OPTIONS.find((opt) => opt.key === selected)?.message}
          </p>
        </div>
      )}
    </section>
  );
}
