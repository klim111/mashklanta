import { Accessibility, Mail, Phone } from 'lucide-react';
import NavBar from '@/components/ui/navbar';
import Footer from '@/components/ui/footer';
import { SITE_CONTACT } from '@/lib/site-contact';

/**
 * הצהרת הנגישות, לפי תקנה 35 לתקנות שוויון זכויות לאנשים עם מוגבלות
 * (התאמות נגישות לשירות), התשע"ג-2013.
 *
 * כשמשנים משהו מהותי בנגישות האתר — מעדכנים כאן גם את תאריך העדכון.
 */
const UPDATED_AT = '25 בספטמבר 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-subtitle font-extrabold text-slate-900">{title}</h2>
      <div className="space-y-3 text-info leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pr-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function AccessibilityStatementPage() {
  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur-md">
        <NavBar />
      </div>

      <main id="main" className="mx-auto max-w-3xl px-4 py-10 text-right sm:py-14">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Accessibility className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-title font-extrabold text-slate-900">הצהרת נגישות</h1>
            <p className="text-2xs font-semibold text-slate-500">עודכנה לאחרונה: {UPDATED_AT}</p>
          </div>
        </div>

        <div className="mt-8 space-y-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <Section title="המחויבות שלנו">
            <p>
              משכלנתא מאמינה שכל אדם זכאי לתכנן את המשכנתא שלו בעצמו, בכבוד ובשוויון. אנחנו פועלים
              להנגיש את האתר והפלטפורמה לאנשים עם מוגבלות, בהתאם לחוק שוויון זכויות לאנשים עם
              מוגבלות, התשנ&quot;ח-1998, ולתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות
              לשירות), התשע&quot;ג-2013.
            </p>
          </Section>

          <Section title="רמת הנגישות באתר">
            <p>
              ההתאמות באתר בוצעו לפי המלצות התקן הישראלי ת&quot;י 5568 לנגישות תכנים באינטרנט, ברמה
              AA, המבוסס על הנחיות WCAG 2.0 של ארגון W3C. האתר מותאם לגרסאות העדכניות של הדפדפנים
              Chrome, Edge, Firefox ו-Safari, במחשב, בטאבלט ובטלפון נייד.
            </p>
          </Section>

          <Section title="מה עשינו באתר">
            <List
              items={[
                'האתר כתוב בעברית ומוגדר מימין לשמאל, כך שקוראי מסך מקריאים אותו בשפה ובכיוון הנכונים.',
                'אפשר לנווט בכל האתר במקלדת בלבד, ולכל רכיב שמקבל פוקוס יש מסגרת כחולה בולטת.',
                'בתחילת כל עמוד יש קישור "דילוג לתוכן הראשי" (מופיע בלחיצה על Tab).',
                'הטקסטים משתמשים ביחידות יחסיות, כך שהגדלת הטקסט בדפדפן או בתפריט הנגישות מגדילה אותם.',
                'האתר מכבד את הגדרת "הפחתת תנועה" של מערכת ההפעלה, ואפשר לעצור בו אנימציות ותוכן מתחלף.',
                'העיצוב מותאם למסכים בגדלים שונים ולהגדלת תצוגה.',
              ]}
            />
          </Section>

          <Section title="תפריט הנגישות">
            <p>
              בכל עמוד באתר יש לשונית נגישות כחולה בצד שמאל של המסך, באמצע הגובה. בלחיצה עליה נפתח
              תפריט שבו אפשר:
            </p>
            <List
              items={[
                'להגדיל את הטקסט בשלוש דרגות, ולהחזיר לגודל הרגיל.',
                'להפעיל ניגודיות גבוהה או ניגודיות הפוכה (רקע כהה).',
                'להציג את האתר בגווני אפור.',
                'להדגיש את כל הקישורים.',
                'להחליף לגופן פשוט וקריא.',
                'להגדיל את הריווח בין שורות, אותיות ומילים.',
                'לעצור אנימציות ותוכן שמתחלף מעצמו.',
                'להגדיל את סמן העכבר.',
                'לאפס את כל ההגדרות בלחיצה אחת.',
              ]}
            />
            <p>ההגדרות נשמרות בדפדפן שלכם ונשארות פעילות גם במעבר בין עמודים ובביקור הבא.</p>
          </Section>

          <Section title="מגבלות ידועות">
            <p>
              למרות מאמצינו, ייתכן שחלקים באתר עדיין אינם נגישים במלואם. אנחנו ממשיכים לשפר, ואלה
              המגבלות המוכרות לנו כיום:
            </p>
            <List
              items={[
                'גרפים ותרשימים של תמהילים והחזרים חודשיים הם ויזואליים. הנתונים שבהם מוצגים גם כמספרים בטבלאות ובכרטיסים שלצידם.',
                'מסמכים שמעלים משתמשים ויועצים (תלושים, דפי בנק, אישורים עקרוניים) וטופסי בנקים חיצוניים אינם בשליטתנו ועשויים שלא להיות נגישים.',
                'שירותים של צד שלישי, כמו כניסה עם Google ואתרי הבנקים שאליהם האתר מקשר, כפופים להסדרי הנגישות של אותם גופים.',
                'חלק מהמספרים הקטנים במסכי התכנון לא גדלים יחד עם הגדלת הטקסט. אפשר להגדיל אותם בהגדלת התצוגה של הדפדפן (Ctrl ו-+).',
              ]}
            />
          </Section>

          <Section title="הסדרי נגישות פיזיים">
            <p>
              משכלנתא היא שירות מקוון בלבד ואין לה משרד לקבלת קהל. פגישות עם יועצי משכנתאות
              מתקיימות בשיחת וידאו או בטלפון, ואפשר לבקש התאמה לצורך מסוים (למשל פגישה טלפונית
              במקום וידאו, או זמן ארוך יותר) דרך רכז הנגישות.
            </p>
          </Section>

          <Section title="נתקלתם בבעיה? דברו איתנו">
            <p>
              אם מצאתם באתר תוכן או רכיב שאינו נגיש, או שאתם צריכים את המידע בדרך אחרת, נשמח
              לשמוע ולעזור. כדי שנוכל לטפל מהר, ציינו את העמוד, מה ניסיתם לעשות ובאיזה דפדפן או
              טכנולוגיה מסייעת השתמשתם. אנחנו משתדלים לענות תוך 5 ימי עסקים.
            </p>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="font-bold text-slate-900">רכז הנגישות של משכלנתא: איגור לבדינסקי</p>
              <ul className="mt-2 space-y-2">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <span>טלפון:</span>
                  <a href={SITE_CONTACT.phoneHref} dir="ltr" className="font-bold text-blue-700 underline underline-offset-4">
                    {SITE_CONTACT.phone}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <span>אימייל:</span>
                  <a href={SITE_CONTACT.emailHref} dir="ltr" className="font-bold text-blue-700 underline underline-offset-4">
                    {SITE_CONTACT.email}
                  </a>
                </li>
              </ul>
            </div>
          </Section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
