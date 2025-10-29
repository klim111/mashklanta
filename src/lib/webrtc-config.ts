// WebRTC configuration optimized for production with custom TURN server
export const getWebRTCConfiguration = (): RTCConfiguration => {
  // Read TURN configuration from env (exposed to client)
  const turnUrl = (process.env.NEXT_PUBLIC_TURN_URL || '').trim();
  const turnsUrl = (process.env.NEXT_PUBLIC_TURNS_URL || '').trim();
  const turnUsername = (process.env.NEXT_PUBLIC_TURN_USERNAME || '').trim();
  const turnCredential = (process.env.NEXT_PUBLIC_TURN_CREDENTIAL || '').trim();
  const forceRelay = (process.env.NEXT_PUBLIC_FORCE_TURN || '').toLowerCase() === 'true';

  const iceServers: RTCIceServer[] = [
      // Primary STUN servers (Google - most reliable)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      
      // Backup STUN servers for redundancy
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
  ];

  // Add custom TURN server (highest priority)
  if (turnUrl && turnUsername && turnCredential) {
    // UDP TURN server
    const turnServer: RTCIceServer = { 
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
      credentialType: 'password'
    };
    iceServers.unshift(turnServer); // Add at beginning for priority
    
    // TLS TURN server (if available)
    if (turnsUrl) {
      const turnsServer: RTCIceServer = { 
        urls: turnsUrl,
        username: turnUsername,
        credential: turnCredential,
        credentialType: 'password'
      };
      iceServers.unshift(turnsServer); // Even higher priority
    }
    
    console.log('Custom TURN server configured:', {
      turnUrl: turnUrl.replace(/:\/\/.*@/, '://***@'),
      turnsUrl: turnsUrl ? turnsUrl.replace(/:\/\/.*@/, '://***@') : 'not configured',
      hasCredentials: !!turnUsername && !!turnCredential,
      forceRelay,
      totalServers: iceServers.length
    });
  } else {
    console.warn('Custom TURN server not fully configured. WebRTC may fail behind strict NATs/firewalls.');
    console.log('Required env vars: NEXT_PUBLIC_TURN_URL, NEXT_PUBLIC_TURN_USERNAME, NEXT_PUBLIC_TURN_CREDENTIAL');
  }

  return {
    iceServers,
    // Production-optimized settings
    iceCandidatePoolSize: forceRelay ? 0 : 4, // Pre-gather candidates for faster connection
    bundlePolicy: 'max-bundle' as RTCBundlePolicy, // Bundle all media on single transport
    rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy, // Multiplex RTP and RTCP
    iceTransportPolicy: (forceRelay ? 'relay' : 'all') as RTCIceTransportPolicy,
    
    // Additional optimizations for low latency
    sdpSemantics: 'unified-plan' as RTCSdpSemantics,
    
    // Certificate configuration for faster DTLS handshake
    certificates: undefined // Let browser generate optimized certificates
  };
};

// Media constraints optimized for low latency and quality
export const getMediaConstraints = (
  isVideoOn: boolean, 
  isAudioOn: boolean, 
  videoDeviceId?: string, 
  audioDeviceId?: string,
  quality: 'low' | 'medium' | 'high' = 'medium'
) => {
  const constraints: MediaStreamConstraints = {};
  
  if (isVideoOn) {
    // Adaptive video quality based on connection
    const videoConstraints = {
      deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
      facingMode: 'user',
      // Quality-specific settings
      ...(quality === 'low' && {
        width: { ideal: 640, max: 854 },
        height: { ideal: 360, max: 480 },
        frameRate: { ideal: 15, max: 24 }
      }),
      ...(quality === 'medium' && {
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        frameRate: { ideal: 24, max: 30 }
      }),
      ...(quality === 'high' && {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 30, max: 30 }
      })
    };
    
    constraints.video = videoConstraints;
  } else {
    constraints.video = false;
  }
  
  if (isAudioOn) {
    // Enhanced audio constraints for professional calls
    constraints.audio = {
      deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined,
      
      // Core audio processing
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      
      // Advanced audio settings for better quality
      sampleRate: { ideal: 48000 }, // Professional audio quality
      sampleSize: { ideal: 16 },
      channelCount: { ideal: 1 }, // Mono for voice calls (better compression)
      
      // Latency optimization
      latency: { ideal: 0.01 }, // 10ms target latency
      
      // Additional constraints for better voice processing
      googEchoCancellation: true,
      googAutoGainControl: true,
      googNoiseSuppression: true,
      googHighpassFilter: true,
      googTypingNoiseDetection: true,
      googAudioMirroring: false
    } as any; // Cast to any to support experimental properties
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

// Enhanced media access with adaptive quality and better error handling
export const requestMediaAccess = async (
  isVideoOn: boolean,
  isAudioOn: boolean,
  videoDeviceId?: string,
  audioDeviceId?: string,
  quality: 'low' | 'medium' | 'high' = 'medium'
): Promise<MediaStream> => {
  try {
    // First, try with requested quality
    const constraints = getMediaConstraints(isVideoOn, isAudioOn, videoDeviceId, audioDeviceId, quality);
    console.log(`Requesting media access with ${quality} quality:`, constraints);
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('Media access granted, stream tracks:', stream.getTracks().map(t => ({
      kind: t.kind,
      enabled: t.enabled,
      readyState: t.readyState,
      label: t.label,
      settings: t.getSettings ? t.getSettings() : 'not available'
    })));
    
    return stream;
  } catch (error) {
    console.error(`Media access failed with ${quality} quality:`, error);
    
    // Try lower quality if high/medium failed
    if (quality === 'high') {
      console.log('Retrying with medium quality...');
      return requestMediaAccess(isVideoOn, isAudioOn, videoDeviceId, audioDeviceId, 'medium');
    } else if (quality === 'medium') {
      console.log('Retrying with low quality...');
      return requestMediaAccess(isVideoOn, isAudioOn, videoDeviceId, audioDeviceId, 'low');
    }
    
    // If both video and audio fail, try video only
    if (isVideoOn && isAudioOn) {
      console.log('Trying video only...');
      try {
        const videoConstraints = getMediaConstraints(true, false, videoDeviceId, undefined, 'low');
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
        const audioConstraints = getMediaConstraints(false, true, undefined, audioDeviceId, 'low');
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

// Advanced connection quality monitoring
export const createAdvancedConnectionMonitor = (
  peerConnection: RTCPeerConnection,
  onStatsUpdate: (stats: any) => void,
  onQualityChange: (quality: 'excellent' | 'good' | 'poor' | 'disconnected') => void
) => {
  let monitoringInterval: NodeJS.Timeout;
  let lastStats: any = {};
  
  const startMonitoring = () => {
    monitoringInterval = setInterval(async () => {
      try {
        const stats = await peerConnection.getStats();
        const statsReport = parseRTCStats(stats);
        
        // Calculate quality metrics
        const quality = calculateConnectionQuality(statsReport, lastStats);
        
        // Update callbacks
        onStatsUpdate(statsReport);
        onQualityChange(quality);
        
        lastStats = statsReport;
      } catch (error) {
        console.error('Error monitoring connection stats:', error);
        onQualityChange('disconnected');
      }
    }, 2000); // Check every 2 seconds
  };
  
  const stopMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
    }
  };
  
  // Start monitoring automatically
  startMonitoring();
  
  return { startMonitoring, stopMonitoring };
};

// Parse RTC statistics into readable format
const parseRTCStats = (stats: RTCStatsReport) => {
  const result: any = {
    video: { inbound: {}, outbound: {} },
    audio: { inbound: {}, outbound: {} },
    connection: {},
    candidates: []
  };
  
  stats.forEach((report) => {
    switch (report.type) {
      case 'inbound-rtp':
        if (report.mediaType === 'video') {
          result.video.inbound = {
            packetsReceived: report.packetsReceived,
            packetsLost: report.packetsLost,
            bytesReceived: report.bytesReceived,
            framesDecoded: report.framesDecoded,
            framesDropped: report.framesDropped,
            frameWidth: report.frameWidth,
            frameHeight: report.frameHeight,
            framesPerSecond: report.framesPerSecond
          };
        } else if (report.mediaType === 'audio') {
          result.audio.inbound = {
            packetsReceived: report.packetsReceived,
            packetsLost: report.packetsLost,
            bytesReceived: report.bytesReceived,
            audioLevel: report.audioLevel,
            totalAudioEnergy: report.totalAudioEnergy
          };
        }
        break;
        
      case 'outbound-rtp':
        if (report.mediaType === 'video') {
          result.video.outbound = {
            packetsSent: report.packetsSent,
            bytesSent: report.bytesSent,
            framesEncoded: report.framesEncoded,
            frameWidth: report.frameWidth,
            frameHeight: report.frameHeight,
            framesPerSecond: report.framesPerSecond,
            qualityLimitationReason: report.qualityLimitationReason
          };
        } else if (report.mediaType === 'audio') {
          result.audio.outbound = {
            packetsSent: report.packetsSent,
            bytesSent: report.bytesSent
          };
        }
        break;
        
      case 'candidate-pair':
        if (report.state === 'succeeded') {
          result.connection = {
            currentRoundTripTime: report.currentRoundTripTime,
            availableOutgoingBitrate: report.availableOutgoingBitrate,
            availableIncomingBitrate: report.availableIncomingBitrate,
            bytesReceived: report.bytesReceived,
            bytesSent: report.bytesSent,
            localCandidateType: report.localCandidateType,
            remoteCandidateType: report.remoteCandidateType
          };
        }
        break;
        
      case 'local-candidate':
      case 'remote-candidate':
        result.candidates.push({
          type: report.type,
          candidateType: report.candidateType,
          protocol: report.protocol,
          address: report.address,
          port: report.port
        });
        break;
    }
  });
  
  return result;
};

// Calculate connection quality based on stats
const calculateConnectionQuality = (currentStats: any, lastStats: any): 'excellent' | 'good' | 'poor' | 'disconnected' => {
  const connection = currentStats.connection;
  const video = currentStats.video;
  
  if (!connection || !connection.currentRoundTripTime) {
    return 'disconnected';
  }
  
  const rtt = connection.currentRoundTripTime * 1000; // Convert to ms
  const videoPacketLoss = video.inbound.packetsLost / (video.inbound.packetsReceived + video.inbound.packetsLost) || 0;
  const framesDropped = video.inbound.framesDropped || 0;
  const framesDecoded = video.inbound.framesDecoded || 1;
  const frameDropRate = framesDropped / framesDecoded;
  
  // Quality scoring
  let score = 100;
  
  // RTT impact (0-50ms: excellent, 50-150ms: good, 150-300ms: poor, >300ms: bad)
  if (rtt > 300) score -= 40;
  else if (rtt > 150) score -= 20;
  else if (rtt > 50) score -= 10;
  
  // Packet loss impact (0-1%: excellent, 1-3%: good, 3-5%: poor, >5%: bad)
  if (videoPacketLoss > 0.05) score -= 30;
  else if (videoPacketLoss > 0.03) score -= 20;
  else if (videoPacketLoss > 0.01) score -= 10;
  
  // Frame drop impact
  if (frameDropRate > 0.1) score -= 20;
  else if (frameDropRate > 0.05) score -= 10;
  
  // Quality classification
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 30) return 'poor';
  return 'disconnected';
};

// Adaptive bitrate control
export const createBitrateController = (peerConnection: RTCPeerConnection) => {
  const adjustBitrate = async (targetBitrate: number) => {
    const senders = peerConnection.getSenders();
    
    for (const sender of senders) {
      if (sender.track && sender.track.kind === 'video') {
        const params = sender.getParameters();
        
        if (params.encodings && params.encodings.length > 0) {
          params.encodings[0].maxBitrate = targetBitrate;
          
          try {
            await sender.setParameters(params);
            console.log(`Video bitrate adjusted to ${targetBitrate} bps`);
          } catch (error) {
            console.error('Failed to adjust bitrate:', error);
          }
        }
      }
    }
  };
  
  const adjustQualityBasedOnStats = async (stats: any) => {
    const connection = stats.connection;
    const rtt = connection.currentRoundTripTime * 1000;
    const availableBitrate = connection.availableOutgoingBitrate;
    
    let targetBitrate: number;
    
    // Adaptive bitrate based on network conditions
    if (rtt < 50 && availableBitrate > 2000000) {
      targetBitrate = 1500000; // 1.5 Mbps for excellent connection
    } else if (rtt < 100 && availableBitrate > 1000000) {
      targetBitrate = 800000; // 800 kbps for good connection
    } else if (rtt < 200 && availableBitrate > 500000) {
      targetBitrate = 400000; // 400 kbps for moderate connection
    } else {
      targetBitrate = 200000; // 200 kbps for poor connection
    }
    
    await adjustBitrate(targetBitrate);
  };
  
  return { adjustBitrate, adjustQualityBasedOnStats };
};
