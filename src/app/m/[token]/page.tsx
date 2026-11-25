import { GuestMeetingScreen } from '@/components/meeting-call/GuestMeetingScreen';

export const metadata = {
  title: 'פגישת וידאו',
  robots: { index: false, follow: false },
};

/** הלינק החד-פעמי של האורח לפגישת וידאו (src/lib/guest-meetings.ts) */
export default async function GuestMeetingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <GuestMeetingScreen token={token} />;
}
