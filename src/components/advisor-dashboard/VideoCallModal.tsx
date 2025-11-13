'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera,
  Check,
  Copy,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Phone,
  PhoneOff,
  User,
  Video,
  VideoOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createSocketIOSignaling, SignalingMessage, SocketIOSignaling } from '@/lib/socketio-signaling';
import { getWebRTCConfigurationAsync } from '@/lib/webrtc-config';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    name: string;
    email: string;
  };
  advisor: {
    name: string;
    email: string;
  };
}

interface CallState {
  isConnected: boolean;
  isVideoOn: boolean;
  isAudioOn: boolean;
  clientConnected: boolean;
  callDuration: number;
}

type ChatMessage = {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
};

const INITIAL_STATE: CallState = {
  isConnected: false,
  isVideoOn: true,
  isAudioOn: true,
  clientConnected: false,
  callDuration: 0,
};

export default function VideoCallModal({ isOpen, onClose, client, advisor }: VideoCallModalProps) {
  const [callState, setCallState] = useState<CallState>(INITIAL_STATE);
  const [shareLink, setShareLink] = useState('');
  const [signalingReady, setSignalingReady] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const signalingRef = useRef<SocketIOSignaling | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const callId = useMemo(() => {
    if (!isOpen) {
      return null;
    }
    return `call_${crypto.randomUUID()}`;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !callId) {
      return;
    }

    if (typeof window !== 'undefined') {
      setShareLink(`${window.location.origin}/video-call/${callId}`);
    }

    const signaling = createSocketIOSignaling(
      callId,
      `advisor_${advisor.email ?? crypto.randomUUID()}`,
      'advisor',
      handleSignalingMessage,
      (connected) => {
        setSignalingReady(connected);
        if (!connected) {
          setError('Connection to signaling server lost. Trying to reconnect...');
        } else {
          setError(null);
        }
      }
    );

    signaling
      .connect()
      .then(() => {
        signalingRef.current = signaling;
      })
      .catch((err) => {
        console.error('Failed to connect to signaling server', err);
        setError('Unable to connect to signaling server.');
      });

    return () => {
      signaling.disconnect();
      signalingRef.current = null;
      cleanupMedia();
      resetCallState();
    };
  }, [isOpen, callId, advisor.email]);

  useEffect(() => {
    return () => cleanupMedia();
  }, []);

  const resetCallState = () => {
    setCallState(INITIAL_STATE);
    setChatMessages([]);
    setNewMessage('');
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const cleanupMedia = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const handleSignalingMessage = async (message: SignalingMessage) => {
    switch (message.type) {
      case 'user-joined':
        setCallState((prev) => ({ ...prev, clientConnected: true }));
        break;
      case 'user-left':
      case 'call-ended':
        endCall();
        break;
      case 'chat-message':
        setChatMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}`,
            sender: client.name,
            message: message.data.message,
            timestamp: new Date(message.timestamp),
          },
        ]);
        break;
      case 'offer':
        await handleOffer(message.data);
        break;
      case 'answer':
        await handleAnswer(message.data);
        break;
      case 'ice-candidate':
        await handleIceCandidate(message.data);
        break;
    }
  };

  const prepareLocalStream = async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      await localVideoRef.current.play().catch(() => undefined);
    }

    stream.getVideoTracks()[0] && (stream.getVideoTracks()[0].enabled = callState.isVideoOn);
    stream.getAudioTracks()[0] && (stream.getAudioTracks()[0].enabled = callState.isAudioOn);

    return stream;
  };

  const ensurePeerConnection = async () => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const configuration = await getWebRTCConfigurationAsync();
    const peer = new RTCPeerConnection(configuration);

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        signalingRef.current?.sendIceCandidate(event.candidate);
      }
    };

    peer.ontrack = (event) => {
      const [stream] = event.streams;
      remoteStreamRef.current = stream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => undefined);
      }
    };

    const stream = await prepareLocalStream();
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peerConnectionRef.current = peer;
    return peer;
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    const peer = await ensurePeerConnection();
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    signalingRef.current?.sendAnswer(answer);
    setCallState((prev) => ({ ...prev, isConnected: true }));
    startTimer();
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) {
      return;
    }
    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!peerConnectionRef.current) {
      return;
    }

    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Failed to add ICE candidate', err);
    }
  };

  const startCall = async () => {
    if (!signalingReady) {
      setError('Waiting for signaling server connection...');
      return;
    }

    try {
      const peer = await ensurePeerConnection();
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      signalingRef.current?.sendOffer(offer);

      setCallState((prev) => ({ ...prev, isConnected: true }));
      setError(null);
      startTimer();
    } catch (err) {
      console.error('Failed to start call', err);
      setError('Failed to start call. Please check your media permissions.');
    }
  };

  const startTimer = () => {
    if (callTimerRef.current) {
      return;
    }
    callTimerRef.current = setInterval(() => {
      setCallState((prev) => ({ ...prev, callDuration: prev.callDuration + 1 }));
    }, 1000);
  };

  const endCall = () => {
    signalingRef.current?.endCall();
    cleanupMedia();
    resetCallState();
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !callState.isVideoOn;
      });
    }
    setCallState((prev) => ({ ...prev, isVideoOn: !prev.isVideoOn }));
  };

  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !callState.isAudioOn;
      });
    }
    setCallState((prev) => ({ ...prev, isAudioOn: !prev.isAudioOn }));
  };

  const sendMessage = () => {
    if (!newMessage.trim()) {
      return;
    }

    signalingRef.current?.sendChatMessage(newMessage);
    setChatMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        sender: advisor.name,
        message: newMessage.trim(),
        timestamp: new Date(),
      },
    ]);
    setNewMessage('');
  };

  const copyShareLink = async () => {
    if (!shareLink) {
      return;
    }
    try {
      await navigator.clipboard.writeText(shareLink);
      setError(null);
      setTimeout(() => setError(null), 2000);
    } catch (err) {
      console.error('Failed to copy share link', err);
      setError('Unable to copy link. Copy manually instead.');
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  };

  const handleClose = () => {
    endCall();
    onClose();
  };

  if (!isOpen || !callId) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-gray-900 text-white shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-gray-800 bg-gray-850 p-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">שיחה עם</span>
                <span className="text-lg font-semibold">{client.name}</span>
              </div>
              <Badge variant={callState.clientConnected ? 'default' : 'secondary'}>
                {callState.clientConnected ? 'לקוח מחובר' : 'ממתין ללקוח'}
              </Badge>
              {callState.isConnected && (
                <span className="text-sm text-gray-300">{formatDuration(callState.callDuration)}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1 text-sm">
                <span className="truncate">{shareLink}</span>
                <Button size="icon" variant="ghost" onClick={copyShareLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => undefined);
                  } else {
                    document.documentElement.requestFullscreen().catch(() => undefined);
                  }
                }}
              >
                {document.fullscreenElement ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>

              <Button variant="ghost" size="icon" onClick={handleClose}>
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {error && <div className="bg-red-500/20 px-4 py-2 text-center text-sm text-red-200">{error}</div>}

          <div className="flex flex-1 overflow-hidden">
            <div className="relative flex-1 bg-black">
              <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />

              <div className="absolute bottom-4 left-4 flex w-80 flex-col gap-3 rounded-xl bg-gray-900/80 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{advisor.name}</span>
                  <Badge variant={signalingReady ? 'default' : 'secondary'}>
                    {signalingReady ? 'Signaling Ready' : 'ממתין לחיבור'}</Badge>
                </div>
                <div className="aspect-video overflow-hidden rounded-lg border border-gray-800">
                  <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                  {!callState.isVideoOn && (
                    <div className="flex h-full w-full items-center justify-center bg-gray-900/70">
                      <VideoOff className="h-8 w-8" />
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-4">
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  variant={callState.isAudioOn ? 'secondary' : 'destructive'}
                  onClick={toggleAudio}
                >
                  {callState.isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  variant={callState.isVideoOn ? 'secondary' : 'destructive'}
                  onClick={toggleVideo}
                >
                  {callState.isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-500"
                  disabled={callState.isConnected}
                  onClick={startCall}
                >
                  <Phone className="h-5 w-5" />
                </Button>
                <Button size="icon" className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-500" onClick={endCall}>
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <aside className="flex w-80 flex-col border-l border-gray-800 bg-gray-900">
              <div className="flex items-center gap-2 border-b border-gray-800 p-4">
                <User className="h-4 w-4" />
                <span className="text-sm">צ'אט עם הלקוח</span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {chatMessages.map((message) => (
                  <div key={message.id} className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{message.sender}</span>
                      <span>{message.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="rounded-lg bg-gray-800 p-2 text-sm text-gray-100">{message.message}</div>
                  </div>
                ))}

                {chatMessages.length === 0 && (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    אין הודעות עדיין
                  </div>
                )}
              </div>

              <div className="border-t border-gray-800 p-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(event) => setNewMessage(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
                    placeholder="כתוב הודעה..."
                    className="flex-1 rounded-lg border border-gray-700 bg-gray-850 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button size="icon" onClick={sendMessage}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
