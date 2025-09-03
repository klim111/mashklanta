'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle, FileText, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StageCardProps {
  card: {
    id: string;
    title: string;
    description: string;
    cta: string;
    requirements: string[];
    completed: boolean;
  };
  onAction: () => void;
  delay?: number;
}

export function StageCard({ card, onAction, delay = 0 }: StageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className="group"
    >
      <Card className={`
        relative overflow-hidden transition-all duration-200 cursor-pointer
        ${card.completed 
          ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
          : 'bg-white border-slate-200 hover:shadow-md'
        }
      `}>
        {/* Completion Badge */}
        {card.completed && (
          <div className="absolute top-2 left-2 z-10">
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        <div className="p-4">
          {/* Header */}
          <div className="mb-3">
            <h4 className={`
              font-semibold text-sm mb-1
              ${card.completed ? 'text-emerald-800' : 'text-slate-800'}
            `}>
              {card.title}
            </h4>
            <p className={`
              text-xs leading-relaxed
              ${card.completed ? 'text-emerald-700' : 'text-slate-600'}
            `}>
              {card.description}
            </p>
          </div>

          {/* Requirements Preview */}
          {card.requirements.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <FileText className="w-3 h-3" />
                <span>מה צריך להביא:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {card.requirements.slice(0, 2).map((req, index) => (
                  <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
                    {req}
                  </Badge>
                ))}
                {card.requirements.length > 2 && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    +{card.requirements.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex items-center justify-between">
            <Button
              onClick={onAction}
              size="sm"
              variant={card.completed ? "outline" : "default"}
              className={`
                text-xs h-7 px-3
                ${card.completed 
                  ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
              `}
            >
              {card.completed ? 'עריכה' : card.cta}
            </Button>

            {/* Expand Button */}
            {card.requirements.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-3 h-3" />
                </motion.div>
              </Button>
            )}
          </div>

          {/* Expanded Requirements */}
          <AnimatePresence>
            {isExpanded && card.requirements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-3 pt-3 border-t border-slate-200"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <AlertCircle className="w-3 h-3 text-blue-500" />
                    מסמכים נדרשים:
                  </div>
                  <ul className="space-y-1">
                    {card.requirements.map((req, index) => (
                      <li key={index} className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-1 h-1 bg-slate-400 rounded-full" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hover Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-emerald-500/0 group-hover:from-blue-500/5 group-hover:to-emerald-500/5 transition-all duration-200 pointer-events-none" />
      </Card>
    </motion.div>
  );
}