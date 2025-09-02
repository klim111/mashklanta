'use client';

import { TopNav } from './TopNav';
import { Stepper } from './Stepper';
import { CostRail } from './CostRail';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';
import { useState } from 'react';

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Stepper />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 max-w-[1100px] mx-auto">
            <div className="space-y-6">
              {children}
            </div>
            
            {/* Desktop CostRail */}
            <aside className="hidden lg:block">
              <CostRail />
            </aside>
          </div>
        </div>
      </main>
      
      {/* Mobile CostRail Sheet */}
      <div className="lg:hidden fixed bottom-4 left-4 z-50">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg gap-2">
              <Calculator className="h-5 w-5" />
              עלויות
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[60vh]">
            <div className="pt-4">
              <CostRail />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}