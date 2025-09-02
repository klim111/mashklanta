'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, HelpCircle, Lock } from 'lucide-react';
import { useWizardStore } from '@/src/store/useWizardStore';
import { MiniCalc } from './MiniCalc';
import { DNAProfile } from './DNAProfile';
import { BankQuotesTable } from './BankQuotesTable';
import { BankMixer } from './BankMixer';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

const equityFields = [
  { id: 'cash', label: 'מזומן זמין', suffix: '₪', defaultValue: 300000 },
  { id: 'family', label: 'מתנות/הלוואות משפחה', suffix: '₪', defaultValue: 100000 },
  { id: 'buffer', label: 'כרית ביטחון נדרשת', suffix: '₪', defaultValue: 50000 },
];

const affordFields = [
  { id: 'netIncome', label: 'הכנסה נטו (סה״כ)', suffix: '₪', defaultValue: 25000 },
  { id: 'existingLoans', label: 'הלוואות קיימות', suffix: '₪', defaultValue: 2000 },
  { id: 'targetPercent', label: 'אחוז יעד מההכנסה', type: 'slider' as const, min: 20, max: 35, defaultValue: 25 },
];

const calculateEquity = (values: Record<string, number>) => {
  return Math.max(0, values.cash + values.family - values.buffer);
};

const calculateAfford = (values: Record<string, number>) => {
  return Math.max(0, (values.netIncome * values.targetPercent / 100) - values.existingLoans);
};

export function StageCards() {
  const { guidedMode, currentStage, setStage, markDone } = useWizardStore();
  const [expandedStage, setExpandedStage] = useState<string | null>('discovery');

  const handleStageAction = (stageId: string) => {
    setStage(stageId as 'discovery' | 'design' | 'market');
    markDone(stageId);
    setExpandedStage(stageId);
  };

  const stages = [
    {
      id: 'discovery',
      title: 'הכרת הלקוח',
      description: 'הגדרת מטרות, הון עצמי ויכולת החזר חודשית',
      cta: 'התחל אפיון',
      whyImportant: 'הבנת המצב הפיננסי שלך היא הבסיס לתכנון משכנתא מותאמת שתעמוד ביכולות שלך לאורך זמן',
      content: (
        <div className="space-y-4">
          <MiniCalc
            title="הון עצמי (דמה)"
            fields={equityFields}
            calculateResult={calculateEquity}
            resultLabel="הון נטו זמין"
          />
          <MiniCalc
            title="יכולת החזר (דמה)"
            fields={affordFields}
            calculateResult={calculateAfford}
            resultLabel="החזר חודשי יעד"
          />
        </div>
      ),
    },
    {
      id: 'design',
      title: 'בניית תמהיל',
      description: 'התאמת מסלולי משכנתא לפרופיל האישי שלך',
      cta: 'בנה תמהיל',
      whyImportant: 'תמהיל משכנתא נכון מאזן בין יציבות, גמישות ועלות כוללת בהתאם למאפיינים האישיים שלך',
      content: (
        <div className="space-y-4">
          <DNAProfile />
          <Card className="bg-secondary/30">
            <CardHeader>
              <CardTitle className="text-lg">תמהיל מומלץ (דמה)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>30% פריים (-0.75)</span>
                  <span className="font-medium">₪ 450,000</span>
                </div>
                <div className="flex justify-between">
                  <span>25% קל״צ</span>
                  <span className="font-medium">₪ 375,000</span>
                </div>
                <div className="flex justify-between">
                  <span>25% קבועה צמודה</span>
                  <span className="font-medium">₪ 375,000</span>
                </div>
                <div className="flex justify-between">
                  <span>20% משתנה 5 שנים</span>
                  <span className="font-medium">₪ 300,000</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: 'market',
      title: 'מו״מ מול הבנקים',
      description: 'השוואת הצעות ובחירת הבנק הטוב ביותר לכל מסלול',
      cta: 'השווה הצעות',
      whyImportant: 'השוואה נכונה בין הבנקים יכולה לחסוך עשרות אלפי שקלים לאורך חיי המשכנתא',
      content: (
        <div className="space-y-4">
          <BankQuotesTable />
          <BankMixer />
        </div>
      ),
    },
  ];

  const isStageAccessible = (stageId: string) => {
    if (!guidedMode) return true;
    const stageIndex = stages.findIndex(s => s.id === stageId);
    const currentIndex = stages.findIndex(s => s.id === currentStage);
    return stageIndex <= currentIndex;
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {stages.map((stage) => {
          const isAccessible = isStageAccessible(stage.id);
          const isExpanded = expandedStage === stage.id;

          return (
            <motion.div
              key={stage.id}
              id={stage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={!isAccessible ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {stage.title}
                        {!isAccessible && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {stage.description}
                      </CardDescription>
                    </div>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="text-sm">{stage.whyImportant}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {!isAccessible ? (
                    <div className="text-center py-8">
                      <Badge variant="secondary" className="mb-4">
                        שלב זה ייפתח בהמשך
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        השלם את השלבים הקודמים כדי להמשיך
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <Button
                          onClick={() => handleStageAction(stage.id)}
                          className="gap-2"
                        >
                          {stage.cta}
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Accordion
                        type="single"
                        collapsible
                        value={isExpanded ? stage.id : ''}
                        onValueChange={(value) => setExpandedStage(value)}
                      >
                        <AccordionItem value={stage.id} className="border-none">
                          <AccordionTrigger className="hover:no-underline py-2">
                            <span className="text-sm text-muted-foreground">
                              {isExpanded ? 'הסתר פרטים' : 'הצג פרטים'}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              {stage.content}
                            </motion.div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}