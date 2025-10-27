// WebRTC configuration optimized for Vercel deployment
export const getWebRTCConfiguration = (): RTCConfiguration => {
  return {
    iceServers: [
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
      
      // TURN servers (if available - for NAT traversal)
      // Note: In production, you should use your own TURN servers
      // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' }
    ],
    
    // Optimized settings for Vercel/serverless environment
    iceCandidatePoolSize: 10, // Reduced from 20 for better performance
    bundlePolicy: 'max-bundle' as RTCBundlePolicy,
    rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
    iceTransportPolicy: 'all' as RTCIceTransportPolicy
  };
};

// Media constraints optimized for different connection types
export const getMediaConstraints = (isVideoOn: boolean, isAudioOn: boolean, deviceId?: string) => {
  return {
    video: isVideoOn ? {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 },
      // Optimize for serverless environment
      facingMode: 'user',
    } : false,
    audio: isAudioOn ? {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      // Additional audio optimizations
      sampleRate: 48000,
      channelCount: 2,
    } : false
  };
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
