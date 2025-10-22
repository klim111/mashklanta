'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Monitor, 
  MonitorOff,
  Users,
  Settings,
  X,
  Maximize2,
  Minimize2,
  Share2,
  MessageSquare,
  FileText,
  Calculator,
  PieChart,
  Copy,
  Check,
  Camera,
  CameraOff,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SocketIOSignaling, SignalingMessage, createSocketIOSignaling } from '@/lib/socketio-signaling';

interface CallState {
  isConnected: boolean;
  isVideoOn: boolean;
  isAudioOn: boolean;
  isScreenSharing: boolean;
  isFullscreen: boolean;
  callDuration: number;
  availableCameras: MediaDeviceInfo[];
  selectedCameraId: string;
  availableMicrophones: MediaDeviceInfo[];
  selectedMicrophoneId: string;
  isWaitingForAdvisor: boolean;
}

export default function VideoCallPage({ params }: { params: { id: string } }) {
  const [callState, setCallState] = useState<CallState>({
    isConnected: false,
    isVideoOn: true,
    isAudioOn: true,
    isScreenSharing: false,
    isFullscreen: false,
    callDuration: 0,
    availableCameras: [],
    selectedCameraId: '',
    availableMicrophones: [],
    selectedMicrophoneId: '',
    isWaitingForAdvisor: true
  });

  const [chatMessages, setChatMessages] = useState<Array<{id: string, sender: string, message: string, timestamp: Date}>>([]);
  const [newMessage, setNewMessage] = useState('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const callDurationRef = useRef<NodeJS.Timeout>();
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingRef = useRef<SocketIOSignaling | null>(null);
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);

  // Initialize devices and signaling
  useEffect(() => {
    initializeDevices();
    initializeSignaling();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (signalingRef.current) {
        signalingRef.current.disconnect();
      }
    };
  }, []);

  // Handle call connection
  useEffect(() => {
    if (callState.isConnected) {
      startCallDuration();
      initializeWebRTC();
    }

    return () => {
      if (callDurationRef.current) {
        clearInterval(callDurationRef.current);
      }
      cleanup();
    };
  }, [callState.isConnected]);

  const initializeDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      const microphones = devices.filter(device => device.kind === 'audioinput');
      
      setCallState(prev => ({
        ...prev,
        availableCameras: cameras,
        selectedCameraId: cameras[0]?.deviceId || '',
        availableMicrophones: microphones,
        selectedMicrophoneId: microphones[0]?.deviceId || ''
      }));
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  };

  const initializeSignaling = async () => {
    const callId = params.id;
    const userId = `client_${Date.now()}`;
    
    const signaling = createSocketIOSignaling(
      callId,
      userId,
      'client',
      handleSignalingMessage,
      setIsSignalingConnected
    );
    
    signalingRef.current = signaling;
    await signaling.connect();
  };

  const handleSignalingMessage = (message: SignalingMessage) => {
    console.log('Client received signaling message:', message);
    
    switch (message.type) {
      case 'chat-message':
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: message.from.includes('advisor') ? 'יועץ' : 'לקוח',
          message: message.data.message,
          timestamp: new Date(message.timestamp)
        }]);
        break;
        
      case 'user-joined':
        if (message.from.includes('advisor')) {
          console.log('Advisor joined the call');
        }
        break;
        
      case 'user-left':
        console.log('User left the call');
        break;
        
      case 'offer':
        handleOffer(message.data, message.from);
        break;
        
      case 'answer':
        handleAnswer(message.data, message.from);
        break;
        
      case 'ice-candidate':
        handleIceCandidate(message.data, message.from);
        break;
        
      case 'call-ended':
        endCall();
        break;
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, from: string) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(offer);
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      signalingRef.current?.sendAnswer(answer, from);
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit, from: string) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(answer);
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit, from: string) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.addIceCandidate(candidate);
    }
  };

  const startCallDuration = () => {
    callDurationRef.current = setInterval(() => {
      setCallState(prev => ({ ...prev, callDuration: prev.callDuration + 1 }));
    }, 1000);
  };

  const initializeWebRTC = async () => {
    try {
      // Get user media with selected devices
      const constraints = {
        video: callState.isVideoOn ? {
          deviceId: callState.selectedCameraId ? { exact: callState.selectedCameraId } : undefined
        } : false,
        audio: callState.isAudioOn ? {
          deviceId: callState.selectedMicrophoneId ? { exact: callState.selectedMicrophoneId } : undefined
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize peer connection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      peerConnectionRef.current = new RTCPeerConnection(configuration);

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current?.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        const [remoteStream] = event.streams;
        remoteStreamRef.current = remoteStream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && signalingRef.current) {
          // Send ICE candidate to all other participants
          signalingRef.current.sendIceCandidate(event.candidate, 'broadcast');
        }
      };

    } catch (error) {
      console.error('Error initializing WebRTC:', error);
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleVideo = async () => {
    const newVideoState = !callState.isVideoOn;
    setCallState(prev => ({ ...prev, isVideoOn: newVideoState }));
    
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = newVideoState;
      }
    }
  };

  const toggleAudio = async () => {
    const newAudioState = !callState.isAudioOn;
    setCallState(prev => ({ ...prev, isAudioOn: newAudioState }));
    
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = newAudioState;
      }
    }
  };

  const switchCamera = async (cameraId: string) => {
    setCallState(prev => ({ ...prev, selectedCameraId: cameraId }));
    
    if (localStreamRef.current && callState.isVideoOn) {
      try {
        const constraints = {
          video: { deviceId: { exact: cameraId } },
          audio: callState.isAudioOn ? { deviceId: { exact: callState.selectedMicrophoneId } } : false
        };
        
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Replace video track
        const newVideoTrack = newStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current?.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender && newVideoTrack) {
          await sender.replaceTrack(newVideoTrack);
        }
        
        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
        }
        
        // Stop old stream
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = newStream;
        
      } catch (error) {
        console.error('Error switching camera:', error);
      }
    }
  };

  const switchMicrophone = async (microphoneId: string) => {
    setCallState(prev => ({ ...prev, selectedMicrophoneId: microphoneId }));
    
    if (localStreamRef.current && callState.isAudioOn) {
      try {
        const constraints = {
          video: callState.isVideoOn ? { deviceId: { exact: callState.selectedCameraId } } : false,
          audio: { deviceId: { exact: microphoneId } }
        };
        
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Replace audio track
        const newAudioTrack = newStream.getAudioTracks()[0];
        const sender = peerConnectionRef.current?.getSenders().find(s => 
          s.track && s.track.kind === 'audio'
        );
        
        if (sender && newAudioTrack) {
          await sender.replaceTrack(newAudioTrack);
        }
        
        // Update local stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
        }
        
        // Stop old stream
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = newStream;
        
      } catch (error) {
        console.error('Error switching microphone:', error);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!callState.isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = screenStream;
        }
        
        // Add screen share track to peer connection
        const videoTrack = screenStream.getVideoTracks()[0];
        if (videoTrack && peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }
        
        setCallState(prev => ({ ...prev, isScreenSharing: true }));
        
        // Handle screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          setCallState(prev => ({ ...prev, isScreenSharing: false }));
        };
        
      } catch (error) {
        console.error('Error starting screen share:', error);
      }
    } else {
      setCallState(prev => ({ ...prev, isScreenSharing: false }));
    }
  };

  const toggleFullscreen = () => {
    setCallState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  };

  const joinCall = async () => {
    setCallState(prev => ({ 
      ...prev, 
      isConnected: true, 
      isWaitingForAdvisor: false 
    }));
    
    // Create offer and send to advisor
    if (peerConnectionRef.current && signalingRef.current) {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      // Send offer to advisor
      signalingRef.current.sendOffer(offer, 'advisor');
    }
  };

  const endCall = () => {
    if (signalingRef.current) {
      signalingRef.current.endCall();
      signalingRef.current.disconnect();
    }
    cleanup();
    setCallState(prev => ({ ...prev, isConnected: false, callDuration: 0 }));
    // Redirect back to main page
    window.location.href = '/';
  };

  const sendMessage = () => {
    if (newMessage.trim() && signalingRef.current) {
      // Send message via signaling
      signalingRef.current.sendChatMessage(newMessage);
      
      // Add to local chat immediately
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'לקוח',
        message: newMessage,
        timestamp: new Date()
      }]);
      setNewMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-300">
                  {callState.isConnected ? formatDuration(callState.callDuration) : 'ממתין לחיבור...'}
                </span>
              </div>
              <div className="h-4 w-px bg-gray-600"></div>
              <div>
                <h2 className="font-semibold text-white">שיחה עם יועץ משכנתאות</h2>
                <p className="text-sm text-gray-400">משכלתנא - פלטפורמת ייעוץ משכנתאות</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="p-2 text-gray-300 hover:text-white"
              >
                {callState.isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={endCall}
                className="p-2 text-gray-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className={`${callState.isFullscreen ? 'h-[calc(100vh-64px)]' : 'h-[calc(100vh-64px)]'} flex`}>
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Container */}
          <div className="flex-1 relative bg-gray-900">
            {callState.isWaitingForAdvisor ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">ממתין ליועץ...</h3>
                  <p className="text-gray-300 mb-6">היועץ יתחבר בקרוב לשיחה</p>
                  <Button onClick={joinCall} className="bg-green-600 hover:bg-green-700">
                    <Phone className="w-4 h-4 mr-2" />
                    הצטרף לשיחה
                  </Button>
                </div>
              </div>
            ) : !callState.isConnected ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">מתחבר ליועץ...</h3>
                  <p className="text-gray-300 mb-6">השיחה תתחיל ברגע שהיועץ יתחבר</p>
                </div>
              </div>
            ) : (
              <>
                {/* Remote Video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Local Video */}
                <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!callState.isVideoOn && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <VideoOff className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>

                {/* Screen Share Overlay */}
                {callState.isScreenSharing && (
                  <div className="absolute bottom-4 left-4 w-64 h-48 bg-white rounded-lg shadow-lg border-2 border-blue-500">
                    <div className="p-2 bg-blue-500 text-white text-sm font-medium rounded-t-lg">
                      שיתוף מסך - יועץ
                    </div>
                    <video
                      ref={screenShareRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Device Selection */}
          {callState.isConnected && (
            <div className="flex items-center justify-center gap-4 p-2 bg-gray-800 border-t border-gray-700">
              {/* Camera Selection */}
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-gray-400" />
                <select
                  value={callState.selectedCameraId}
                  onChange={(e) => switchCamera(e.target.value)}
                  className="text-xs border border-gray-600 rounded px-2 py-1 bg-gray-700 text-white"
                >
                  {callState.availableCameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `מצלמה ${camera.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Microphone Selection */}
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-gray-400" />
                <select
                  value={callState.selectedMicrophoneId}
                  onChange={(e) => switchMicrophone(e.target.value)}
                  className="text-xs border border-gray-600 rounded px-2 py-1 bg-gray-700 text-white"
                >
                  {callState.availableMicrophones.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `מיקרופון ${mic.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 p-4 bg-gray-800">
            <Button
              variant={callState.isAudioOn ? "default" : "destructive"}
              size="lg"
              onClick={toggleAudio}
              className="rounded-full w-12 h-12"
            >
              {callState.isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
            
            <Button
              variant={callState.isVideoOn ? "default" : "destructive"}
              size="lg"
              onClick={toggleVideo}
              className="rounded-full w-12 h-12"
            >
              {callState.isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
            
            <Button
              variant={callState.isScreenSharing ? "default" : "outline"}
              size="lg"
              onClick={toggleScreenShare}
              className="rounded-full w-12 h-12"
            >
              {callState.isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </Button>
            
            <Button
              variant="destructive"
              size="lg"
              onClick={endCall}
              className="rounded-full w-12 h-12"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-80 border-l border-gray-700 bg-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              צ'אט
            </h3>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {chatMessages.map((message) => (
              <div key={message.id} className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-blue-400">{message.sender}</span>
                  <span className="text-xs text-gray-500">
                    {message.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="bg-gray-700 rounded-lg p-2 text-sm text-white">
                  {message.message}
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="הקלד הודעה..."
                className="flex-1 px-3 py-2 border border-gray-600 rounded-lg text-sm bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button size="sm" onClick={sendMessage}>
                שלח
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
