'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CarouselLayout,
  ConnectionStateToast,
  DisconnectButton,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  ParticipantTile,
  RoomAudioRenderer,
  StartAudio,
  TrackToggle,
  useCreateLayoutContext,
  useDataChannel,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';
import { RoomEvent, Track } from 'livekit-client';
import { FolderOpen, MessageSquare, PhoneOff, X } from 'lucide-react';
import { formatTime } from '@/lib/advisor-crm';
import { ChatPane } from '@/components/conversation/ChatPane';
import { CallDocumentsPanel } from './CallDocumentsPanel';
import { PresentedDocumentView } from './PresentedDocumentView';
import type { CallSignal, MeetingCallDetails, PresentedDocument } from './types';

const SIGNAL_TOPIC = 'mk-call';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type Panel = 'chat' | 'documents' | null;

/** השיחה עצמה, בתוך החדר: התמונות, הצ'אט, תיק המסמכים וסרגל הכפתורים */
export function CallStage({
  details,
  deviceIssue,
  onDismissDeviceIssue,
}: {
  details: MeetingCallDetails;
  deviceIssue: string | null;
  onDismissDeviceIssue: () => void;
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const layoutContext = useCreateLayoutContext();
  const [panel, setPanel] = useState<Panel>(null);
  const [chatSignal, setChatSignal] = useState(0);
  const [docsSignal, setDocsSignal] = useState(0);
  /** הודעות שהגיעו כשהצ'אט סגור */
  const [unread, setUnread] = useState(0);
  const [presented, setPresented] = useState<PresentedDocument | null>(null);
  /** המסמך שאני מציג — כדי לשלוח אותו גם למי שמצטרף אחרי שההצגה התחילה */
  const mine = useRef<PresentedDocument | null>(null);
  const myName = details.role === 'ADVISOR' ? details.advisorName : details.clientName;
  const otherName = details.role === 'ADVISOR' ? details.clientName : details.advisorName;
  const canShareScreen = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia);

  /*
    הטיפול בהודעה מתחלף בכל רינדור, אבל הפונקציה שנמסרת לערוץ נשארת אותה
    פונקציה: ערוץ שנוצר מחדש בכל רינדור מאבד את ה-send שלו, והודעות כמו
    "הפסקת הצגה" לא היו יוצאות.
  */
  const handleSignal = useRef<(signal: CallSignal) => void>(() => undefined);
  const onData = useCallback((message: { payload: Uint8Array }) => {
    try {
      handleSignal.current(JSON.parse(decoder.decode(message.payload)) as CallSignal);
    } catch {
      // הודעה שאינה שלנו
    }
  }, []);
  const { send } = useDataChannel(SIGNAL_TOPIC, onData);

  handleSignal.current = (signal) => {
    if (signal.t === 'chat') {
      setChatSignal((value) => value + 1);
      setUnread((value) => value + 1);
    } else if (signal.t === 'docs') {
      setDocsSignal((value) => value + 1);
    } else if (signal.t === 'present') {
      mine.current = null;
      setPresented(signal.doc);
    } else if (signal.t === 'stop') {
      setPresented(null);
    } else if (signal.t === 'hello' && mine.current) {
      void broadcast({ t: 'present', doc: mine.current });
    }
  };

  const broadcast = useCallback(
    async (signal: CallSignal) => {
      try {
        await send(encoder.encode(JSON.stringify(signal)), { reliable: true });
      } catch (error) {
        console.warn('[meeting-call] signal not sent', error);
      }
    },
    [send]
  );

  // מי שנכנס מבקש מהצד השני את המסמך שמוצג עכשיו, אם יש
  useEffect(() => {
    const onJoined = () => void broadcast({ t: 'hello' });
    if (room.state === 'connected') onJoined();
    room.on(RoomEvent.Connected, onJoined);
    return () => {
      room.off(RoomEvent.Connected, onJoined);
    };
  }, [room, broadcast]);

  useEffect(() => {
    if (panel === 'chat') setUnread(0);
  }, [panel, chatSignal]);

  const present = (doc: Omit<PresentedDocument, 'by'>) => {
    const next = { ...doc, by: myName };
    mine.current = next;
    setPresented(next);
    void broadcast({ t: 'present', doc: next });
  };

  const stopPresenting = () => {
    mine.current = null;
    setPresented(null);
    void broadcast({ t: 'stop' });
  };

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false }
  );
  const screenShare = tracks.find((track) => track.source === Track.Source.ScreenShare && track.publication);
  const cameras = tracks.filter((track) => track.source === Track.Source.Camera);
  const alone = participants.length < 2;

  const togglePanel = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));
  const panelOpen = panel !== null;

  const stage = (() => {
    if (presented && details.planId) {
      return (
        <div className="lk-focus-layout-wrapper">
          <FocusLayoutContainer>
            <CarouselLayout tracks={[...(screenShare ? [screenShare] : []), ...cameras]}>
              <ParticipantTile />
            </CarouselLayout>
            <PresentedDocumentView
              planId={details.planId}
              doc={presented}
              mine={mine.current?.id === presented.id}
              onStop={stopPresenting}
              onHide={() => setPresented(null)}
            />
          </FocusLayoutContainer>
        </div>
      );
    }
    if (screenShare) {
      return (
        <div className="lk-focus-layout-wrapper">
          <FocusLayoutContainer>
            <CarouselLayout tracks={cameras}>
              <ParticipantTile />
            </CarouselLayout>
            <FocusLayout trackRef={screenShare} />
          </FocusLayoutContainer>
        </div>
      );
    }
    return (
      <div className="lk-grid-layout-wrapper">
        <GridLayout tracks={cameras}>
          <ParticipantTile />
        </GridLayout>
      </div>
    );
  })();

  return (
    <LayoutContextProvider value={layoutContext}>
      <div dir="rtl" className="flex h-[100dvh] flex-col bg-slate-950 text-white">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{details.title}</p>
            <p className="text-xs text-white/60">
              {alone ? `ממתינים ל${otherName} שיצטרף…` : `בשיחה עם ${otherName}`} · נקבעה ל-{formatTime(details.startsAt)}
            </p>
          </div>
          <StartAudio label="להפעלת השמע לחצו כאן" className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-black" />
        </header>

        {deviceIssue && (
          <div className="flex items-center justify-between gap-2 bg-amber-500/20 px-4 py-2 text-sm font-bold text-amber-100">
            <span>{deviceIssue}</span>
            <button type="button" aria-label="סגירה" onClick={onDismissDeviceIssue} className="rounded p-1 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="relative flex min-h-0 flex-1">
          {/* רכיבי LiveKit בנויים לכיוון שמאל-לימין */}
          <div dir="ltr" className={`lk-video-conference-inner min-w-0 flex-1 ${panelOpen ? 'hidden md:flex' : ''}`}>
            {stage}
          </div>

          {panelOpen && (
            <aside className="flex w-full min-w-0 flex-col text-right border-white/10 bg-white text-slate-900 md:w-[380px] md:border-r">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <div className="flex gap-1">
                  <PanelTab active={panel === 'chat'} onClick={() => setPanel('chat')}>
                    צ׳אט
                  </PanelTab>
                  <PanelTab active={panel === 'documents'} onClick={() => setPanel('documents')}>
                    תיק המסמכים
                  </PanelTab>
                </div>
                <button
                  type="button"
                  aria-label="סגירת החלונית"
                  onClick={() => setPanel(null)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* שני הלוחות נשארים טעונים, כדי שהמעבר ביניהם לא יאבד טיוטה */}
              <div className={`min-h-0 flex-1 flex-col ${panel === 'chat' ? 'flex' : 'hidden'}`}>
                <ChatPane
                  role={details.role}
                  clientUserId={details.role === 'ADVISOR' ? details.clientUserId : null}
                  inCall
                  refreshSignal={chatSignal}
                  onSent={() => void broadcast({ t: 'chat' })}
                />
              </div>
              <div className={`min-h-0 flex-1 flex-col ${panel === 'documents' ? 'flex' : 'hidden'}`}>
                <CallDocumentsPanel
                  details={details}
                  refreshSignal={docsSignal}
                  presentingId={presented?.id ?? null}
                  onPresent={present}
                  onChanged={() => void broadcast({ t: 'docs' })}
                  onSentToChat={() => {
                    setChatSignal((value) => value + 1);
                    void broadcast({ t: 'chat' });
                  }}
                />
              </div>
            </aside>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 px-3 py-3">
          <TrackToggle source={Track.Source.Microphone} className="call-control">
            מיקרופון
          </TrackToggle>
          <TrackToggle source={Track.Source.Camera} className="call-control">
            מצלמה
          </TrackToggle>
          {canShareScreen && (
            <TrackToggle
              source={Track.Source.ScreenShare}
              captureOptions={{ audio: false, selfBrowserSurface: 'exclude' }}
              className="call-control"
            >
              {localParticipant.isScreenShareEnabled ? 'הפסקת שיתוף' : 'שיתוף מסך'}
            </TrackToggle>
          )}
          <ControlButton active={panel === 'chat'} onClick={() => togglePanel('chat')}>
            <MessageSquare className="h-4 w-4" />
            צ׳אט
            {unread > 0 && panel !== 'chat' && (
              <span className="rounded-full bg-rose-500 px-1.5 text-2xs font-black text-white">{unread}</span>
            )}
          </ControlButton>
          <ControlButton active={panel === 'documents'} onClick={() => togglePanel('documents')}>
            <FolderOpen className="h-4 w-4" />
            תיק המסמכים
          </ControlButton>
          <DisconnectButton className="call-control call-control-leave">
            <PhoneOff className="h-4 w-4" />
            יציאה
          </DisconnectButton>
        </footer>

        <RoomAudioRenderer />
        <ConnectionStateToast />
      </div>
    </LayoutContextProvider>
  );
}

function PanelTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-black transition-colors ${
        active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function ControlButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className="call-control">
      {children}
    </button>
  );
}
