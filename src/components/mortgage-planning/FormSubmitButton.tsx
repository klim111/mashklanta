'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { FormFieldError } from '@/lib/mortgage-planning-validation';

interface FormSubmitButtonProps {
  label: string;
  errors: FormFieldError[];
  onValidClick: () => void;
  onInvalidAttempt?: () => void;
  className?: string;
}

export function FormSubmitButton({
  label,
  errors,
  onValidClick,
  onInvalidAttempt,
  className,
}: FormSubmitButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isValid = errors.length === 0;

  const handleClick = () => {
    if (isValid) {
      setShowTooltip(false);
      onValidClick();
      return;
    }
    setShowTooltip(true);
    onInvalidAttempt?.();
  };

  return (
    <TooltipProvider>
      <Tooltip open={showTooltip && !isValid} onOpenChange={setShowTooltip}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={handleClick}
            className={cn(className, !isValid && 'opacity-95')}
          >
            {label}
          </Button>
        </TooltipTrigger>
        {!isValid && (
          <TooltipContent side="top" className="max-w-xs text-right p-3">
            <p className="font-semibold mb-1">יש להשלים את השדות הבאים:</p>
            <ul className="list-disc list-inside space-y-0.5 text-sm">
              {errors.map((error) => (
                <li key={error.field}>{error.message}</li>
              ))}
            </ul>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
