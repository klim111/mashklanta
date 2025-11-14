'use client';

import { io, Socket } from 'socket.io-client';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'chat-message' | 'user-joined' | 'user-left' | 'call-ended' | 'screen-share-start' | 'screen-share-end';
  data: any;
  from: string;
  to?: string;
  callId: string;
  timestamp: number;
}

export class SocketIOSignaling {
  private socket: Socket | null = null;
  private callId: string;
  private userId: string;
  private userType: string;
  private onMessage: (message: SignalingMessage) => void;
  private onConnectionChange: (connected: boolean) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    callId: string,
    userId: string,
    userType: 'advisor' | 'client',
    onMessage: (message: SignalingMessage) => void,
    onConnectionChange: (connected: boolean) => void
  ) {
    this.callId = callId;
    this.userId = userId;
    this.userType = userType;
    this.onMessage = onMessage;
    this.onConnectionChange = onConnectionChange;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Connect to Socket.IO server
        const serverUrl = process.env.NODE_ENV === 'production' 
          ? (process.env.NEXT_PUBLIC_WEBSOCKET_URL || `wss://${window.location.hostname}`)
          : (process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3002');
        
        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true
        });

        console.log(`[SocketIOSignaling] Attempting to connect to WebSocket server: ${serverUrl}`, {
          callId: this.callId,
          userId: this.userId,
          userType: this.userType
        });

        this.socket.on('connect', () => {
          console.log(`[SocketIOSignaling] Connected successfully`, {
            socketId: this.socket?.id,
            callId: this.callId,
            userId: this.userId,
            userType: this.userType
          });
          this.reconnectAttempts = 0;
          this.onConnectionChange(true);
          
          // Join the call room
          this.socket?.emit('join-call', {
            callId: this.callId,
            userId: this.userId,
            userType: this.userType
          });
          
          console.log(`[SocketIOSignaling] Sent join-call event`, {
            callId: this.callId,
            userId: this.userId
          });
          
          // Set up ping/pong for connection health
          this.setupPingPong();
          
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log(`[SocketIOSignaling] Disconnected`, {
            callId: this.callId,
            userId: this.userId,
            reason,
            socketId: this.socket?.id
          });
          this.onConnectionChange(false);
          this.attemptReconnect();
        });

        this.socket.on('connect_error', (error: any) => {
          console.error(`[SocketIOSignaling] Connection error`, {
            callId: this.callId,
            userId: this.userId,
            serverUrl,
            errorMessage: error?.message || String(error),
            errorType: error?.type,
            errorDescription: error?.description
          });
          this.onConnectionChange(false);
          this.attemptReconnect();
        });

        // Handle signaling messages
        this.socket.on('webrtc-signal', (data) => {
          console.log(`[SocketIOSignaling] Received WebRTC signal`, {
            callId: this.callId,
            userId: this.userId,
            signalType: data.type,
            from: data.from,
            hasSdp: !!data.signal?.sdp,
            hasCandidate: !!data.signal?.candidate,
            candidateType: data.signal?.candidate?.type
          });
          const message: SignalingMessage = {
            type: data.type,
            data: data.signal,
            from: data.from,
            callId: this.callId,
            timestamp: data.timestamp
          };
          this.onMessage(message);
        });

        // Handle chat messages
        this.socket.on('chat-message', (data) => {
          console.log('Received chat message:', data);
          const message: SignalingMessage = {
            type: 'chat-message',
            data: { message: data.message },
            from: data.from,
            callId: this.callId,
            timestamp: data.timestamp
          };
          this.onMessage(message);
        });

        // Handle user events
        this.socket.on('user-joined', (data) => {
          const message: SignalingMessage = {
            type: 'user-joined',
            data: { userId: data.userId, userType: data.userType },
            from: data.userId,
            callId: this.callId,
            timestamp: data.timestamp
          };
          this.onMessage(message);
        });

        this.socket.on('user-left', (data) => {
          const message: SignalingMessage = {
            type: 'user-left',
            data: { userId: data.userId, userType: data.userType },
            from: data.userId,
            callId: this.callId,
            timestamp: data.timestamp
          };
          this.onMessage(message);
        });

        this.socket.on('call-ended', (data) => {
          const message: SignalingMessage = {
            type: 'call-ended',
            data: {},
            from: data.from,
            callId: this.callId,
            timestamp: data.timestamp
          };
          this.onMessage(message);
        });

        // Handle call info
        this.socket.on('call-info', (data) => {
          console.log('Call info received:', data);
          // You can handle call info here if needed
        });

      } catch (error) {
        console.error('Failed to connect to Socket.IO:', error);
        reject(error);
      }
    });
  }

  private setupPingPong() {
    if (this.socket) {
      // Send ping every 15 seconds
      const pingInterval = setInterval(() => {
        if (this.socket && this.socket.connected) {
          this.socket.emit('ping');
        } else {
          clearInterval(pingInterval);
        }
      }, 15000);
      
      // Handle pong response
      this.socket.on('pong', () => {
        console.log('Received pong from server');
      });
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(() => {
          console.log('Reconnection failed');
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.log('Max reconnection attempts reached');
    }
  }

  sendOffer(offer: RTCSessionDescriptionInit, to: string = 'broadcast') {
    if (this.socket) {
      console.log(`[SocketIOSignaling] Sending offer`, {
        callId: this.callId,
        userId: this.userId,
        target: to,
        hasSdp: !!offer.sdp,
        sdpType: offer.type
      });
      this.socket.emit('webrtc-signal', {
        type: 'offer',
        target: to,
        signal: offer
      });
    } else {
      console.warn(`[SocketIOSignaling] Cannot send offer - socket not connected`, {
        callId: this.callId,
        userId: this.userId
      });
    }
  }

  sendAnswer(answer: RTCSessionDescriptionInit, to: string = 'broadcast') {
    if (this.socket) {
      console.log(`[SocketIOSignaling] Sending answer`, {
        callId: this.callId,
        userId: this.userId,
        target: to,
        hasSdp: !!answer.sdp,
        sdpType: answer.type
      });
      this.socket.emit('webrtc-signal', {
        type: 'answer',
        target: to,
        signal: answer
      });
    } else {
      console.warn(`[SocketIOSignaling] Cannot send answer - socket not connected`, {
        callId: this.callId,
        userId: this.userId
      });
    }
  }

  sendIceCandidate(candidate: RTCIceCandidateInit, to: string = 'broadcast') {
    if (this.socket) {
      console.log(`[SocketIOSignaling] Sending ICE candidate`, {
        callId: this.callId,
        userId: this.userId,
        target: to,
        hasCandidate: !!candidate.candidate,
        candidateProtocol: (candidate as any).protocol,
        candidateAddress: (candidate as any).address
      });
      this.socket.emit('webrtc-signal', {
        type: 'ice-candidate',
        target: to,
        signal: candidate
      });
    } else {
      console.warn(`[SocketIOSignaling] Cannot send ICE candidate - socket not connected`, {
        callId: this.callId,
        userId: this.userId
      });
    }
  }

  sendChatMessage(message: string) {
    if (this.socket) {
      this.socket.emit('chat-message', { message });
    }
  }

  startScreenShare() {
    if (this.socket) {
      this.socket.emit('screen-share-start');
    }
  }

  endScreenShare() {
    if (this.socket) {
      this.socket.emit('screen-share-end');
    }
  }

  endCall() {
    if (this.socket) {
      this.socket.emit('end-call');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Factory function to create signaling instance
export function createSocketIOSignaling(
  callId: string,
  userId: string,
  userType: 'advisor' | 'client',
  onMessage: (message: SignalingMessage) => void,
  onConnectionChange: (connected: boolean) => void
): SocketIOSignaling {
  return new SocketIOSignaling(callId, userId, userType, onMessage, onConnectionChange);
}
