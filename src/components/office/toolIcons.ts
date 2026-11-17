import { BookOpen, Calculator, Layers, LineChart, PiggyBank, RefreshCw, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ToolModuleId } from '@/lib/office';

/** הסמל של כל כלי — אותו סמל בדף המשרד, בהגדרות המשרד ובכרטיס הלקוח */
export const TOOL_ICONS: Record<ToolModuleId, LucideIcon> = {
  feasibility: Calculator,
  equity: PiggyBank,
  'cash-flow': LineChart,
  'consumer-loans': Wallet,
  refinance: RefreshCw,
  'mix-planner': Layers,
  learn: BookOpen,
};
