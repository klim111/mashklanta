'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Loan } from './types';
import { buildAmortSchedule } from './loanMath';
import { formatILS } from '@/lib/currency';

interface AmortChartProps {
  loan: Loan;
  height?: number;
  showLegend?: boolean;
  colors?: {
    balance: string;
    principal: string;
    interest: string;
  };
}

export function AmortChart({ 
  loan, 
  height = 300, 
  showLegend = true,
  colors = {
    balance: '#3b82f6',
    principal: '#10b981',
    interest: '#ef4444'
  }
}: AmortChartProps) {
  const schedule = buildAmortSchedule({
    principal: loan.principal,
    apr: loan.apr,
    months: loan.months,
  });

  // הכנת נתונים לגרף
  const chartData = schedule.rows.map(row => ({
    month: row.m,
    'יתרה': Math.round(row.balEnd),
    'קרן': Math.round(row.principal),
    'ריבית': Math.round(row.interest),
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            label={{ value: 'חודש', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
            label={{ value: 'סכום (₪)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [formatILS(value), name]}
            labelFormatter={(month) => `חודש ${month}`}
            labelStyle={{ direction: 'rtl' }}
          />
          {showLegend && <Legend />}
          <Line 
            type="monotone" 
            dataKey="יתרה" 
            stroke={colors.balance} 
            strokeWidth={2}
            dot={false}
          />
          <Line 
            type="monotone" 
            dataKey="קרן" 
            stroke={colors.principal} 
            strokeWidth={2}
            dot={false}
          />
          <Line 
            type="monotone" 
            dataKey="ריבית" 
            stroke={colors.interest} 
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}