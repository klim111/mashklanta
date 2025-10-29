'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wifi, 
  WifiOff, 
  Camera, 
  Mic, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Copy,
  Download
} from 'lucide-react';

interface WebRTCDebugProps {
  peerConnection: RTCPeerConnection | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: string;
  iceConnectionState: string;
  iceGatheringState: string;
  onRestartConnection?: () => void;
}

interface DebugInfo {
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  data?: any;
}

export function WebRTCDebug({
  peerConnection,
  localStream,
  remoteStream,
  connectionState,
  iceConnectionState,
  iceGatheringState,
  onRestartConnection
}: WebRTCDebugProps) {
  const [debugLogs, setDebugLogs] = useState<DebugInfo[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [iceCandidates, setIceCandidates] = useState<RTCIceCandidate[]>([]);
  const [stats, setStats] = useState<any>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (type: DebugInfo['type'], message: string, data?: any) => {
    const log: DebugInfo = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data
    };
    setDebugLogs(prev => [...prev.slice(-49), log]); // Keep last 50 logs
  };

  useEffect(() => {
    addLog('info', 'WebRTC Debug component initialized');
  }, []);

  useEffect(() => {
    if (peerConnection) {
      addLog('info', 'Peer connection created', {
        connectionState: peerConnection.connectionState,
        iceConnectionState: peerConnection.iceConnectionState,
        iceGatheringState: peerConnection.iceGatheringState
      });

      // Monitor connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        addLog(state === 'connected' ? 'success' : 'info', `Connection state: ${state}`);
      };

      // Monitor ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        const logType = state === 'connected' ? 'success' : 
                       state === 'failed' ? 'error' : 'info';
        addLog(logType, `ICE connection state: ${state}`);
      };

      // Monitor ICE gathering state changes
      peerConnection.onicegatheringstatechange = () => {
        const state = peerConnection.iceGatheringState;
        addLog('info', `ICE gathering state: ${state}`);
      };

      // Monitor ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          setIceCandidates(prev => [...prev, event.candidate!]);
          addLog('info', `ICE candidate gathered: ${event.candidate.type}`, {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid
          });
        } else {
          addLog('success', 'ICE gathering complete');
        }
      };

      // Monitor tracks
      peerConnection.ontrack = (event) => {
        addLog('success', `Remote track received: ${event.track.kind}`, {
          trackId: event.track.id,
          trackKind: event.track.kind,
          trackEnabled: event.track.enabled,
          trackReadyState: event.track.readyState,
          streamsCount: event.streams.length
        });
      };

      // Start stats collection
      startStatsCollection();
    }

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [peerConnection]);

  useEffect(() => {
    if (localStream) {
      addLog('success', 'Local stream available', {
        videoTracks: localStream.getVideoTracks().length,
        audioTracks: localStream.getAudioTracks().length,
        active: localStream.active
      });
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      addLog('success', 'Remote stream available', {
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length,
        active: remoteStream.active
      });
    }
  }, [remoteStream]);

  const startStatsCollection = async () => {
    if (!peerConnection) return;

    const collectStats = async () => {
      try {
        const stats = await peerConnection.getStats();
        const statsData: any = {};
        
        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' || report.type === 'outbound-rtp') {
            const key = `${report.type}-${report.kind || 'unknown'}`;
            statsData[key] = {
              type: report.type,
              kind: report.kind,
              packetsReceived: report.packetsReceived,
              packetsSent: report.packetsSent,
              bytesReceived: report.bytesReceived,
              bytesSent: report.bytesSent,
              framesReceived: report.framesReceived,
              framesSent: report.framesSent,
              framesDecoded: report.framesDecoded,
              framesEncoded: report.framesEncoded,
              frameWidth: report.frameWidth,
              frameHeight: report.frameHeight,
              frameRate: report.frameRate
            };
          } else if (report.type === 'candidate-pair') {
            statsData['candidate-pair'] = {
              state: report.state,
              priority: report.priority,
              nominated: report.nominated,
              bytesReceived: report.bytesReceived,
              bytesSent: report.bytesSent,
              roundTripTime: report.currentRoundTripTime
            };
          }
        });
        
        setStats(statsData);
      } catch (error) {
        addLog('error', 'Failed to collect stats', error);
      }
    };

    collectStats();
    statsIntervalRef.current = setInterval(collectStats, 2000);
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'failed':
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'disconnected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const copyDebugInfo = async () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      connectionState,
      iceConnectionState,
      iceGatheringState,
      iceCandidatesCount: iceCandidates.length,
      localStreamTracks: localStream ? {
        video: localStream.getVideoTracks().length,
        audio: localStream.getAudioTracks().length,
        active: localStream.active
      } : null,
      remoteStreamTracks: remoteStream ? {
        video: remoteStream.getVideoTracks().length,
        audio: remoteStream.getAudioTracks().length,
        active: remoteStream.active
      } : null,
      stats,
      logs: debugLogs.slice(-20) // Last 20 logs
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
      addLog('success', 'Debug info copied to clipboard');
    } catch (error) {
      addLog('error', 'Failed to copy debug info', error);
    }
  };

  const downloadDebugInfo = () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      connectionState,
      iceConnectionState,
      iceGatheringState,
      iceCandidatesCount: iceCandidates.length,
      localStreamTracks: localStream ? {
        video: localStream.getVideoTracks().length,
        audio: localStream.getAudioTracks().length,
        active: localStream.active
      } : null,
      remoteStreamTracks: remoteStream ? {
        video: remoteStream.getVideoTracks().length,
        audio: remoteStream.getAudioTracks().length,
        active: remoteStream.active
      } : null,
      stats,
      logs: debugLogs
    };

    const blob = new Blob([JSON.stringify(debugInfo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webrtc-debug-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addLog('success', 'Debug info downloaded');
  };

  const clearLogs = () => {
    setDebugLogs([]);
    setIceCandidates([]);
    addLog('info', 'Debug logs cleared');
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            WebRTC Debug Console
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyDebugInfo}
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadDebugInfo}
            >
              <Download className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
            >
              Clear
            </Button>
            {onRestartConnection && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRestartConnection}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span>Connection:</span>
            <Badge className={getStatusColor(connectionState)}>
              {getStatusIcon(connectionState)}
              <span className="ml-1">{connectionState}</span>
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span>ICE:</span>
            <Badge className={getStatusColor(iceConnectionState)}>
              {getStatusIcon(iceConnectionState)}
              <span className="ml-1">{iceConnectionState}</span>
            </Badge>
          </div>
        </div>

        {/* Stream Status */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Camera className="w-3 h-3" />
            <span>Local:</span>
            <Badge variant={localStream ? 'default' : 'secondary'}>
              {localStream ? `${localStream.getVideoTracks().length}V ${localStream.getAudioTracks().length}A` : 'None'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Mic className="w-3 h-3" />
            <span>Remote:</span>
            <Badge variant={remoteStream ? 'default' : 'secondary'}>
              {remoteStream ? `${remoteStream.getVideoTracks().length}V ${remoteStream.getAudioTracks().length}A` : 'None'}
            </Badge>
          </div>
        </div>

        {/* ICE Candidates */}
        <div className="text-xs">
          <span>ICE Candidates: </span>
          <Badge variant="outline">{iceCandidates.length}</Badge>
          {iceCandidates.length > 0 && (
            <div className="mt-1 text-xs text-gray-600">
              Types: {[...new Set(iceCandidates.map(c => c.type))].join(', ')}
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="text-xs space-y-1">
            <div className="font-medium">Stats:</div>
            {Object.entries(stats).map(([key, value]: [string, any]) => (
              <div key={key} className="text-gray-600">
                {key}: {JSON.stringify(value, null, 2)}
              </div>
            ))}
          </div>
        )}

        {/* Debug Logs */}
        {isExpanded && (
          <div className="space-y-2">
            <div className="font-medium text-xs">Debug Logs:</div>
            <div className="max-h-60 overflow-y-auto space-y-1 text-xs">
              {debugLogs.map((log, index) => (
                <div
                  key={index}
                  className={`p-2 rounded text-xs ${
                    log.type === 'error' ? 'bg-red-50 text-red-800' :
                    log.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                    log.type === 'success' ? 'bg-green-50 text-green-800' :
                    'bg-gray-50 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{log.timestamp}</span>
                    <span className="font-medium">{log.message}</span>
                  </div>
                  {log.data && (
                    <div className="mt-1 text-xs text-gray-600">
                      <pre>{JSON.stringify(log.data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Troubleshooting Tips */}
        {iceConnectionState === 'failed' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              ICE connection failed. This usually means:
              <ul className="list-disc list-inside mt-1">
                <li>Both parties are behind symmetric NATs</li>
                <li>TURN server is not configured or unreachable</li>
                <li>Firewall is blocking WebRTC traffic</li>
              </ul>
              Try configuring a TURN server or check network settings.
            </AlertDescription>
          </Alert>
        )}

        {connectionState === 'connected' && !remoteStream && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Connection established but no remote stream. Check if:
              <ul className="list-disc list-inside mt-1">
                <li>Remote party has granted camera/microphone permissions</li>
                <li>Remote party's media tracks are enabled</li>
                <li>ontrack event is firing on both sides</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
