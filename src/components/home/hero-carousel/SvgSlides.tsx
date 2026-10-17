// מסכי ה-SVG של קרוסלת הראש: המאזניים, פשטות ושקיפות, והתמהיל האופטימלי

/** משך מסך המאזניים; תואם את האנימציות balance-* ב-globals.css */
export const BALANCE_MS = 10500;

/** שוויון כוחות: המאזניים נוטים לצד הבנק עד שמשכלנתא נוחתת בצד שלכם */
export function BalanceSlide() {
  return (
    <div className="h-full w-full px-4">
      <svg viewBox="40 40 720 360" className="h-full w-full">
        <defs>
          <linearGradient id="balance-logo-icon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2563eb" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        {/* עמוד ובסיס */}
        <path d="M400 112 L400 292" stroke="rgba(51, 65, 85, 0.55)" strokeWidth="6" strokeLinecap="round" />
        <rect x="330" y="290" width="140" height="14" rx="7" fill="rgba(51, 65, 85, 0.45)" />
        <circle cx="400" cy="104" r="10" fill="rgba(59, 130, 246, 0.85)" />

        {/* הקורה */}
        <g className="animate-balance-beam">
          <path d="M200 110 L600 110" stroke="rgba(51, 65, 85, 0.7)" strokeWidth="6" strokeLinecap="round" />
        </g>

        {/* הכף שלכם (שמאל): משכלנתא מפילה לתוכה את הכלים אחד אחרי השני */}
        <g className="animate-balance-pan-light">
          <path d="M200 110 L125 200 M200 110 L275 200" stroke="rgba(100, 116, 139, 0.6)" strokeWidth="2" />
          <g className="animate-balance-drop-1">
            <rect x="126" y="170" width="46" height="26" rx="8" fill="rgba(16, 185, 129, 0.85)" />
            <text x="149" y="188" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" direction="rtl">
              ידע
            </text>
          </g>
          <g className="animate-balance-drop-2">
            <rect x="177" y="170" width="46" height="26" rx="8" fill="rgba(59, 130, 246, 0.85)" />
            <text x="200" y="188" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" direction="rtl">
              כלים
            </text>
          </g>
          <g className="animate-balance-drop-3">
            <rect x="228" y="170" width="46" height="26" rx="8" fill="rgba(139, 92, 246, 0.85)" />
            <text x="251" y="188" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" direction="rtl">
              שקיפות
            </text>
          </g>
          {/* משכלנתא: מרחפת מעל הכף, מפילה את שלוש הלבנים ואז נוחתת עליהן בעצמה */}
          <g className="animate-balance-logo">
            <rect x="138" y="76" width="124" height="30" rx="9" fill="white" stroke="rgba(37, 99, 235, 0.55)" strokeWidth="2" />
            <rect x="232" y="80" width="24" height="22" rx="6" fill="url(#balance-logo-icon)" />
            <path d="M238 92 L244 87 L250 92 L250 98 L238 98 Z" fill="none" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
            <text x="184" y="97" textAnchor="middle" fontSize="16" fontWeight="900" fill="#0f172a" direction="rtl">
              מ<tspan fill="#059669">שכל</tspan>נתא
            </text>
          </g>
          <path d="M115 200 Q200 244 285 200 Z" fill="rgba(59, 130, 246, 0.25)" stroke="rgba(59, 130, 246, 0.7)" strokeWidth="3" />
          <text x="200" y="262" textAnchor="middle" fill="rgba(30, 64, 175, 0.9)" fontSize="20" fontWeight="bold" direction="rtl">
            אתם
          </text>
        </g>

        {/* הכף של הבנק (ימין) */}
        <g className="animate-balance-pan-heavy">
          <path d="M600 110 L525 200 M600 110 L675 200" stroke="rgba(100, 116, 139, 0.6)" strokeWidth="2" />
          <path d="M566 162 L600 144 L634 162 Z" fill="rgba(71, 85, 105, 0.75)" />
          <rect x="570" y="164" width="7" height="28" fill="rgba(71, 85, 105, 0.6)" />
          <rect x="586" y="164" width="7" height="28" fill="rgba(71, 85, 105, 0.6)" />
          <rect x="607" y="164" width="7" height="28" fill="rgba(71, 85, 105, 0.6)" />
          <rect x="623" y="164" width="7" height="28" fill="rgba(71, 85, 105, 0.6)" />
          <rect x="564" y="192" width="72" height="6" rx="2" fill="rgba(71, 85, 105, 0.75)" />
          <path d="M515 200 Q600 244 685 200 Z" fill="rgba(100, 116, 139, 0.2)" stroke="rgba(71, 85, 105, 0.7)" strokeWidth="3" />
          <text x="600" y="262" textAnchor="middle" fill="rgba(51, 65, 85, 0.9)" fontSize="20" fontWeight="bold" direction="rtl">
            הבנק
          </text>
        </g>

        {/* Title */}
        <text x="400" y="350" textAnchor="middle" fill="rgba(59, 130, 246, 0.9)" fontSize="32" fontWeight="bold" direction="rtl">
          שוויון כוחות מול הבנק
        </text>
        <text x="400" y="380" textAnchor="middle" fill="rgba(75, 85, 99, 0.8)" fontSize="17" direction="rtl">
          לבנק יש ידע וכוח. עם משכלנתא בצד שלכם, גם אתם מגיעים מוכנים למערכה.
        </text>
      </svg>
    </div>
  );
}

/** פשטות ושקיפות מלאה */
export function TransparencySlide() {
  return (
    <div className="h-full w-full px-4">
      <svg viewBox="40 40 720 360" className="h-full w-full">
        {/* Shield Icon */}
        <path
          d="M400 50 L350 80 L350 200 Q350 250 400 280 Q450 250 450 200 L450 80 Z"
          fill="rgba(59, 130, 246, 0.2)"
          stroke="rgba(59, 130, 246, 0.6)"
          strokeWidth="3"
          className="animate-pulse-glow"
        />

        {/* Checkmarks inside shield */}
        <path d="M370 150 L385 165 L420 130" stroke="rgba(34, 197, 94, 0.8)" strokeWidth="4" fill="none" className="animate-draw-line" />
        <path
          d="M370 180 L385 195 L420 160"
          stroke="rgba(34, 197, 94, 0.8)"
          strokeWidth="4"
          fill="none"
          className="animate-draw-line"
          style={{ animationDelay: '0.5s' }}
        />
        <path
          d="M370 210 L385 225 L420 190"
          stroke="rgba(34, 197, 94, 0.8)"
          strokeWidth="4"
          fill="none"
          className="animate-draw-line"
          style={{ animationDelay: '1s' }}
        />

        {/* Floating Elements */}
        <circle cx="300" cy="120" r="15" fill="rgba(59, 130, 246, 0.3)" className="animate-float-up" />
        <rect
          x="480"
          y="140"
          width="30"
          height="20"
          rx="5"
          fill="rgba(99, 102, 241, 0.3)"
          className="animate-float-up"
          style={{ animationDelay: '0.7s' }}
        />
        <polygon
          points="520,200 540,220 520,240"
          fill="rgba(139, 92, 246, 0.3)"
          className="animate-float-up"
          style={{ animationDelay: '1.4s' }}
        />

        {/* Title */}
        <text x="400" y="350" textAnchor="middle" fill="rgba(59, 130, 246, 0.9)" fontSize="32" fontWeight="bold">
          פשטות ושקיפות מלאה
        </text>
        <text x="400" y="380" textAnchor="middle" fill="rgba(75, 85, 99, 0.8)" fontSize="18" direction="rtl">
          בכל שלב אתם רואים את תוצרי העבודה של היועץ.
        </text>
      </svg>
    </div>
  );
}

/** תמהיל אופטימלי מותאם */
export function MixSlide() {
  return (
    <div className="h-full w-full px-4">
      <svg viewBox="40 40 720 360" className="h-full w-full">
        {/* Multiple Charts Representing Mix */}
        <rect x="150" y="180" width="100" height="120" rx="10" fill="rgba(168, 85, 247, 0.3)" className="animate-float-up" />
        <rect
          x="280"
          y="160"
          width="100"
          height="140"
          rx="10"
          fill="rgba(139, 92, 246, 0.4)"
          className="animate-float-up"
          style={{ animationDelay: '0.5s' }}
        />
        <rect
          x="410"
          y="140"
          width="100"
          height="160"
          rx="10"
          fill="rgba(124, 58, 237, 0.5)"
          className="animate-float-up"
          style={{ animationDelay: '1s' }}
        />
        <rect
          x="540"
          y="170"
          width="100"
          height="130"
          rx="10"
          fill="rgba(109, 40, 217, 0.4)"
          className="animate-float-up"
          style={{ animationDelay: '1.5s' }}
        />

        {/* Connecting Lines */}
        <path
          d="M200 150 Q300 100 400 120 Q500 100 600 150"
          stroke="rgba(34, 197, 94, 0.6)"
          strokeWidth="3"
          fill="none"
          className="animate-draw-line"
        />

        {/* Percentage Labels */}
        <text x="200" y="170" textAnchor="middle" fill="rgba(255, 255, 255, 0.9)" fontSize="16" fontWeight="bold">
          25%
        </text>
        <text x="330" y="150" textAnchor="middle" fill="rgba(255, 255, 255, 0.9)" fontSize="16" fontWeight="bold">
          35%
        </text>
        <text x="460" y="130" textAnchor="middle" fill="rgba(255, 255, 255, 0.9)" fontSize="16" fontWeight="bold">
          30%
        </text>
        <text x="590" y="160" textAnchor="middle" fill="rgba(255, 255, 255, 0.9)" fontSize="16" fontWeight="bold">
          10%
        </text>

        {/* Title */}
        <text x="400" y="350" textAnchor="middle" fill="rgba(168, 85, 247, 0.9)" fontSize="32" fontWeight="bold">
          תמהיל אופטימלי מותאם
        </text>
        <text x="400" y="380" textAnchor="middle" fill="rgba(75, 85, 99, 0.8)" fontSize="18">
          התאמה מושלמת לצרכים שלכם
        </text>
      </svg>
    </div>
  );
}
