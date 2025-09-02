'use client';

import { LayoutShell } from '@/src/components/LayoutShell';
import { StageCards } from '@/src/components/StageCards';
import { Guard } from '@/src/components/Guard';
import { PDFButton } from '@/src/components/PDFButton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWizardStore } from '@/src/store/useWizardStore';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  const { guidedMode, toggleGuided, progress } = useWizardStore();

  // Check which steps are missing (for Guard component demo)
  const missingSteps = [];
  if (!progress.discovery) {
    missingSteps.push({ id: 'discovery', label: 'הכרת הלקוח', targetId: 'discovery' });
  }
  if (!progress.design) {
    missingSteps.push({ id: 'design', label: 'בניית תמהיל', targetId: 'design' });
  }

  const allStepsComplete = progress.discovery && progress.design && progress.market;

  return (
    <LayoutShell>
      {/* Mode Toggle */}
      <div className="flex items-center justify-between mb-6 p-4 bg-secondary/30 rounded-lg">
        <div className="flex items-center gap-4">
          <Label htmlFor="mode-toggle" className="text-base font-medium">
            מצב עבודה:
          </Label>
          <div className="flex items-center gap-2">
            <Badge variant={guidedMode ? 'default' : 'outline'}>
              מודרך
            </Badge>
            <Switch
              id="mode-toggle"
              checked={!guidedMode}
              onCheckedChange={toggleGuided}
            />
            <Badge variant={!guidedMode ? 'default' : 'outline'}>
              מקצועי
            </Badge>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {guidedMode ? 
            'במצב מודרך, השלבים נפתחים בהדרגה' : 
            'במצב מקצועי, כל השלבים זמינים מיד'
          }
        </div>
      </div>

      {/* Guard Component (shows when steps are missing) */}
      {missingSteps.length > 0 && progress.market && (
        <Guard missingSteps={missingSteps} />
      )}

      {/* Main Stage Cards */}
      <StageCards />

      {/* PDF Download Button */}
      <div className="mt-8 flex justify-center">
        <PDFButton disabled={!allStepsComplete} />
      </div>

      <Separator className="my-12" />

      {/* Footer */}
      <footer className="text-center space-y-2 pb-8">
        <p className="text-sm text-muted-foreground">
          כל המספרים המוצגים הם הערכות בלבד ואינם מהווים ייעוץ פיננסי
        </p>
        <p className="text-xs text-muted-foreground">
          מומלץ להיוועץ עם יועץ משכנתאות מוסמך לפני קבלת החלטות
        </p>
        <div className="pt-4">
          <Badge variant="outline" className="text-xs">
            גרסת דמו - ללא חישובים אמיתיים
          </Badge>
        </div>
      </footer>
    </LayoutShell>
  );
}