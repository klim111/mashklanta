'use client';

import { motion } from 'framer-motion';
import { DollarSign, Hash } from 'lucide-react';

interface Question {
  id: string;
  title: string;
  description: string;
  type: 'number' | 'currency' | 'text' | 'select';
  placeholder: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  utilityInfo: {
    benefit: string;
    impact: string;
    costImpact: number;
  };
}

interface SingleQuestionScreenProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
}

export function SingleQuestionScreen({ question, value, onChange }: SingleQuestionScreenProps) {
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    return new Intl.NumberFormat('he-IL').format(Number(numericValue));
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    onChange(Number(rawValue));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = Number(e.target.value);
    if (question.min !== undefined && numValue < question.min) return;
    if (question.max !== undefined && numValue > question.max) return;
    onChange(numValue);
  };

  const renderInput = () => {
    switch (question.type) {
      case 'currency':
        return (
          <div className="relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <motion.input
              type="text"
              value={value ? formatCurrency(value.toString()) : ''}
              onChange={handleCurrencyChange}
              placeholder={question.placeholder}
              className="w-full pr-12 pl-6 py-4 text-xl bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              whileFocus={{ scale: 1.01 }}
              dir="rtl"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              ₪
            </div>
          </div>
        );

      case 'number':
        return (
          <div className="relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Hash className="w-5 h-5" />
            </div>
            <motion.input
              type="number"
              value={value || ''}
              onChange={handleNumberChange}
              placeholder={question.placeholder}
              min={question.min}
              max={question.max}
              className="w-full pr-12 pl-6 py-4 text-xl bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              whileFocus={{ scale: 1.01 }}
              dir="rtl"
            />
          </div>
        );

      case 'select':
        return (
          <motion.select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-6 py-4 text-xl bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            whileFocus={{ scale: 1.01 }}
            dir="rtl"
          >
            <option value="">{question.placeholder}</option>
            {question.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </motion.select>
        );

      default:
        return (
          <motion.input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className="w-full px-6 py-4 text-xl bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            whileFocus={{ scale: 1.01 }}
            dir="rtl"
          />
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Question Header */}
      <div className="space-y-3">
        <motion.h2
          className="text-3xl font-semibold text-slate-800 leading-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {question.title}
        </motion.h2>
      </div>

      {/* Input Field */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {renderInput()}
      </motion.div>

      {/* Input Hints */}
      {(question.min !== undefined || question.max !== undefined) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex justify-between text-sm text-slate-500"
        >
          {question.min !== undefined && (
            <span>מינימום: {question.min.toLocaleString()}</span>
          )}
          {question.max !== undefined && (
            <span>מקסימום: {question.max.toLocaleString()}</span>
          )}
        </motion.div>
      )}

      {/* Value Display */}
      {value && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-100"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">הערך שהזנתם:</span>
            <span className="text-lg font-semibold text-slate-800">
              {question.type === 'currency' 
                ? `${Number(value).toLocaleString()} ₪`
                : value.toString()
              }
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}