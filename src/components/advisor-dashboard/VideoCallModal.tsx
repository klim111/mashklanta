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
  Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HTTPSignaling, SignalingMessage, createHTTPSignaling } from '@/lib/http-signaling';
import { getWebRTCConfiguration, getWebRTCConfigurationAsync, getMediaConstraints, createConnectionMonitor, requestMediaAccess } from '@/lib/webrtc-config';
import { MediaPermissionCheck } from '@/components/ui/media-permission-check';
import { WebRTCDebug } from '@/components/ui/webrtc-debug';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    status: string;
    progress: number;
    propertyValue?: number;
    downPayment?: number;
    income?: number;
    creditScore?: number;
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
  isScreenSharing: boolean;
  isFullscreen: boolean;
  callDuration: number;
  availableCameras: MediaDeviceInfo[];
  selectedCameraId: string;
  availableMicrophones: MediaDeviceInfo[];
  selectedMicrophoneId: string;
  shareLink: string;
  linkCopied: boolean;
}

export default function VideoCallModal({ isOpen, onClose, client, advisor }: VideoCallModalProps) {
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
    shareLink: '',
    linkCopied: false
  });

  const [showClientData, setShowClientData] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'mortgage' | 'documents'>('overview');
  const [chatMessages, setChatMessages] = useState<Array<{id: string, sender: string, message: string, timestamp: Date}>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [clientConnected, setClientConnected] = useState(false);
  const [mediaPermissionGranted, setMediaPermissionGranted] = useState(false);
  const [showPermissionCheck, setShowPermissionCheck] = useState(false);
  const [showDebugConsole, setShowDebugConsole] = useState(false);

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
  const isChangingAudioRef = useRef<boolean>(false);

  // Initialize devices and generate share link
  useEffect(() => {
    if (isOpen) {
      console.log('VideoCallModal opened, initializing...', { 
        client: client.name, 
        advisor: advisor.email,
        advisorName: advisor.name,
        isOpen 
      });
      initializeDevices();
      generateShareLink();
      setShowPermissionCheck(true);
    }
  }, [isOpen]);

  // Initialize signaling when share link is available
  useEffect(() => {
    if (isOpen && callState.shareLink) {
      console.log('Share link available, starting signaling initialization...');
      initializeSignaling();
    }
  }, [isOpen, callState.shareLink]);

  // Start connection monitoring when call is active
  useEffect(() => {
    if (callState.isConnected && peerConnectionRef.current) {
      console.log('Starting enhanced connection monitoring for advisor...');
      
      let lastVideoFrameTime = Date.now();
      let frozenVideoCount = 0;
      
      connectionMonitorRef.current = setInterval(() => {
        if (peerConnectionRef.current) {
          const connectionState = peerConnectionRef.current.connectionState;
          const iceConnectionState = peerConnectionRef.current.iceConnectionState;
          
          console.log('Advisor connection monitor:', { connectionState, iceConnectionState });
          
          // Enhanced video stream monitoring (skip during audio changes)
          if (remoteVideoRef.current && !isChangingAudioRef.current) {
            const video = remoteVideoRef.current;
            const currentTime = Date.now();
            
            // Check if video is actually receiving frames
            if (video.currentTime > 0) {
              const timeDiff = currentTime - lastVideoFrameTime;
              if (timeDiff > 5000) { // No frame updates for 5 seconds
                frozenVideoCount++;
                console.warn(`Advisor video appears frozen (${frozenVideoCount} consecutive checks)`);
                
                if (frozenVideoCount >= 2) {
                  console.warn('Advisor video confirmed frozen, attempting recovery...');
                  handleVideoFreeze();
                  frozenVideoCount = 0;
                }
              } else {
                frozenVideoCount = 0;
              }
              lastVideoFrameTime = currentTime;
            }
            
            // Check video element state
            if (video.paused || video.ended || video.readyState < 2) {
              console.warn('Advisor remote video not playing properly, attempting recovery...');
              handleVideoFreeze();
            }
          }
          
          // Check ICE connection states
          if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected') {
            console.warn('Advisor ICE connection issue detected, attempting recovery...');
            handleIceFailure();
          } else if (iceConnectionState === 'checking' && connectionState === 'connected') {
            // ICE is checking but connection is established - this might indicate issues
            console.log('Advisor ICE checking while connected - monitoring...');
          }
          
          // Check for video track issues
          const videoTrack = peerConnectionRef.current.getReceivers()
            .find(receiver => receiver.track && receiver.track.kind === 'video')?.track as MediaStreamTrack;
          
          if (videoTrack && videoTrack.readyState === 'ended') {
            console.warn('Advisor video track ended, attempting recovery...');
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

  // Handle call connection
  useEffect(() => {
    if (isOpen && callState.isConnected) {
      startCallDuration();
      initializeWebRTC();
    }

    return () => {
      if (callDurationRef.current) {
        clearInterval(callDurationRef.current);
      }
      cleanup();
    };
  }, [isOpen, callState.isConnected]);

  // Initialize WebRTC when signaling is connected
  useEffect(() => {
    if (isSignalingConnected && !peerConnectionRef.current) {
      console.log('Signaling connected, initializing WebRTC for advisor');
      initializeWebRTC();
    }
  }, [isSignalingConnected]);

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

  const generateShareLink = () => {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const shareLink = `${window.location.origin}/video-call/${callId}`;
    console.log('Generated share link:', shareLink);
    setCallState(prev => ({ ...prev, shareLink }));
  };

  const initializeSignaling = async () => {
    const callId = callState.shareLink.split('/').pop() || '';
    const userId = `advisor_${advisor.email}`;
    
    console.log('Initializing signaling for advisor:', { callId, userId, shareLink: callState.shareLink });
    
    const signaling = createHTTPSignaling(
      callId,
      userId,
      'advisor',
      handleSignalingMessage,
      setIsSignalingConnected
    );
    
    signalingRef.current = signaling;
    try {
      console.log('Attempting to connect advisor to WebSocket server...');
      await signaling.connect();
      console.log('✅ Advisor signaling connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect advisor signaling:', error);
    }
  };

  const handleSignalingMessage = (message: SignalingMessage) => {
    console.log('Advisor received signaling message:', message);
    
    switch (message.type) {
      case 'chat-message':
        console.log('Advisor received chat message:', message.data.message);
        // Only add message if it's not from the current advisor (prevent duplicates)
        if (!message.from.includes('advisor')) {
          setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: 'לקוח',
            message: message.data.message,
            timestamp: new Date(message.timestamp)
          }]);
        }
        break;
        
      case 'user-joined':
        if (!message.data.userId.includes('advisor')) {
          console.log('Client joined the call');
          setClientConnected(true);
        }
        break;
        
      case 'user-left':
        console.log('Client left the call');
        setClientConnected(false);
        break;
        
      case 'offer':
        console.log('Advisor received offer from:', message.from, message.data);
        handleOffer(message.data, message.from);
        break;
        
      case 'answer':
        console.log('Advisor received answer from:', message.from, message.data);
        handleAnswer(message.data, message.from);
        break;
        
      case 'ice-candidate':
        console.log('Advisor received ICE candidate from:', message.from, message.data);
        handleIceCandidate(message.data, message.from);
        break;
        
      case 'call-ended':
        endCall();
        break;
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, from: string) => {
    console.log('Advisor received offer from:', from);
    if (peerConnectionRef.current) {
      try {
        await peerConnectionRef.current.setRemoteDescription(offer);
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        
        signalingRef.current?.sendAnswer(answer, from);
        console.log('Advisor sent answer to:', from);
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit, from: string) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(answer);
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit, from: string) => {
    console.log('Advisor received ICE candidate from:', from);
    if (peerConnectionRef.current) {
      try {
        await peerConnectionRef.current.addIceCandidate(candidate);
        console.log('Advisor added ICE candidate');
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(callState.shareLink);
      setCallState(prev => ({ ...prev, linkCopied: true }));
      setTimeout(() => {
        setCallState(prev => ({ ...prev, linkCopied: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const startCallDuration = () => {
    callDurationRef.current = setInterval(() => {
      setCallState(prev => ({ ...prev, callDuration: prev.callDuration + 1 }));
    }, 1000);
  };

  const initializeWebRTC = async () => {
    try {
      // Request media access with enhanced error handling
      console.log('Advisor requesting media access...');
      const stream = await requestMediaAccess(
        callState.isVideoOn,
        callState.isAudioOn,
        callState.selectedCameraId,
        callState.selectedMicrophoneId
      );
      
      console.log('Advisor got user media stream:', stream);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Ensure video plays
        try {
          await localVideoRef.current.play();
          console.log('Advisor local video started playing');
        } catch (playError) {
          console.error('Advisor local video play failed:', playError);
        }
      }

      // Initialize peer connection with optimized configuration (supports REST creds)
      const configuration = await getWebRTCConfigurationAsync();
      console.log('Advisor creating peer connection with configuration:', configuration);
      peerConnectionRef.current = new RTCPeerConnection(configuration);

      // Negotiation guard to avoid parallel negotiations
      let isNegotiating = false;

      const negotiateNow = async () => {
        if (!peerConnectionRef.current || !signalingRef.current) return;
        if (isNegotiating) return;
        isNegotiating = true;
        try {
          console.log('Advisor negotiateNow: creating offer...');
          const offer = await peerConnectionRef.current.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await peerConnectionRef.current.setLocalDescription(offer);
          signalingRef.current.sendOffer(offer, 'broadcast');
          console.log('Advisor sent offer from negotiateNow');
        } catch (err) {
          console.error('Advisor negotiateNow error:', err);
        } finally {
          isNegotiating = false;
        }
      };

      // Advisor responds to client offers - disable auto negotiation to prevent conflicts
      peerConnectionRef.current.onnegotiationneeded = async () => {
        // Advisor waits for client to initiate - only negotiate if we have no remote description
        if (!peerConnectionRef.current || !signalingRef.current) return;
        if (isNegotiating) return;
        
        // Skip auto-negotiation if we already have a connection established
        if (peerConnectionRef.current.remoteDescription) {
          console.log('Advisor already has remote description, skipping auto-negotiation');
          return;
        }
        
        // Only negotiate if client hasn't initiated after a delay
        setTimeout(async () => {
          if (peerConnectionRef.current && !peerConnectionRef.current.remoteDescription && !isNegotiating) {
            isNegotiating = true;
            try {
              console.log('Advisor fallback negotiation: client did not initiate, creating offer...');
              const offer = await peerConnectionRef.current.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
              });
              await peerConnectionRef.current.setLocalDescription(offer);
              signalingRef.current?.sendOffer(offer, 'broadcast');
              console.log('Advisor sent fallback offer');
            } catch (err) {
              console.error('Advisor fallback negotiation error:', err);
            } finally {
              isNegotiating = false;
            }
          }
        }, 5000); // Wait 5 seconds for client to initiate
      };

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current?.addTrack(track, stream);
      });

      // Fallback: if no localDescription shortly after adding tracks, trigger negotiation
      setTimeout(() => {
        if (peerConnectionRef.current && !peerConnectionRef.current.localDescription) {
          console.log('Advisor fallback negotiation trigger');
          negotiateNow();
        }
      }, 200);
      // Handle remote stream with enhanced monitoring
      peerConnectionRef.current.ontrack = (event) => {
        console.log('Advisor received remote track:', event.track.kind);
        const [remoteStream] = event.streams;
        remoteStreamRef.current = remoteStream;
        
        if (remoteVideoRef.current) {
          console.log('Advisor setting remote video stream');
          remoteVideoRef.current.srcObject = remoteStream;
          
          // Ensure remote video plays
          remoteVideoRef.current.addEventListener('loadedmetadata', async () => {
            try {
              await remoteVideoRef.current?.play();
              console.log('Advisor remote video started playing');
            } catch (playError) {
              console.error('Advisor remote video play failed:', playError);
            }
          });
          
          // Enhanced event listeners for video monitoring
          remoteVideoRef.current.addEventListener('loadstart', () => {
            console.log('Advisor remote video loadstart');
          });
          
          remoteVideoRef.current.addEventListener('loadeddata', () => {
            console.log('Advisor remote video loadeddata');
          });
          
          remoteVideoRef.current.addEventListener('canplay', () => {
            console.log('Advisor remote video canplay');
          });
          
          remoteVideoRef.current.addEventListener('playing', () => {
            console.log('Advisor remote video playing');
          });
          
          remoteVideoRef.current.addEventListener('waiting', () => {
            console.warn('Advisor remote video waiting for data');
          });
          
          remoteVideoRef.current.addEventListener('stalled', () => {
            console.warn('Advisor remote video stalled');
            setTimeout(() => handleVideoFreeze(), 2000);
          });
          
          remoteVideoRef.current.addEventListener('error', (e) => {
            console.error('Advisor remote video error:', e);
            setTimeout(() => handleVideoFreeze(), 1000);
          });
          
          remoteVideoRef.current.addEventListener('pause', () => {
            console.warn('Advisor remote video paused, attempting recovery...');
            setTimeout(() => handleVideoFreeze(), 1000);
          });
          
          remoteVideoRef.current.addEventListener('ended', () => {
            console.warn('Advisor remote video ended, attempting recovery...');
            setTimeout(() => handleVideoTrackEnd(), 1000);
          });
          
          // Monitor video track changes
          const videoTrack = remoteStream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.addEventListener('ended', () => {
              console.warn('Advisor remote video track ended');
              handleVideoTrackEnd();
            });
            
            videoTrack.addEventListener('mute', () => {
              console.warn('Advisor remote video track muted');
            });
            
            videoTrack.addEventListener('unmute', () => {
              console.log('Advisor remote video track unmuted');
            });
          }
        }
      };

      // Set up connection monitoring
      createConnectionMonitor(
        peerConnectionRef.current,
        (state) => {
          console.log('Advisor connection state:', state);
          setConnectionState(state);
        },
        (state) => {
          console.log('Advisor ICE connection state:', state);
          if (state === 'failed' || state === 'disconnected') {
            console.warn('Advisor ICE connection failed/disconnected, attempting to restart...');
            restartIce();
          }
        }
      );

      // Handle ICE candidates with detailed logging
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Advisor ICE candidate:', {
            type: event.candidate.type,
            protocol: event.candidate.protocol,
            address: event.candidate.address,
            port: event.candidate.port,
            candidate: event.candidate.candidate
          });
          if (signalingRef.current) {
            signalingRef.current.sendIceCandidate(event.candidate, 'broadcast');
          }
        } else {
          console.log('Advisor ICE gathering complete');
          // If ICE gathering completes but we still don't have connection, try restart
          setTimeout(() => {
            const pc = peerConnectionRef.current;
            if (pc && (pc.iceConnectionState === 'new' || pc.iceConnectionState === 'checking')) {
              console.log('Advisor ICE gathering complete but no connection, attempting restart...');
              restartIce();
            }
          }, 3000);
        }
      };

      console.log('WebRTC initialized for advisor');

    } catch (error) {
      console.error('Error initializing WebRTC:', error);
    }
  };

  const reconnectWebRTC = async () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached for advisor');
      return;
    }
    
    console.log(`Advisor attempting WebRTC reconnection (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
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
      console.log('Advisor WebRTC reconnection successful');
      
    } catch (error) {
      console.error('Advisor WebRTC reconnection failed:', error);
    }
  };

  const handleVideoFreeze = async () => {
    console.log('Handling video freeze for advisor...');
    
    // Try multiple recovery strategies
    try {
      // Strategy 1: Restart ICE
      await restartIce();
      
      // Strategy 2: If ICE restart doesn't work, try renegotiation
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

  const handleIceFailure = async () => {
    console.log('Handling ICE failure for advisor...');
    
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
    console.log('Handling video track end for advisor...');
    
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
            console.log('Advisor video track replaced');
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
        console.log('Attempting renegotiation for advisor...');
        
        // Create a new offer to trigger renegotiation
        const offer = await peerConnectionRef.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        
        await peerConnectionRef.current.setLocalDescription(offer);
        signalingRef.current.sendOffer(offer, 'broadcast');
        console.log('Advisor sent renegotiation offer');
        
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
        console.log('Restarting ICE for advisor...');
        
        // First try restartIce
        await peerConnectionRef.current.restartIce();
        console.log('ICE restart completed for advisor');
        
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
                console.log('Advisor sent new offer after ICE restart');
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
        console.log('Advisor switching microphone to:', microphoneId);
        
        // Set flag to prevent video monitoring during audio change
        isChangingAudioRef.current = true;
        
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
            console.log('Advisor replacing audio track...');
            await audioSender.replaceTrack(newAudioTrack);
            console.log('Advisor audio track replaced successfully');
            
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
              
              console.log('Advisor local stream recreated with new audio track');
              
              // Debug audio track status
              setTimeout(() => {
                const audioTrack = newStream.getAudioTracks()[0];
                if (audioTrack) {
                  console.log('Advisor new audio track status:', {
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
                    console.log('Advisor WebRTC audio sender track:', {
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
            console.error('Advisor audio sender not found');
          }
        }
        
        // Stop the temporary audio stream (we only needed the track)
        newAudioStream.getTracks().forEach(track => {
          if (track !== newAudioTrack) {
            track.stop();
          }
        });
        
        // Clear flag after audio change is complete
        setTimeout(() => {
          isChangingAudioRef.current = false;
          console.log('Advisor audio change completed, video monitoring resumed');
        }, 2000);
        
      } catch (error) {
        console.error('Error switching microphone:', error);
        isChangingAudioRef.current = false; // Clear flag on error
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!callState.isScreenSharing) {
      try {
        console.log('Advisor starting screen share...');
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
            console.log('Advisor replacing video track with screen share...');
            await sender.replaceTrack(videoTrack);
            console.log('Advisor screen share track replaced successfully');
          }
        }
        
        setCallState(prev => ({ ...prev, isScreenSharing: true }));
        
        // Handle screen share end
        screenStream.getVideoTracks()[0].onended = async () => {
          console.log('Advisor screen share ended, restoring video...');
          await restoreVideoStream();
        };
        
      } catch (error) {
        console.error('Error starting screen share:', error);
      }
    } else {
      console.log('Advisor stopping screen share...');
      await restoreVideoStream();
    }
  };

  const restoreVideoStream = async () => {
    try {
      console.log('Advisor restoring video stream...');
      
      if (peerConnectionRef.current) {
        const originalVideoTrack = (peerConnectionRef.current as any).originalVideoTrack;
        
        if (originalVideoTrack) {
          // Restore original video track
          const sender = peerConnectionRef.current.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          
          if (sender) {
            console.log('Advisor restoring original video track...');
            await sender.replaceTrack(originalVideoTrack);
            console.log('Advisor original video track restored successfully');
          }
          
          // Clear the stored reference
          delete (peerConnectionRef.current as any).originalVideoTrack;
        } else {
          // If no original track, get new camera stream
          console.log('Advisor no original track found, getting new camera stream...');
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
              console.log('Advisor new camera track restored successfully');
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
      console.log('Advisor video stream restored successfully');
      
    } catch (error) {
      console.error('Error restoring video stream:', error);
      setCallState(prev => ({ ...prev, isScreenSharing: false }));
    }
  };

  const toggleFullscreen = () => {
    setCallState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  };

  const handlePermissionGranted = () => {
    console.log('Media permissions granted');
    setMediaPermissionGranted(true);
    setShowPermissionCheck(false);
  };

  const handlePermissionDenied = () => {
    console.log('Media permissions denied');
    setMediaPermissionGranted(false);
    // Don't hide permission check, let user try again
  };

  const startCall = async () => {
    if (!mediaPermissionGranted) {
      setShowPermissionCheck(true);
      return;
    }
    
    setCallState(prev => ({ ...prev, isConnected: true }));
    
    // Initialize WebRTC connection when call starts
    if (signalingRef.current && peerConnectionRef.current) {
      try {
        // Advisor waits for client to join and create offer
        console.log('Advisor waiting for client to join and create offer');
      } catch (error) {
        console.error('Error starting call:', error);
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
    onClose();
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      console.log('Advisor sending message:', newMessage);
      console.log('Signaling connected:', isSignalingConnected);
      console.log('Signaling ref exists:', !!signalingRef.current);
      
      if (signalingRef.current && isSignalingConnected) {
        // Send message via signaling
        signalingRef.current.sendChatMessage(newMessage);
        console.log('Message sent via signaling');
        
        // Add to local chat immediately (don't wait for server echo)
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: advisor.name,
          message: newMessage,
          timestamp: new Date()
        }]);
      } else {
        console.error('Cannot send message - signaling not connected');
      }
      
      setNewMessage('');
    }
  };

  const clientDataTabs = [
    { id: 'overview', label: 'סקירה כללית', icon: Users },
    { id: 'mortgage', label: 'משכנתא', icon: Calculator },
    { id: 'documents', label: 'מסמכים', icon: FileText }
  ];

  if (!isOpen) {
    console.log('VideoCallModal is closed');
    return null;
  }
  
  console.log('VideoCallModal is rendering', { 
    isSignalingConnected, 
    connectionState,
    shareLink: callState.shareLink 
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`bg-white rounded-lg shadow-2xl ${
            callState.isFullscreen ? 'w-full h-full max-w-none max-h-none' : 'w-full max-w-6xl h-[90vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  isSignalingConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm font-medium text-gray-600">
                  {callState.isConnected ? formatDuration(callState.callDuration) : 
                   isSignalingConnected ? 'ממתין ללקוח...' : 'מתחבר...'}
                </span>
                {connectionState !== 'new' && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({connectionState})
                  </span>
                )}
              </div>
              <div className="h-4 w-px bg-gray-300"></div>
              <div>
                <h2 className="font-semibold text-gray-900">שיחה עם {client.name}</h2>
                <p className="text-sm text-gray-600">{client.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Share Link */}
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1 border">
                <input
                  type="text"
                  value={callState.shareLink}
                  readOnly
                  className="text-xs bg-transparent border-none outline-none w-48"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyShareLink}
                  className="p-1 h-6 w-6"
                >
                  {callState.linkCopied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="p-2"
              >
                {callState.isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex h-[calc(100%-80px)]">
            {/* Main Video Area */}
            <div className="flex-1 flex flex-col">
              {/* Video Container */}
              <div className="flex-1 relative bg-gray-900 rounded-lg m-4">
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
                    </div>
                  </div>
                ) : !callState.isConnected ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Phone className="w-10 h-10" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">מתחבר ל{client.name}...</h3>
                      <p className="text-gray-300 mb-6">השיחה תתחיל ברגע שהלקוח יתחבר</p>
                      <Button onClick={startCall} className="bg-green-600 hover:bg-green-700">
                        <Phone className="w-4 h-4 mr-2" />
                        התחל שיחה
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Remote Video */}
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      muted={false}
                      controls={false}
                      className="w-full h-full object-cover"
                      style={{ 
                        backgroundColor: '#000',
                        minHeight: '100%',
                        minWidth: '100%'
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
                          שיתוף מסך - {advisor.name}
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
                <div className="flex items-center justify-center gap-4 p-2 bg-gray-100 border-t">
                  {/* Camera Selection */}
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-gray-600" />
                    <select
                      value={callState.selectedCameraId}
                      onChange={(e) => switchCamera(e.target.value)}
                      className="text-xs border rounded px-2 py-1 bg-white"
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
                    <Mic className="w-4 h-4 text-gray-600" />
                    <select
                      value={callState.selectedMicrophoneId}
                      onChange={(e) => switchMicrophone(e.target.value)}
                      className="text-xs border rounded px-2 py-1 bg-white"
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
              <div className="flex items-center justify-center gap-4 p-4 bg-gray-50">
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
                  variant="outline"
                  size="lg"
                  onClick={() => setShowClientData(!showClientData)}
                  className="rounded-full w-12 h-12"
                >
                  <Share2 className="w-5 h-5" />
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
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-80 border-l bg-gray-50 flex flex-col">
              {/* Debug Console */}
              {showDebugConsole && (
                <div className="p-4 border-b">
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
              
              {/* Client Data Panel */}
              {showClientData && (
                <div className="p-4 border-b">
                  <h3 className="font-semibold mb-3">נתוני לקוח</h3>
                  
                  {/* Tabs */}
                  <div className="flex border-b mb-4">
                    {clientDataTabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
                            activeTab === tab.id
                              ? 'text-blue-600 border-b-2 border-blue-600'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab Content */}
                  <div className="space-y-3">
                    {activeTab === 'overview' && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">סטטוס:</span>
                          <Badge variant="secondary">{client.status}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">התקדמות:</span>
                          <span className="text-sm font-medium">{client.progress}%</span>
                        </div>
                        {client.income && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">הכנסה:</span>
                            <span className="text-sm font-medium">₪{client.income.toLocaleString()}</span>
                          </div>
                        )}
                        {client.creditScore && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">ציון אשראי:</span>
                            <span className="text-sm font-medium">{client.creditScore}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {activeTab === 'mortgage' && (
                      <>
                        {client.propertyValue && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">ערך נכס:</span>
                            <span className="text-sm font-medium">₪{client.propertyValue.toLocaleString()}</span>
                          </div>
                        )}
                        {client.downPayment && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">מקדמה:</span>
                            <span className="text-sm font-medium">₪{client.downPayment.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="mt-3">
                          <Button size="sm" className="w-full">
                            <Calculator className="w-4 h-4 mr-2" />
                            פתח מחשבון
                          </Button>
                        </div>
                      </>
                    )}
                    
                    {activeTab === 'documents' && (
                      <div className="text-center py-4 text-gray-500">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">אין מסמכים להצגה</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Chat */}
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    צ'אט
                  </h3>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-gray-500 text-sm">
                      {isSignalingConnected ? 
                        (clientConnected ? 'אין הודעות עדיין' : 'ממתין ללקוח...') : 
                        'מתחבר...'}
                    </div>
                  )}
                  {clientConnected && (
                    <div className="text-center text-green-600 text-sm mb-2">
                      ✅ לקוח מחובר
                    </div>
                  )}
                  {chatMessages.map((message) => (
                    <div key={message.id} className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-blue-600">{message.sender}</span>
                        <span className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2 text-sm">
                        {message.message}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="הקלד הודעה..."
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
