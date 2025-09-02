'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileDown } from 'lucide-react';

interface PDFButtonProps {
  disabled?: boolean;
}

export function PDFButton({ disabled = true }: PDFButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button
              disabled={disabled}
              size="lg"
              className="gap-2"
              onClick={() => {
                // PDF generation will be implemented later
                console.log('Generate PDF');
              }}
            >
              <FileDown className="h-5 w-5" />
              הורד PDF
            </Button>
          </span>
        </TooltipTrigger>
        {disabled && (
          <TooltipContent>
            <p>זמין לאחר סגירת תמהיל</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}