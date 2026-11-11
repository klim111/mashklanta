import { MeetingCallScreen } from '@/components/meeting-call/MeetingCallScreen';

export const metadata = {
  title: 'פגישת וידאו בלינק חד-פעמי',
};

/** צד היועץ של פגישת אורח בלינק חד-פעמי (src/lib/guest-meetings.ts) */
export default async function GuestMeetingAdvisorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingCallScreen meetingId={id} endpoint={`/api/advisor/guest-meetings/${encodeURIComponent(id)}/call`} />;
}
