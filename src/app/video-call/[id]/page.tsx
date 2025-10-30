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
  User,
  Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HTTPSignaling, SignalingMessage, createHTTPSignaling } from '@/lib/http-signaling';
import { getWebRTCConfiguration, getMediaConstraints, createConnectionMonitor, requestMediaAccess } from '@/lib/webrtc-config';
import { MediaPermissionCheck } from '@/components/ui/media-permission-check';
import { WebRTCDebug } from '@/components/ui/webrtc-debug';

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

export default function VideoCallPage({ params }: { params: Promise<{ id: string }> }) {
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
  const [callId, setCallId] = useState<string>('');
  const [advisorConnected, setAdvisorConnected] = useState(false);
  const [mediaPermissionGranted, setMediaPermissionGranted] = useState(false);
  const [showPermissionCheck, setShowPermissionCheck] = useState(false);
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const callDurationRef = useRef<NodeJS.Timeout>();
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingRef = useRef<HTTPSignaling | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 3;
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('new');
  const connectionMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const lastAdvisorActivityRef = useRef<number>(Date.now());

  // Get call ID from params
  useEffect(() => {
    const getCallId = async () => {
      const resolvedParams = await params;
      setCallId(resolvedParams.id);
    };
    getCallId();
  }, [params]);

  // Initialize devices and signaling
  useEffect(() => {
    console.log('Video call page mounted, callId:', callId);
    initializeDevices();
    setShowPermissionCheck(true);
    if (callId) {
      console.log('Initializing client signaling for callId:', callId);
      initializeSignaling();
    }
  }, [callId]);

  // Start connection monitoring when call is active
  useEffect(() => {
    if (callState.isConnected && peerConnectionRef.current) {
      console.log('Starting enhanced connection monitoring for client...');
      
      let lastVideoCurrentTime = 0;
      let lastVideoCheckTime = Date.now();
      let frozenVideoCount = 0;
      
      connectionMonitorRef.current = setInterval(() => {
        if (peerConnectionRef.current) {
          const connectionState = peerConnectionRef.current.connectionState;
          const iceConnectionState = peerConnectionRef.current.iceConnectionState;
          
          console.log('Client connection monitor:', { connectionState, iceConnectionState });
          
          // Enhanced video stream monitoring
          if (remoteVideoRef.current) {
            const video = remoteVideoRef.current;
            const currentTime = Date.now();
            
            // Check if video is actually receiving frames
            if (video.currentTime > 0) {
              // Check if video currentTime is advancing (proper frame detection)
              if (video.currentTime === lastVideoCurrentTime) {
                frozenVideoCount++;
                console.warn(`Client video currentTime not advancing (${frozenVideoCount} consecutive checks)`);
                
                if (frozenVideoCount >= 3) {
                  console.warn('Client video confirmed frozen - currentTime not advancing, attempting recovery...');
                  handleVideoFreeze();
                  frozenVideoCount = 0;
                }
              } else {
                frozenVideoCount = 0;
                lastVideoCurrentTime = video.currentTime;
              }
              
              // Check if too much time has passed since last check
              const timeSinceLastCheck = currentTime - lastVideoCheckTime;
              if (timeSinceLastCheck > 10000) { // More than 10 seconds
                console.warn('Client video monitoring gap detected, checking stream...');
                handleVideoFreeze();
              }
              lastVideoCheckTime = currentTime;
            }
            
            // Check video element state more thoroughly
              if (video.paused || video.ended || video.readyState < 2) {
              console.warn('Client remote video not playing properly, attempting recovery...');
              handleVideoFreeze();
            }
            
            // Check for video element issues
            if (video.videoWidth === 0 || video.videoHeight === 0) {
              console.warn('Client video has zero dimensions, attempting recovery...');
              handleVideoFreeze();
            }
            
            // Check if video has srcObject but no currentTime
            if (video.srcObject && video.currentTime === 0 && video.readyState >= 2) {
              console.warn('Client video has stream but no currentTime, attempting recovery...');
              handleVideoFreeze();
            }
          }
          
          // Check advisor activity heartbeat
          const timeSinceLastActivity = Date.now() - lastAdvisorActivityRef.current;
          if (timeSinceLastActivity > 15000) { // 15 seconds without activity
            console.warn('Client no advisor activity for 15+ seconds, checking connection...');
            handleVideoFreeze();
          }
          
          // Check ICE connection states
          if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected') {
            console.warn('Client ICE connection issue detected, attempting recovery...');
            handleIceFailure();
          } else if (iceConnectionState === 'checking' && connectionState === 'connected') {
            // ICE is checking but connection is established - this might indicate issues
            console.log('Client ICE checking while connected - monitoring...');
          }
          
          // Check for video track issues
          const videoTrack = peerConnectionRef.current.getReceivers()
            .find(receiver => receiver.track && receiver.track.kind === 'video')?.track as MediaStreamTrack;
          
          if (videoTrack && videoTrack.readyState === 'ended') {
            console.warn('Client video track ended, attempting recovery...');
            handleVideoTrackEnd();
          }
        }
      }, 2000); // Check every 2 seconds for better responsiveness
    }
    
    return () => {
      if (connectionMonitorRef.current) {
        clearInterval(connectionMonitorRef.current);
        connectionMonitorRef.current = null;
      }
    };
  }, [callState.isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionMonitorRef.current) {
        clearInterval(connectionMonitorRef.current);
      }
      if (signalingRef.current) {
        signalingRef.current.disconnect();
      }
      cleanup();
    };
  }, []);

  // Handle call connection - REMOVED WebRTC initialization to prevent race conditions
  useEffect(() => {
    if (callState.isConnected) {
      startCallDuration();
      // WebRTC is now initialized directly in joinCall()
    }

    return () => {
      if (callDurationRef.current) {
        clearInterval(callDurationRef.current);
      }
      cleanup();
    };
  }, [callState.isConnected]);

  // Initialize WebRTC when signaling is connected and we have media permissions
  useEffect(() => {
    if (isSignalingConnected && mediaPermissionGranted && !peerConnectionRef.current) {
      console.log('🔗 Signaling connected and permissions granted, initializing WebRTC...');
      initializeWebRTC();
    }
  }, [isSignalingConnected, mediaPermissionGranted]);

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
    if (!callId) return;
    
    const userId = `client_${Date.now()}`;
    
    console.log('Initializing signaling for client:', { callId, userId });
    
    const signaling = createHTTPSignaling(
      callId,
      userId,
      'client',
      handleSignalingMessage,
      setIsSignalingConnected
    );
    
    signalingRef.current = signaling;
    try {
      await signaling.connect();
      console.log('Client signaling connected successfully');
    } catch (error) {
      console.error('Failed to connect client signaling:', error);
    }
  };

  const handleSignalingMessage = (message: SignalingMessage) => {
    console.log('Client received signaling message:', message);
    
    switch (message.type) {
      case 'chat-message':
        console.log('Client received chat message:', message.data.message);
        // Only add message if it's from the advisor (prevent duplicates)
        if (message.from.includes('advisor')) {
          setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: 'יועץ',
            message: message.data.message,
            timestamp: new Date(message.timestamp)
          }]);
        }
        break;
        
      case 'user-joined':
        if (message.from.includes('advisor')) {
          console.log('Advisor joined the call');
          setAdvisorConnected(true);
          lastAdvisorActivityRef.current = Date.now();
        }
        break;
        
      case 'user-left':
        console.log('User left the call');
        setAdvisorConnected(false);
        break;
        
      case 'offer':
        console.log('📥 Client received offer from:', message.from);
        console.log('📋 Offer details:', { 
          type: message.data?.type, 
          hasSdp: !!message.data?.sdp,
          sdpLength: message.data?.sdp?.length 
        });
        handleOffer(message.data, message.from);
        if (message.from.includes('advisor')) {
          lastAdvisorActivityRef.current = Date.now();
        }
        break;
        
      case 'answer':
        console.log('📥 Client received answer from:', message.from);
        console.log('📋 Answer details:', { 
          type: message.data?.type, 
          hasSdp: !!message.data?.sdp,
          sdpLength: message.data?.sdp?.length 
        });
        handleAnswer(message.data, message.from);
        if (message.from.includes('advisor')) {
          lastAdvisorActivityRef.current = Date.now();
        }
        break;
        
      case 'ice-candidate':
        console.log('📥 Client received ICE candidate from:', message.from);
        console.log('🧊 ICE candidate details:', { 
          hasCandidate: !!message.data?.candidate,
          sdpMid: message.data?.sdpMid,
          sdpMLineIndex: message.data?.sdpMLineIndex 
        });
        handleIceCandidate(message.data, message.from);
        if (message.from.includes('advisor')) {
          lastAdvisorActivityRef.current = Date.now();
        }
        break;
        
      case 'call-ended':
        endCall();
        break;
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, from: string) => {
    console.log('Client handling offer from:', from);
    console.log('Client offer data:', offer);
    console.log('Client peer connection exists:', !!peerConnectionRef.current);
    
    if (peerConnectionRef.current) {
      try {
        console.log('Client setting remote description...');
      await peerConnectionRef.current.setRemoteDescription(offer);
        console.log('Client remote description set successfully');
        
        console.log('Client creating answer...');
      const answer = await peerConnectionRef.current.createAnswer();
        console.log('Client answer created:', answer);
        
        console.log('Client setting local description...');
      await peerConnectionRef.current.setLocalDescription(answer);
        console.log('Client local description set successfully');
      
        console.log('Client sending answer to:', from);
      signalingRef.current?.sendAnswer(answer, from);
        console.log('Client answer sent successfully');
      } catch (error) {
        console.error('Client error handling offer:', error);
      }
    } else {
      console.error('Client peer connection not available for offer');
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit, from: string) => {
    console.log('Client handling answer from:', from);
    console.log('Client answer data:', answer);
    console.log('Client peer connection exists:', !!peerConnectionRef.current);
    
    if (peerConnectionRef.current) {
      try {
        console.log('Client setting remote description from answer...');
        await peerConnectionRef.current.setRemoteDescription(answer);
        console.log('Client remote description set from answer successfully');
      } catch (error) {
        console.error('Client error handling answer:', error);
      }
    } else {
      console.error('Client peer connection not available for answer');
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit, from: string) => {
    console.log('Client handling ICE candidate from:', from);
    console.log('Client ICE candidate data:', candidate);
    console.log('Client peer connection exists:', !!peerConnectionRef.current);
    
    if (peerConnectionRef.current) {
      try {
        console.log('Client adding ICE candidate...');
        await peerConnectionRef.current.addIceCandidate(candidate);
        console.log('Client ICE candidate added successfully');
      } catch (error) {
        console.error('Client error handling ICE candidate:', error);
      }
    } else {
      console.error('Client peer connection not available for ICE candidate');
    }
  };

  const startCallDuration = () => {
    callDurationRef.current = setInterval(() => {
      setCallState(prev => ({ ...prev, callDuration: prev.callDuration + 1 }));
    }, 1000);
  };

  const initializeWebRTC = async () => {
    // Prevent multiple initializations
    if (peerConnectionRef.current) {
      console.log('Client WebRTC already initialized, skipping...');
      return;
    }
    
    try {
      // Request media access with enhanced error handling and adaptive quality
      console.log('📷 Client requesting media access...');
      console.log('🔧 Media constraints:', {
        video: callState.isVideoOn,
        audio: callState.isAudioOn,
        selectedCamera: callState.selectedCameraId,
        selectedMicrophone: callState.selectedMicrophoneId
      });
      
      const stream = await requestMediaAccess(
        callState.isVideoOn,
        callState.isAudioOn,
        callState.selectedCameraId,
        callState.selectedMicrophoneId,
        'medium' // Start with medium quality, can be adjusted based on connection
      );
      
      console.log('✅ Client got user media stream:', stream);
      console.log('🎵 Client stream tracks:', stream.getTracks().map(t => ({ 
        kind: t.kind, 
        enabled: t.enabled, 
        readyState: t.readyState,
        label: t.label,
        id: t.id
      })));
      
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Ensure video plays
        try {
          await localVideoRef.current.play();
          console.log('Client local video started playing');
        } catch (playError) {
          console.error('Client local video play failed:', playError);
        }
      }

      // Initialize peer connection with optimized configuration
      const configuration = getWebRTCConfiguration();
      console.log('Client creating peer connection with configuration:', configuration);
      peerConnectionRef.current = new RTCPeerConnection(configuration);
      console.log('Client peer connection created:', peerConnectionRef.current);

      // Negotiation guard to avoid parallel negotiations
      let isNegotiating = false;

      const negotiateNow = async () => {
        if (!peerConnectionRef.current || !signalingRef.current) return;
        if (isNegotiating) return;
        isNegotiating = true;
        try {
          console.log('Client negotiateNow: creating offer...');
          const offer = await peerConnectionRef.current.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await peerConnectionRef.current.setLocalDescription(offer);
          signalingRef.current.sendOffer(offer, 'broadcast');
          console.log('Client sent offer from negotiateNow');
        } catch (err) {
          console.error('Client negotiateNow error:', err);
        } finally {
          isNegotiating = false;
        }
      };

      // Client initiates WebRTC connection - auto negotiation when needed
      peerConnectionRef.current.onnegotiationneeded = async () => {
        if (!peerConnectionRef.current || !signalingRef.current) return;
        if (isNegotiating) return;
        
        // Only proceed if we don't have a remote description (haven't received offer)
        if (peerConnectionRef.current.remoteDescription) {
          console.log('Client already has remote description, skipping offer creation');
          return;
        }
        
        isNegotiating = true;
        try {
          console.log('Client onnegotiationneeded: creating offer...');
          const offer = await peerConnectionRef.current.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await peerConnectionRef.current.setLocalDescription(offer);
          signalingRef.current.sendOffer(offer, 'broadcast');
          console.log('Client sent offer from onnegotiationneeded');
        } catch (err) {
          console.error('Client negotiation error:', err);
        } finally {
          isNegotiating = false;
        }
      };

      // Add local stream to peer connection
      console.log('Client adding tracks to peer connection...');
      stream.getTracks().forEach(track => {
        console.log('Client adding track:', track.kind, track.id);
        peerConnectionRef.current?.addTrack(track, stream);
      });

      // Fallback: if no localDescription shortly after adding tracks, trigger negotiation
      setTimeout(() => {
        if (peerConnectionRef.current && !peerConnectionRef.current.localDescription) {
          console.log('Client fallback negotiation trigger');
          negotiateNow();
        }
      }, 200);

      // Handle remote stream with enhanced monitoring and proper initialization
      peerConnectionRef.current.ontrack = (event) => {
        console.log('Client received remote track:', event.track.kind, event.track.id);
        console.log('Client remote track readyState:', event.track.readyState);
        console.log('Client remote track enabled:', event.track.enabled);
        
        const [remoteStream] = event.streams;
        remoteStreamRef.current = remoteStream;
        
        console.log('Client remote stream:', remoteStream);
        console.log('Client remote stream active:', remoteStream.active);
        console.log('Client remote stream tracks:', remoteStream.getTracks().length);
        
        if (remoteVideoRef.current) {
          console.log('Client setting remote video stream');
          console.log('Client video element before:', {
            srcObject: remoteVideoRef.current.srcObject,
            readyState: remoteVideoRef.current.readyState,
            paused: remoteVideoRef.current.paused
          });
          
          // Set the stream directly
          remoteVideoRef.current.srcObject = remoteStream;
          
          // Ensure remote video plays
          remoteVideoRef.current.addEventListener('loadedmetadata', async () => {
            try {
              await remoteVideoRef.current?.play();
              console.log('Client remote video started playing');
            } catch (playError) {
              console.error('Client remote video play failed:', playError);
            }
          });
          
          console.log('Client video element after:', {
            srcObject: remoteVideoRef.current.srcObject,
            readyState: remoteVideoRef.current.readyState,
            paused: remoteVideoRef.current.paused
          });
          
          // Enhanced video stream initialization with better error handling
          const initializeVideoPlayback = async () => {
            if (!remoteVideoRef.current || !remoteStream) return;
            
            try {
              console.log('Client initializing video playback...');
              
              // Ensure video element is properly configured
              const video = remoteVideoRef.current;
              video.srcObject = remoteStream;
              
              // Wait for metadata to load
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Metadata load timeout')), 5000);
                
                video.addEventListener('loadedmetadata', () => {
                  clearTimeout(timeout);
                  resolve(null);
                }, { once: true });
                
                if (video.readyState >= 1) {
                  clearTimeout(timeout);
                  resolve(null);
                }
              });
              
              // Try to play the video
              await video.play();
              console.log('✅ Client remote video playing successfully');
              
            } catch (error) {
              console.error('❌ Client video initialization failed:', error);
              
              // Retry with user interaction requirement
              if (error instanceof Error && error.name === 'NotAllowedError') {
                console.log('Client video requires user interaction, will play on click');
              } else {
                // Retry after delay
                setTimeout(() => {
                  if (remoteVideoRef.current && remoteStreamRef.current) {
                    console.log('Client retrying video initialization...');
                    initializeVideoPlayback();
                  }
                }, 2000);
              }
            }
          };
          
          // Initialize playback after a short delay
          setTimeout(initializeVideoPlayback, 100);
          
          // Enhanced event listeners for video monitoring
          remoteVideoRef.current.addEventListener('loadstart', () => {
            console.log('Client remote video loadstart');
          });
          
          remoteVideoRef.current.addEventListener('loadeddata', () => {
            console.log('Client remote video loadeddata');
          });
          
          remoteVideoRef.current.addEventListener('canplay', () => {
            console.log('Client remote video canplay');
            // Ensure video is playing
            if (remoteVideoRef.current && remoteVideoRef.current.paused) {
              remoteVideoRef.current.play().catch(e => 
                console.error('Client remote video canplay play failed:', e)
              );
            }
          });
          
          remoteVideoRef.current.addEventListener('canplaythrough', () => {
            console.log('Client remote video canplaythrough');
          });
          
          remoteVideoRef.current.addEventListener('playing', () => {
            console.log('Client remote video playing');
          });
          
          remoteVideoRef.current.addEventListener('waiting', () => {
            console.warn('Client remote video waiting for data');
          });
          
          remoteVideoRef.current.addEventListener('stalled', () => {
            console.warn('Client remote video stalled');
            setTimeout(() => handleVideoFreeze(), 2000);
          });
          
          remoteVideoRef.current.addEventListener('error', (e) => {
            console.error('Client remote video error:', e);
            setTimeout(() => handleVideoFreeze(), 1000);
          });
          
          remoteVideoRef.current.addEventListener('pause', () => {
            console.warn('Client remote video paused, attempting recovery...');
            setTimeout(() => handleVideoFreeze(), 1000);
          });
          
          remoteVideoRef.current.addEventListener('ended', () => {
            console.warn('Client remote video ended, attempting recovery...');
            setTimeout(() => handleVideoTrackEnd(), 1000);
          });
          
          // Monitor video track changes
          const videoTrack = remoteStream.getVideoTracks()[0];
          if (videoTrack) {
            console.log('Client monitoring video track:', videoTrack.id);
            
            videoTrack.addEventListener('ended', () => {
              console.warn('Client remote video track ended');
              handleVideoTrackEnd();
            });
            
            videoTrack.addEventListener('mute', () => {
              console.warn('Client remote video track muted');
            });
            
            videoTrack.addEventListener('unmute', () => {
              console.log('Client remote video track unmuted');
            });
            
            // Monitor track settings
            videoTrack.addEventListener('settingschange', () => {
              console.log('Client remote video track settings changed');
            });
            
            // Monitor stream activity
            const checkStreamActivity = () => {
              if (!remoteStream.active) {
                console.warn('Client remote stream became inactive');
                handleVideoFreeze();
              }
            };
            
            // Check stream activity every 5 seconds
            const streamActivityInterval = setInterval(checkStreamActivity, 5000);
            
            // Clean up interval when track ends
            videoTrack.addEventListener('ended', () => {
              clearInterval(streamActivityInterval);
            });
          }
        }
      };

      // Set up connection monitoring
      createConnectionMonitor(
        peerConnectionRef.current,
        (state) => {
          console.log('Client connection state:', state);
          setConnectionState(state);
        },
        (state) => {
          console.log('Client ICE connection state:', state);
          if (state === 'failed' || state === 'disconnected') {
            console.warn('Client ICE connection failed/disconnected, attempting to restart...');
            restartIce();
          }
        }
      );

      // Handle ICE candidates with detailed logging
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Client ICE candidate generated:', {
            type: event.candidate.type,
            protocol: event.candidate.protocol,
            address: event.candidate.address,
            port: event.candidate.port,
            candidate: event.candidate.candidate
          });
          if (signalingRef.current) {
            console.log('📤 Client sending ICE candidate via signaling...');
            signalingRef.current.sendIceCandidate(event.candidate, 'broadcast');
          } else {
            console.error('❌ Client signaling not available to send ICE candidate');
          }
        } else {
          console.log('✅ Client ICE gathering complete');
          // If ICE gathering completes but we still don't have connection, try restart
          setTimeout(() => {
            const pc = peerConnectionRef.current;
            if (pc && (pc.iceConnectionState === 'new' || pc.iceConnectionState === 'checking')) {
              console.log('⚠️ Client ICE gathering complete but no connection, attempting restart...');
              restartIce();
            }
          }, 3000);
        }
      };

      console.log('✅ WebRTC initialized for client');

      // Client initiates the connection by creating an offer after initialization
      setTimeout(async () => {
        if (peerConnectionRef.current && signalingRef.current && !peerConnectionRef.current.localDescription) {
          try {
            console.log('🚀 Client creating initial offer...');
            const offer = await peerConnectionRef.current.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true
            });
            await peerConnectionRef.current.setLocalDescription(offer);
            signalingRef.current.sendOffer(offer, 'broadcast');
            console.log('📤 Client sent initial offer');
          } catch (error) {
            console.error('❌ Client failed to create initial offer:', error);
          }
        }
      }, 1000); // Wait 1 second for everything to be ready

    } catch (error: any) {
      console.error('Error initializing WebRTC:', error);
      setMediaError(error?.message || 'Failed to access camera/microphone');
      setShowPermissionCheck(true);
    }
  };

  const reconnectWebRTC = async () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached for client');
      return;
    }
    
    console.log(`Client attempting WebRTC reconnection (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
    setReconnectAttempts(prev => prev + 1);
    
    try {
      // Clean up existing connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      // Wait a bit before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reinitialize WebRTC
      await initializeWebRTC();
      
      // Reset reconnect attempts on success
      setReconnectAttempts(0);
      console.log('Client WebRTC reconnection successful');
      
    } catch (error) {
      console.error('Client WebRTC reconnection failed:', error);
    }
  };

  const handleVideoFreeze = async () => {
    console.log('Handling video freeze for client...');
    
    // Try multiple recovery strategies
    try {
      // Strategy 1: Check if stream is still active
      if (remoteStreamRef.current && !remoteStreamRef.current.active) {
        console.log('Client remote stream is inactive, attempting to reconnect...');
        await reconnectWebRTC();
        return;
      }
      
      // Strategy 2: Try to restart video playback
      if (remoteVideoRef.current && remoteVideoRef.current.paused) {
        console.log('Client attempting to restart paused video...');
        try {
          await remoteVideoRef.current.play();
          console.log('Client video playback restarted successfully');
          return; // Success, no need for further recovery
        } catch (playError) {
          console.error('Client video play restart failed:', playError);
        }
      }
      
      // Strategy 3: Check if video element needs to be refreshed
      if (remoteVideoRef.current && remoteVideoRef.current.readyState < 2) {
        console.log('Client video not ready, attempting to refresh stream...');
        await refreshVideoStream();
        return;
      }
      
      // Strategy 4: Check if video track is still active
      if (remoteStreamRef.current) {
        const videoTrack = remoteStreamRef.current.getVideoTracks()[0];
        if (videoTrack && videoTrack.readyState === 'ended') {
          console.log('Client video track ended, attempting to reconnect...');
          await reconnectWebRTC();
          return;
        }
      }
      
      // Strategy 5: Restart ICE
      await restartIce();
      
      // Strategy 6: If ICE restart doesn't work, try renegotiation
      setTimeout(async () => {
        if (peerConnectionRef.current && signalingRef.current) {
          const iceState = peerConnectionRef.current.iceConnectionState;
          if (iceState === 'failed' || iceState === 'disconnected') {
            console.log('ICE restart failed, attempting renegotiation...');
            await attemptRenegotiation();
          }
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error handling video freeze:', error);
    }
  };

  const refreshVideoStream = async () => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      console.log('Client refreshing video stream...');
      
      try {
        // Don't clear the stream, just reassign it
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        
        // Try to play
        await remoteVideoRef.current.play();
        console.log('Client video stream refreshed successfully');
        
      } catch (error) {
        console.error('Client video stream refresh failed:', error);
        // If refresh fails, try full reconnection
        await reconnectWebRTC();
      }
    }
  };

  const handleIceFailure = async () => {
    console.log('Handling ICE failure for client...');
    
    try {
      // Try ICE restart first
      await restartIce();
      
      // If that fails, attempt full reconnection
      setTimeout(async () => {
        if (peerConnectionRef.current) {
          const iceState = peerConnectionRef.current.iceConnectionState;
          if (iceState === 'failed' || iceState === 'disconnected') {
            console.log('ICE restart failed, attempting full reconnection...');
            await reconnectWebRTC();
          }
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error handling ICE failure:', error);
    }
  };

  const handleVideoTrackEnd = async () => {
    console.log('Handling video track end for client...');
    
    try {
      // Try to restart the video track
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          // Replace the video track
          const sender = peerConnectionRef.current?.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          
          if (sender) {
            await sender.replaceTrack(videoTrack);
            console.log('Client video track replaced');
          }
        }
      }
      
      // If track replacement fails, try renegotiation
      setTimeout(async () => {
        await attemptRenegotiation();
      }, 2000);
      
    } catch (error) {
      console.error('Error handling video track end:', error);
    }
  };

  const attemptRenegotiation = async () => {
    if (peerConnectionRef.current && signalingRef.current) {
      try {
        console.log('Attempting renegotiation for client...');
        
        // Create a new offer to trigger renegotiation
        const offer = await peerConnectionRef.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        
        await peerConnectionRef.current.setLocalDescription(offer);
        signalingRef.current.sendOffer(offer, 'broadcast');
        console.log('Client sent renegotiation offer');
        
      } catch (error) {
        console.error('Error during renegotiation:', error);
        // If renegotiation fails, try full reconnection
        await reconnectWebRTC();
      }
    }
  };

  const restartIce = async () => {
    if (peerConnectionRef.current) {
      try {
        console.log('Restarting ICE for client...');
        
        // First try restartIce
        await peerConnectionRef.current.restartIce();
        console.log('ICE restart completed for client');
        
        // If that doesn't work, try creating a new offer
        setTimeout(async () => {
          if (peerConnectionRef.current && signalingRef.current) {
            const iceState = peerConnectionRef.current.iceConnectionState;
            if (iceState === 'failed' || iceState === 'disconnected') {
              console.log('ICE restart failed, creating new offer...');
              try {
                const offer = await peerConnectionRef.current.createOffer();
                await peerConnectionRef.current.setLocalDescription(offer);
                signalingRef.current.sendOffer(offer, 'broadcast');
                console.log('Client sent new offer after ICE restart');
              } catch (error) {
                console.error('Error creating new offer:', error);
              }
            }
          }
        }, 2000);
        
      } catch (error) {
        console.error('Error restarting ICE:', error);
      }
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
        console.log('Client switching microphone to:', microphoneId);
        
        // Only get audio stream to avoid affecting video
        const audioConstraints = {
          audio: { deviceId: { exact: microphoneId } }
        };
        
        const newAudioStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
        const newAudioTrack = newAudioStream.getAudioTracks()[0];
        
        if (newAudioTrack && peerConnectionRef.current) {
          // Find the audio sender
          const audioSender = peerConnectionRef.current.getSenders().find(s => 
          s.track && s.track.kind === 'audio'
        );
        
          if (audioSender) {
            console.log('Client replacing audio track...');
            await audioSender.replaceTrack(newAudioTrack);
            console.log('Client audio track replaced successfully');
            
            // Create new stream with existing video track and new audio track
            if (localStreamRef.current) {
              const videoTrack = localStreamRef.current.getVideoTracks()[0];
              const newStream = new MediaStream();
              
              // Add existing video track
              if (videoTrack) {
                newStream.addTrack(videoTrack);
              }
              
              // Add new audio track
              newStream.addTrack(newAudioTrack);
              
              // Update references
              localStreamRef.current = newStream;
              
              // Update local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
        }
        
              console.log('Client local stream recreated with new audio track');
              
              // Debug audio track status
              setTimeout(() => {
                const audioTrack = newStream.getAudioTracks()[0];
                if (audioTrack) {
                  console.log('Client new audio track status:', {
                    enabled: audioTrack.enabled,
                    muted: audioTrack.muted,
                    readyState: audioTrack.readyState,
                    label: audioTrack.label
                  });
                  
                  // Check if track is being sent through WebRTC
                  const audioSender = peerConnectionRef.current?.getSenders().find(s => 
                    s.track && s.track.kind === 'audio'
                  );
                  if (audioSender && audioSender.track) {
                    console.log('Client WebRTC audio sender track:', {
                      enabled: audioSender.track.enabled,
                      muted: audioSender.track.muted,
                      readyState: audioSender.track.readyState,
                      label: audioSender.track.label,
                      id: audioSender.track.id
                    });
                  }
                }
              }, 1000);
            }
          } else {
            console.error('Client audio sender not found');
          }
        }
        
        // Stop the temporary audio stream (we only needed the track)
        newAudioStream.getTracks().forEach(track => {
          if (track !== newAudioTrack) {
            track.stop();
          }
        });
        
      } catch (error) {
        console.error('Error switching microphone:', error);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!callState.isScreenSharing) {
      try {
        console.log('Client starting screen share...');
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = screenStream;
        }
        
        // Store original video track for restoration
        const originalVideoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (originalVideoTrack) {
          // Store reference to original track
          (peerConnectionRef.current as any).originalVideoTrack = originalVideoTrack;
        }
        
        // Add screen share track to peer connection
        const videoTrack = screenStream.getVideoTracks()[0];
        if (videoTrack && peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          
          if (sender) {
            console.log('Client replacing video track with screen share...');
            await sender.replaceTrack(videoTrack);
            console.log('Client screen share track replaced successfully');
          }
        }
        
        setCallState(prev => ({ ...prev, isScreenSharing: true }));
        
        // Handle screen share end
        screenStream.getVideoTracks()[0].onended = async () => {
          console.log('Client screen share ended, restoring video...');
          await restoreVideoStream();
        };
        
      } catch (error) {
        console.error('Error starting screen share:', error);
      }
    } else {
      console.log('Client stopping screen share...');
      await restoreVideoStream();
    }
  };

  const restoreVideoStream = async () => {
    try {
      console.log('Client restoring video stream...');
      
      if (peerConnectionRef.current) {
        const originalVideoTrack = (peerConnectionRef.current as any).originalVideoTrack;
        
        if (originalVideoTrack) {
          // Restore original video track
          const sender = peerConnectionRef.current.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          
          if (sender) {
            console.log('Client restoring original video track...');
            await sender.replaceTrack(originalVideoTrack);
            console.log('Client original video track restored successfully');
          }
          
          // Clear the stored reference
          delete (peerConnectionRef.current as any).originalVideoTrack;
        } else {
          // If no original track, get new camera stream
          console.log('Client no original track found, getting new camera stream...');
          const constraints = {
            video: { deviceId: { exact: callState.selectedCameraId } },
            audio: callState.isAudioOn ? { deviceId: { exact: callState.selectedMicrophoneId } } : false
          };
          
          const newStream = await navigator.mediaDevices.getUserMedia(constraints);
          const newVideoTrack = newStream.getVideoTracks()[0];
          
          if (newVideoTrack && peerConnectionRef.current) {
            const sender = peerConnectionRef.current.getSenders().find(s => 
              s.track && s.track.kind === 'video'
            );
            
            if (sender) {
              await sender.replaceTrack(newVideoTrack);
              console.log('Client new camera track restored successfully');
            }
          }
          
          // Update local stream reference
          if (localStreamRef.current) {
            // Stop old video track
            const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
            if (oldVideoTrack) {
              oldVideoTrack.stop();
            }
            
            // Update stream with new video track
            localStreamRef.current = newStream;
            
            // Update local video element
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = newStream;
            }
          }
        }
      }
      
      setCallState(prev => ({ ...prev, isScreenSharing: false }));
      console.log('Client video stream restored successfully');
      
    } catch (error) {
      console.error('Error restoring video stream:', error);
      setCallState(prev => ({ ...prev, isScreenSharing: false }));
    }
  };

  const toggleFullscreen = () => {
    setCallState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  };

  const handlePermissionGranted = () => {
    console.log('✅ Client media permissions granted');
    setMediaPermissionGranted(true);
    setShowPermissionCheck(false);
    
    // If signaling is already connected, initialize WebRTC now
    if (isSignalingConnected && !peerConnectionRef.current) {
      console.log('🔗 Permissions granted, signaling ready - initializing WebRTC immediately');
      setTimeout(() => initializeWebRTC(), 100);
    }
  };

  const handlePermissionDenied = () => {
    console.log('Client media permissions denied');
    setMediaPermissionGranted(false);
    // Don't hide permission check, let user try again
  };

  const joinCall = async () => {
    if (!mediaPermissionGranted) {
      setShowPermissionCheck(true);
      return;
    }
    
    setCallState(prev => ({ 
      ...prev, 
      isConnected: true, 
      isWaitingForAdvisor: false 
    }));
    
    console.log('🎯 Client joining call');
    console.log('📹 Client video element ref during join:', remoteVideoRef.current);
    
    // Initialize WebRTC if signaling is ready and we haven't initialized yet
    if (isSignalingConnected && !peerConnectionRef.current) {
      console.log('🚀 Client call joined - signaling ready, initializing WebRTC now');
      setTimeout(() => initializeWebRTC(), 200);
    } else {
      console.log('⏳ Client call joined - waiting for signaling connection before WebRTC init');
    }
    
    // Ensure video can play after user interaction
    if (remoteVideoRef.current) {
      try {
        await remoteVideoRef.current.play();
        console.log('✅ Client remote video started playing after user interaction');
      } catch (error) {
        console.log('⚠️ Client remote video play after interaction failed:', error);
      }
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
    if (newMessage.trim()) {
      console.log('Client sending message:', newMessage);
      console.log('Signaling connected:', isSignalingConnected);
      console.log('Signaling ref exists:', !!signalingRef.current);
      
      if (signalingRef.current && isSignalingConnected) {
        // Send message via signaling
        signalingRef.current.sendChatMessage(newMessage);
        console.log('Message sent via signaling');
        
        // Add to local chat immediately (don't wait for server echo)
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'לקוח',
          message: newMessage,
          timestamp: new Date()
        }]);
      } else {
        console.error('Cannot send message - signaling not connected');
      }
      
      setNewMessage('');
    }
  };

  // Debug function to check current state
  const debugCurrentState = () => {
    console.log('🔍 CLIENT DEBUG STATE:');
    console.log('📡 Signaling connected:', isSignalingConnected);
    console.log('🎥 Media permissions granted:', mediaPermissionGranted);
    console.log('🔗 Peer connection exists:', !!peerConnectionRef.current);
    console.log('📹 Local stream exists:', !!localStreamRef.current);
    console.log('📺 Remote stream exists:', !!remoteStreamRef.current);
    console.log('🎯 Call connected:', callState.isConnected);
    
    if (peerConnectionRef.current) {
      console.log('🌐 WebRTC State:', {
        connectionState: peerConnectionRef.current.connectionState,
        iceConnectionState: peerConnectionRef.current.iceConnectionState,
        iceGatheringState: peerConnectionRef.current.iceGatheringState,
        signalingState: peerConnectionRef.current.signalingState,
        hasLocalDescription: !!peerConnectionRef.current.localDescription,
        hasRemoteDescription: !!peerConnectionRef.current.remoteDescription
      });
    }
    
    if (localStreamRef.current) {
      console.log('🎵 Local stream tracks:', localStreamRef.current.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState,
        label: t.label
      })));
    }
  };

  // Add debug function to window for manual testing
  if (typeof window !== 'undefined') {
    (window as any).debugClientState = debugCurrentState;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  isSignalingConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm font-medium text-gray-300">
                  {callState.isConnected ? formatDuration(callState.callDuration) : 
                   isSignalingConnected ? 'ממתין ליועץ...' : 'מתחבר...'}
                </span>
                {connectionState !== 'new' && (
                  <span className="text-xs text-gray-400 ml-2">
                    ({connectionState})
                  </span>
                )}
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
            {showPermissionCheck ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="text-center text-white max-w-md">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">נדרשות הרשאות מצלמה ומיקרופון</h3>
                  <MediaPermissionCheck
                    onPermissionGranted={handlePermissionGranted}
                    onPermissionDenied={handlePermissionDenied}
                  />
                  {mediaError && (
                    <p className="text-sm text-red-400 mt-3">{mediaError}</p>
                  )}
                </div>
              </div>
            ) : callState.isWaitingForAdvisor ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">ממתין ליועץ...</h3>
                  <p className="text-gray-300 mb-6">היועץ יתחבר בקרוב לשיחה</p>
                  <div className="space-y-2">
                  <Button onClick={joinCall} className="bg-green-600 hover:bg-green-700">
                    <Phone className="w-4 h-4 mr-2" />
                    הצטרף לשיחה
                  </Button>
                  </div>
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
                      muted={true}
                      controls={false}
                      className="w-full h-full object-cover"
                      style={{ 
                        backgroundColor: '#000',
                        minHeight: '100%',
                        minWidth: '100%'
                      }}
                      onClick={async () => {
                        // Ensure video plays on user interaction
                        if (remoteVideoRef.current && remoteVideoRef.current.paused) {
                          try {
                            await remoteVideoRef.current.play();
                            console.log('Client video started playing after click');
                          } catch (error) {
                            console.error('Client video play after click failed:', error);
                          }
                        }
                      }}
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
              variant={showDebugConsole ? "default" : "outline"}
              size="lg"
              onClick={() => setShowDebugConsole(!showDebugConsole)}
              className="rounded-full w-12 h-12"
            >
              <Wifi className="w-5 h-5" />
            </Button>
            
            <Button
              variant="destructive"
              size="lg"
              onClick={endCall}
              className="rounded-full w-12 h-12"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>

            {/* Manual camera start fallback */}
            {!localStreamRef.current && callState.isConnected && (
              <Button
                variant="outline"
                size="lg"
                onClick={async () => {
                  try {
                    setMediaError(null);
                    const stream = await requestMediaAccess(
                      true,
                      callState.isAudioOn,
                      callState.selectedCameraId,
                      callState.selectedMicrophoneId,
                      'low'
                    );
                    localStreamRef.current = stream;
                    if (localVideoRef.current) {
                      localVideoRef.current.srcObject = stream;
                      try { await localVideoRef.current.play(); } catch {}
                    }
                    // Attach to peer connection if present
                    const pc = peerConnectionRef.current;
                    if (pc) {
                      const senders = pc.getSenders();
                      const newVideo = stream.getVideoTracks()[0];
                      if (newVideo) {
                        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                        if (videoSender) {
                          await videoSender.replaceTrack(newVideo);
                        } else {
                          pc.addTrack(newVideo, stream);
                        }
                      }
                      const newAudio = stream.getAudioTracks()[0];
                      if (newAudio) {
                        const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
                        if (audioSender) {
                          await audioSender.replaceTrack(newAudio);
                        } else {
                          pc.addTrack(newAudio, stream);
                        }
                      }
                    }
                  } catch (e: any) {
                    setMediaError(e?.message || 'Failed to start camera');
                  }
                }}
                className="rounded-full px-4"
              >
                הפעל מצלמה
              </Button>
            )}
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-80 border-l border-gray-700 bg-gray-800 flex flex-col">
          {/* Debug Console */}
          {showDebugConsole && (
            <div className="p-4 border-b border-gray-700">
              <WebRTCDebug
                peerConnection={peerConnectionRef.current}
                localStream={localStreamRef.current}
                remoteStream={remoteStreamRef.current}
                connectionState={connectionState}
                iceConnectionState={peerConnectionRef.current?.iceConnectionState || 'unknown'}
                iceGatheringState={peerConnectionRef.current?.iceGatheringState || 'unknown'}
                onRestartConnection={reconnectWebRTC}
              />
            </div>
          )}
          
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              צ'אט
            </h3>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-400 text-sm">
                {isSignalingConnected ? 
                  (advisorConnected ? 'אין הודעות עדיין' : 'ממתין ליועץ...') : 
                  'מתחבר...'}
              </div>
            )}
            {advisorConnected && (
              <div className="text-center text-green-400 text-sm mb-2">
                ✅ יועץ מחובר
              </div>
            )}
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
