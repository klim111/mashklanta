// WebRTC configuration optimized for Vercel deployment
export const getWebRTCConfiguration = (): RTCConfiguration => {
  // Read TURN configuration from env (exposed to client)
  const turnUrl = (process.env.NEXT_PUBLIC_TURN_URL || '').trim();
  const turnUsername = (process.env.NEXT_PUBLIC_TURN_USERNAME || '').trim();
  const turnCredential = (process.env.NEXT_PUBLIC_TURN_CREDENTIAL || '').trim();
  const forceRelay = (process.env.NEXT_PUBLIC_FORCE_TURN || '').toLowerCase() === 'true';

  const iceServers: RTCIceServer[] = [
      // Google STUN servers (most reliable)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      
      // Additional STUN servers for better connectivity
      { urls: 'stun:stun.ekiga.net' },
      { urls: 'stun:stun.ideasip.com' },
      { urls: 'stun:stun.schlund.de' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
  ];

  // Append TURN if provided
  if (turnUrl) {
    const turnServer: RTCIceServer = { urls: turnUrl } as RTCIceServer;
    if (turnUsername) turnServer.username = turnUsername;
    if (turnCredential) turnServer.credential = turnCredential as any;
    iceServers.push(turnServer);
    console.log('TURN server configured:', {
      url: turnUrl.replace(/:(?:[^:@]*)@/, ':***@'),
      hasUsername: !!turnUsername,
      hasCredential: !!turnCredential,
      forceRelay
    });
  } else {
    console.warn('No TURN server configured. Peer-to-peer may fail behind strict NATs.');
  }

  return {
    iceServers,
    // Optimized settings for Vercel/serverless environment
    iceCandidatePoolSize: 10, // Reduced from 20 for better performance
    bundlePolicy: 'max-bundle' as RTCBundlePolicy,
    rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
    iceTransportPolicy: (forceRelay ? 'relay' : 'all') as RTCIceTransportPolicy
  };
};

// Media constraints optimized for different connection types
export const getMediaConstraints = (
  isVideoOn: boolean, 
  isAudioOn: boolean, 
  videoDeviceId?: string, 
  audioDeviceId?: string
) => {
  const constraints: MediaStreamConstraints = {};
  
  if (isVideoOn) {
    constraints.video = {
      deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 },
      facingMode: 'user',
    };
  } else {
    constraints.video = false;
  }
  
  if (isAudioOn) {
    constraints.audio = {
      deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
  } else {
    constraints.audio = false;
  }
  
  return constraints;
};

// Connection monitoring utilities
export const createConnectionMonitor = (
  peerConnection: RTCPeerConnection,
  onConnectionChange: (state: string) => void,
  onIceConnectionChange: (state: string) => void
) => {
  // Monitor connection state
  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection.connectionState;
    console.log('WebRTC connection state:', state);
    onConnectionChange(state);
    
    // Handle connection failures
    if (state === 'failed' || state === 'disconnected') {
      console.warn('WebRTC connection failed/disconnected');
    }
  };

  // Monitor ICE connection state
  peerConnection.oniceconnectionstatechange = () => {
    const state = peerConnection.iceConnectionState;
    console.log('WebRTC ICE connection state:', state);
    onIceConnectionChange(state);
    
    // Handle ICE connection failures
    if (state === 'failed' || state === 'disconnected') {
      console.warn('WebRTC ICE connection failed/disconnected');
    }
  };

  // Monitor ICE gathering state
  peerConnection.onicegatheringstatechange = () => {
    const state = peerConnection.iceGatheringState;
    console.log('WebRTC ICE gathering state:', state);
  };

  // Monitor ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('WebRTC ICE candidate gathered:', event.candidate.type);
    } else {
      console.log('WebRTC ICE gathering complete');
    }
  };
};

// Utility to check WebRTC support
export const checkWebRTCSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return !!(
    window.RTCPeerConnection &&
    window.RTCSessionDescription &&
    window.RTCIceCandidate &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
};

// Utility to get device information
export const getDeviceInfo = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      cameras: devices.filter(device => device.kind === 'videoinput'),
      microphones: devices.filter(device => device.kind === 'audioinput'),
      speakers: devices.filter(device => device.kind === 'audiooutput'),
    };
  } catch (error) {
    console.error('Error getting device info:', error);
    return {
      cameras: [],
      microphones: [],
      speakers: [],
    };
  }
};

// Utility to test media access
export const testMediaAccess = async (constraints: MediaStreamConstraints): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Media access test failed:', error);
    return false;
  }
};

// Enhanced media access with better error handling
export const requestMediaAccess = async (
  isVideoOn: boolean,
  isAudioOn: boolean,
  videoDeviceId?: string,
  audioDeviceId?: string
): Promise<MediaStream> => {
  try {
    // First, try with both video and audio
    const constraints = getMediaConstraints(isVideoOn, isAudioOn, videoDeviceId, audioDeviceId);
    console.log('Requesting media access with constraints:', constraints);
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('Media access granted, stream tracks:', stream.getTracks().map(t => ({
      kind: t.kind,
      enabled: t.enabled,
      readyState: t.readyState,
      label: t.label
    })));
    
    return stream;
  } catch (error) {
    console.error('Media access failed:', error);
    
    // If both video and audio fail, try video only
    if (isVideoOn && isAudioOn) {
      console.log('Trying video only...');
      try {
        const videoConstraints = getMediaConstraints(true, false, videoDeviceId);
        const stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
        console.log('Video-only access granted');
        return stream;
      } catch (videoError) {
        console.error('Video-only access failed:', videoError);
      }
    }
    
    // If video fails, try audio only
    if (isAudioOn) {
      console.log('Trying audio only...');
      try {
        const audioConstraints = getMediaConstraints(false, true, undefined, audioDeviceId);
        const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
        console.log('Audio-only access granted');
        return stream;
      } catch (audioError) {
        console.error('Audio-only access failed:', audioError);
      }
    }
    
    // If all else fails, try basic constraints
    console.log('Trying basic constraints...');
    const basicConstraints = getMediaConstraints(isVideoOn, isAudioOn);
    return await navigator.mediaDevices.getUserMedia(basicConstraints);
  }
};
