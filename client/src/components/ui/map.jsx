 import { Accordion,AccordionItem,AccordionContent,AccordionTrigger } from '@/components/ui/accordion';
 import { Card, CardContent } from "@/components/ui/card";
 import { FileText,ShieldCheck,Home,BadgeDollarSign,CheckCircle } from "lucide-react";




export default function statistic() {
  return (
<div className="max-w-4xl mx-auto px-4 py-10" dir="rtl">
  <h1 className="text-3xl font-bold mb-8 text-center">🏡 מסע המשכנתא שלך</h1>

  <Accordion type="multiple" className="space-y-4">
    {/* שלב 1 */}
    <AccordionItem value="step1">
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          שלב 1: בקשת אישור עקרוני
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <Card>
          <CardContent className="pt-4 space-y-2 text-right">
            <p>הגשת מסמכים בסיסיים לבדיקה ראשונית:</p>
            <ul className="list-disc pr-5 text-right">
              <li>תעודת זהות / דרכון</li>
              <li>תלושי שכר אחרונים (3 חודשים)</li>
              <li>דפי חשבון בנק</li>
              <li>הצהרת נכסים (אם יש)</li>
            </ul>
            <p className="text-muted-foreground text-sm">
              שלב זה עוזר להבין כמה ניתן לקבל ובאילו תנאים.
            </p>
          </CardContent>
        </Card>
      </AccordionContent>
    </AccordionItem>

    {/* שלב 2 */}
    <AccordionItem value="step2">
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          שלב 2: בדיקות סיכון ואישור בנקאי
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <Card>
          <CardContent className="pt-4 space-y-2 text-right">
            <p>הבנק יבדוק את הפרופיל הפיננסי שלך:</p>
            <ul className="list-disc pr-5 text-right">
              <li>ציון אשראי והיסטוריה</li>
              <li>אימות מקום עבודה</li>
              <li>בדיקת התחייבויות חודשיות</li>
            </ul>
          </CardContent>
        </Card>
      </AccordionContent>
    </AccordionItem>

    {/* שלב 3 */}
    <AccordionItem value="step3">
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-blue-600" />
          שלב 3: בדיקת הנכס
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <Card>
          <CardContent className="pt-4 space-y-2 text-right">
            <p>הטיפול כולל:</p>
            <ul className="list-disc pr-5 text-right">
              <li>הערכת שווי הנכס</li>
              <li>בדיקת בעלות משפטית</li>
              <li>אימות תנאי סיכון</li>
            </ul>
            <p className="text-muted-foreground text-sm">
              הבנק צריך לוודא שהנכס מהווה בטוחה ראויה.
            </p>
          </CardContent>
        </Card>
      </AccordionContent>
    </AccordionItem>

    {/* שלב 4 */}
    <AccordionItem value="step4">
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <BadgeDollarSign className="w-5 h-5 text-yellow-600" />
          שלב 4: הצעת משכנתא וחתימה
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <Card>
          <CardContent className="pt-4 space-y-2 text-right">
            <p>קבלת ההצעה וחתימת ההסכם:</p>
            <ul className="list-disc pr-5 text-right">
              <li>בחירה בריבית קבועה / משתנה</li>
              <li>סקירת לוח תשלומים</li>
              <li>חתימה על הסכם המשכנתא</li>
            </ul>
          </CardContent>
        </Card>
      </AccordionContent>
    </AccordionItem>

    {/* שלב 5 */}
    <AccordionItem value="step5">
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          שלב 5: העברת כספים ורישום
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <Card>
          <CardContent className="pt-4 space-y-2 text-right">
            <p>מזל טוב! כעת הבנק יבצע:</p>
            <ul className="list-disc pr-5 text-right">
              <li>העברת כספים למוכר</li>
              <li>רישום משכנתא בטאבו</li>
              <li>שליחת הוראות תשלום</li>
            </ul>
            <p className="text-muted-foreground text-sm">
              אתה עכשיו באופן רשמי בעל נכס 🎉
            </p>
          </CardContent>
        </Card>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</div>)}