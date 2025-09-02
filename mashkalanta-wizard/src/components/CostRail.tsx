'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Info } from 'lucide-react';

const upcomingCosts = [
  { label: 'שמאות', amount: '₪ 500' },
  { label: 'פתיחת תיק', amount: '₪ 750' },
  { label: 'נוטריון', amount: '₪ 2,500' },
];

export function CostRail() {
  return (
    <Card className="sticky top-24 h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">עלות משוערת עד כה</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-2xl font-bold text-primary">₪ 0</div>
        
        <Separator />
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">צפוי בהמשך:</p>
          <ul className="space-y-1">
            {upcomingCosts.map((cost) => (
              <li key={cost.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{cost.label}</span>
                <span className="font-medium">{cost.amount}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="link" size="sm" className="p-0 h-auto gap-1">
              <Info className="h-3 w-3" />
              למד עוד על עלויות
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>עלויות בתהליך המשכנתא</DialogTitle>
              <DialogDescription className="text-right pt-4 space-y-3">
                <p>
                  תהליך לקיחת משכנתא כרוך בעלויות שונות שחשוב להכיר מראש:
                </p>
                <ul className="list-disc list-inside space-y-2 pr-4">
                  <li>שמאות - הערכת שווי הנכס לצורך המשכנתא</li>
                  <li>פתיחת תיק בנק - עמלה חד פעמית לפתיחת תיק משכנתא</li>
                  <li>עורך דין/נוטריון - ליווי משפטי ורישום המשכנתא</li>
                  <li>ביטוח נכס וביטוח חיים - דרישות הבנק להגנה על ההלוואה</li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  * הסכומים המוצגים הם הערכות בלבד ועשויים להשתנות
                </p>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}