'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { useWizardStore } from '@/src/store/useWizardStore';
import { cn } from '@/lib/utils';

const stages = [
  { id: 'discovery', label: 'הכרת הלקוח', icon: '1' },
  { id: 'design', label: 'בניית תמהיל', icon: '2' },
  { id: 'market', label: 'מו״מ מול הבנקים', icon: '3' },
] as const;

export function Stepper() {
  const { currentStage, progress } = useWizardStore();

  return (
    <nav role="navigation" aria-label="תהליך האשף" className="w-full">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {stages.map((stage, index) => {
          const isActive = currentStage === stage.id;
          const isCompleted = progress[stage.id];
          
          return (
            <div
              key={stage.id}
              className="flex flex-1 items-center"
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isCompleted && !isActive && "border-primary bg-primary/10 text-primary",
                    !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{stage.icon}</span>
                  )}
                </div>
                
                <div className="text-center">
                  <p className={cn(
                    "text-sm font-medium",
                    isActive && "text-foreground",
                    !isActive && "text-muted-foreground"
                  )}>
                    {stage.label}
                  </p>
                  {isActive && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      פעיל
                    </Badge>
                  )}
                </div>
              </div>
              
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-4 transition-colors",
                    progress[stages[index + 1].id] || isCompleted
                      ? "bg-primary"
                      : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}