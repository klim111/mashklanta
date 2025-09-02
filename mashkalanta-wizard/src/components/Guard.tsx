'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface GuardProps {
  missingSteps: Array<{
    id: string;
    label: string;
    targetId: string;
  }>;
}

export function Guard({ missingSteps }: GuardProps) {
  if (missingSteps.length === 0) return null;

  const handleScrollTo = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <Alert variant="default" className="border-orange-200 bg-orange-50/50">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-900">שלבים חסרים</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-orange-800 mb-3">
          כדי להמשיך, יש להשלים את השלבים הבאים:
        </p>
        <div className="flex flex-wrap gap-2">
          {missingSteps.map((step) => (
            <Button
              key={step.id}
              variant="outline"
              size="sm"
              onClick={() => handleScrollTo(step.targetId)}
              className="text-orange-700 border-orange-300 hover:bg-orange-100"
            >
              {step.label} ←
            </Button>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}