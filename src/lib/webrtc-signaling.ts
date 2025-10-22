'use client';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'chat-message' | 'user-joined' | 'user-left' | 'call-ended';
  data: any;
  from: string;
  to?: string;
  callId: string;
  timestamp: number;
}

export class WebRTCSignaling {
  private ws: WebSocket | null = null;
  private callId: string;
  private userId: string;
  private onMessage: (message: SignalingMessage) => void;
  private onConnectionChange: (connected: boolean) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    callId: string,
    userId: string,
    onMessage: (message: SignalingMessage) => void,
    onConnectionChange: (connected: boolean) => void
  ) {
    this.callId = callId;
    this.userId = userId;
    this.onMessage = onMessage;
    this.onConnectionChange = onConnectionChange;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Use WebSocket for real-time communication
        // In production, replace with your WebSocket server URL
        const wsUrl = process.env.NODE_ENV === 'production' 
          ? 'wss://your-websocket-server.com/ws'
          : 'ws://localhost:8080/ws';
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.onConnectionChange(true);
          
          // Join the call room
          this.send({
            type: 'user-joined',
            data: { userId: this.userId, callId: this.callId },
            from: this.userId,
            callId: this.callId,
            timestamp: Date.now()
          });
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data);
            
            // Only process messages for this call
            if (message.callId === this.callId) {
              this.onMessage(message);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.onConnectionChange(false);
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        // Fallback to polling if WebSocket fails
        this.startPolling();
        resolve();
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(() => {
          this.startPolling();
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.log('Max reconnection attempts reached, falling back to polling');
      this.startPolling();
    }
  }

  private startPolling() {
    // Fallback polling mechanism
    console.log('Starting polling fallback');
    this.onConnectionChange(true);
    
    // Simulate connection for demo purposes
    // In production, implement actual polling to your server
    setInterval(() => {
      // This would poll your server for new messages
    }, 2000);
  }

  send(message: Omit<SignalingMessage, 'from' | 'timestamp'>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const fullMessage: SignalingMessage = {
        ...message,
        from: this.userId,
        timestamp: Date.now()
      };
      
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  sendChatMessage(message: string, to?: string) {
    this.send({
      type: 'chat-message',
      data: { message, to },
      to,
      callId: this.callId
    });
  }

  sendOffer(offer: RTCSessionDescriptionInit, to: string) {
    this.send({
      type: 'offer',
      data: offer,
      to,
      callId: this.callId
    });
  }

  sendAnswer(answer: RTCSessionDescriptionInit, to: string) {
    this.send({
      type: 'answer',
      data: answer,
      to,
      callId: this.callId
    });
  }

  sendIceCandidate(candidate: RTCIceCandidateInit, to: string) {
    this.send({
      type: 'ice-candidate',
      data: candidate,
      to,
      callId: this.callId
    });
  }

  endCall() {
    this.send({
      type: 'call-ended',
      data: {},
      callId: this.callId
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Mock signaling server for development
export class MockSignalingServer {
  private static instance: MockSignalingServer;
  private connections: Map<string, WebRTCSignaling> = new Map();
  private messageQueue: Map<string, SignalingMessage[]> = new Map();

  static getInstance(): MockSignalingServer {
    if (!MockSignalingServer.instance) {
      MockSignalingServer.instance = new MockSignalingServer();
    }
    return MockSignalingServer.instance;
  }

  connect(callId: string, userId: string, signaling: WebRTCSignaling) {
    this.connections.set(`${callId}-${userId}`, signaling);
    
    if (!this.messageQueue.has(callId)) {
      this.messageQueue.set(callId, []);
    }

    // Notify other participants in the call
    this.broadcastToCall(callId, {
      type: 'user-joined',
      data: { userId, callId },
      from: userId,
      callId,
      timestamp: Date.now()
    }, userId);
  }

  disconnect(callId: string, userId: string) {
    this.connections.delete(`${callId}-${userId}`);
    
    // Notify other participants
    this.broadcastToCall(callId, {
      type: 'user-left',
      data: { userId, callId },
      from: userId,
      callId,
      timestamp: Date.now()
    });
  }

  sendMessage(message: SignalingMessage) {
    if (message.to) {
      // Send to specific user
      const connection = this.connections.get(`${message.callId}-${message.to}`);
      if (connection) {
        // Simulate network delay
        setTimeout(() => {
          (connection as any).onMessage(message);
        }, 50);
      }
    } else {
      // Broadcast to all users in the call
      this.broadcastToCall(message.callId, message, message.from);
    }
  }

  private broadcastToCall(callId: string, message: SignalingMessage, excludeUserId?: string) {
    this.connections.forEach((connection, key) => {
      const [callIdFromKey, userId] = key.split('-');
      if (callIdFromKey === callId && userId !== excludeUserId) {
        setTimeout(() => {
          (connection as any).onMessage(message);
        }, 50);
      }
    });
  }
}

// Development helper
export function createMockSignaling(
  callId: string,
  userId: string,
  onMessage: (message: SignalingMessage) => void,
  onConnectionChange: (connected: boolean) => void
): WebRTCSignaling {
  const signaling = new WebRTCSignaling(callId, userId, onMessage, onConnectionChange);
  
  // Override connect method for development
  (signaling as any).connect = () => {
    return new Promise<void>((resolve) => {
      const mockServer = MockSignalingServer.getInstance();
      mockServer.connect(callId, userId, signaling);
      
      // Override send method to use mock server
      (signaling as any).send = (message: Omit<SignalingMessage, 'from' | 'timestamp'>) => {
        const fullMessage: SignalingMessage = {
          ...message,
          from: userId,
          timestamp: Date.now()
        };
        mockServer.sendMessage(fullMessage);
      };
      
      setTimeout(() => {
        onConnectionChange(true);
        resolve();
      }, 100);
    });
  };

  return signaling;
}
