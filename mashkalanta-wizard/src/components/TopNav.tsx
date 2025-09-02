'use client';

import { Button } from '@/components/ui/button';
import { useWizardStore } from '@/src/store/useWizardStore';
import { RotateCcw } from 'lucide-react';

export function TopNav() {
  const reset = useWizardStore((state) => state.reset);

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-primary">משכלנתא</h1>
            <span className="text-sm text-muted-foreground">מצב שמור מקומית</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            אפס אשף
          </Button>
        </div>
      </div>
    </nav>
  );
}