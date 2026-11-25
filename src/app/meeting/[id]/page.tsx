import { MeetingCallScreen } from '@/components/meeting-call/MeetingCallScreen';

export const metadata = {
  title: 'פגישת וידאו',
};

export default async function MeetingCallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingCallScreen meetingId={id} />;
}
