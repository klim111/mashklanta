'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useWizardStore } from '@/src/store/useWizardStore';

const profileFields = [
  { id: 'stability', label: 'יציבות', description: 'העדפה לתשלום קבוע לאורך זמן' },
  { id: 'flexibility', label: 'גמישות (פירעון מוקדם)', description: 'חשיבות האפשרות לסגור מוקדם' },
  { id: 'priceSensitivity', label: 'רגישות למחיר', description: 'חשיבות העלות הכוללת' },
  { id: 'indexAversion', label: 'רתיעה מהצמדה', description: 'העדפה להימנע מהצמדה למדד' },
] as const;

function getLevel(value: number): string {
  if (value <= 3) return 'נמוכה';
  if (value <= 7) return 'בינונית';
  return 'גבוהה';
}

export function DNAProfile() {
  const { dnaProfile, updateDNAProfile } = useWizardStore();

  const handleSliderChange = (field: keyof typeof dnaProfile, value: number[]) => {
    updateDNAProfile({ [field]: value[0] });
  };

  const getSummary = () => {
    const parts = [];
    if (dnaProfile.stability > 7) parts.push('יציבות גבוהה');
    else if (dnaProfile.stability > 3) parts.push('יציבות בינונית');
    
    if (dnaProfile.flexibility > 7) parts.push('גמישות גבוהה');
    else if (dnaProfile.flexibility > 3) parts.push('גמישות בינונית');
    
    if (dnaProfile.priceSensitivity > 7) parts.push('עלות נמוכה');
    else if (dnaProfile.priceSensitivity <= 3) parts.push('עלות גמישה');
    
    return parts.join(' • ') || 'פרופיל מאוזן';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>פרופיל DNA פיננסי</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {profileFields.map((field) => (
          <div key={field.id} className="space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <Label htmlFor={field.id} className="text-base">
                  {field.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {field.description}
                </p>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {getLevel(dnaProfile[field.id])}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-xs w-4">0</span>
              <Slider
                id={field.id}
                min={0}
                max={10}
                step={1}
                value={[dnaProfile[field.id]]}
                onValueChange={(value) => handleSliderChange(field.id, value)}
                className="flex-1"
              />
              <span className="text-xs w-6">10</span>
              <span className="text-sm font-medium w-6 text-left">
                {dnaProfile[field.id]}
              </span>
            </div>
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">סיכום:</span>
            <Badge variant="secondary" className="text-xs">
              {getSummary()}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}