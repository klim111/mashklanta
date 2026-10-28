import { PlanWorkspace } from '@/components/plan/PlanWorkspace';

export const metadata = {
  title: 'תכנון המשכנתא שלי',
};

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlanWorkspace planId={id} />;
}
