import { AuthorizationLettersModule } from '@/components/plan/authorization/AuthorizationLettersModule';

export const metadata = {
  title: 'כתבי הסמכה ליועץ',
};

export default async function AuthorizationLettersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AuthorizationLettersModule planId={id} />;
}
