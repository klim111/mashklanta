'use client';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'chat-message' | 'user-joined' | 'user-left' | 'call-ended' | 'screen-share-start' | 'screen-share-end';
  data: any;
  from: string;
  to?: string;
  callId: string;
  timestamp: number;
}

export class HTTPSignaling {
  private callId: string;
  private userId: string;
  private userType: string;
  private onMessage: (message: SignalingMessage) => void;
  private onConnectionChange: (connected: boolean) => void;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private lastPollTime = 0;
  private baseUrl: string;
  private processedMessageIds: Set<string> = new Set();
  private processedSignalKeys: Set<string> = new Set();

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
    
    // Use the same domain for API calls
    this.baseUrl = '/api/websocket';
  }

  async connect(): Promise<void> {
    try {
      console.log('Connecting to HTTP signaling server...');
      
      // Join the call
      const joinResponse = await fetch(`${this.baseUrl}?action=join&callId=${this.callId}&userId=${this.userId}&userType=${this.userType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!joinResponse.ok) {
        throw new Error(`Failed to join call: ${joinResponse.statusText}`);
      }

      const joinData = await joinResponse.json();
      console.log('Joined call successfully:', joinData);

      this.isConnected = true;
      this.onConnectionChange(true);

      // Start polling for messages
      this.startPolling();

      // Handle existing participants
      if (joinData.participants) {
        joinData.participants.forEach((participant: any) => {
          if (participant.userId !== this.userId) {
            const message: SignalingMessage = {
              type: 'user-joined',
              data: { userId: participant.userId, userType: participant.userType },
              from: participant.userId,
              callId: this.callId,
              timestamp: Date.now()
            };
            this.onMessage(message);
          }
        });
      }

      // Initialize lastPollTime to the latest known timestamp to avoid duplicates on first poll
      const lastMsgTs = Array.isArray(joinData.messages) && joinData.messages.length > 0
        ? Math.max(...joinData.messages.map((m: any) => m.timestamp || 0))
        : 0;
      const lastSigTs = Array.isArray(joinData.signals) && joinData.signals.length > 0
        ? Math.max(...joinData.signals.map((s: any) => s.timestamp || 0))
        : 0;
      this.lastPollTime = Math.max(lastMsgTs, lastSigTs, Date.now());

    } catch (error) {
      console.error('Failed to connect to HTTP signaling:', error);
      this.onConnectionChange(false);
      throw error;
    }
  }

  private startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      if (!this.isConnected) return;

      try {
        const response = await fetch(`${this.baseUrl}?action=poll&callId=${this.callId}&userId=${this.userId}&since=${this.lastPollTime}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          console.error('Polling failed:', response.statusText);
          return;
        }

        const data = await response.json();
        this.lastPollTime = data.timestamp || Date.now();

        // Process new messages
        if (data.messages && data.messages.length > 0) {
          console.log(`Received ${data.messages.length} new messages`);
          data.messages.forEach((msg: any) => {
            const id = String(msg.id ?? `${msg.from}-${msg.timestamp}-${msg.message}`);
            if (this.processedMessageIds.has(id)) return;
            this.processedMessageIds.add(id);
            const message: SignalingMessage = {
              type: 'chat-message',
              data: { message: msg.message },
              from: msg.from,
              callId: this.callId,
              timestamp: msg.timestamp
            };
            this.onMessage(message);
          });
        }

        // Process new signals
        if (data.signals && data.signals.length > 0) {
          console.log(`Received ${data.signals.length} new signals`);
          data.signals.forEach((signal: any) => {
            if (signal.from !== this.userId) {
              const key = `${signal.type}|${signal.from}|${signal.timestamp}`;
              if (this.processedSignalKeys.has(key)) return;
              this.processedSignalKeys.add(key);
              console.log('Processing WebRTC signal:', signal);
              const message: SignalingMessage = {
                type: signal.type,
                data: signal.signal,
                from: signal.from,
                callId: this.callId,
                timestamp: signal.timestamp
              };
              this.onMessage(message);
            }
          });
        }

      } catch (error) {
        console.error('Polling error:', error);
        this.isConnected = false;
        this.onConnectionChange(false);
        this.stopPolling();
      }
    }, 300); // Poll every 300ms for faster WebRTC signaling
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private async sendSignal(type: string, signal: any, target: string = 'broadcast') {
    try {
      console.log(`Sending ${type} signal:`, signal);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'webrtc-signal',
          callId: this.callId,
          userId: this.userId,
          target,
          signal: {
            type: type,
            ...signal
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to send signal:', response.statusText, errorText);
      } else {
        console.log(`${type} signal sent successfully`);
      }
    } catch (error) {
      console.error('Error sending signal:', error);
    }
  }

  sendOffer(offer: RTCSessionDescriptionInit, to: string = 'broadcast') {
    console.log('Sending WebRTC offer:', offer);
    this.sendSignal('offer', offer, to);
  }

  sendAnswer(answer: RTCSessionDescriptionInit, to: string = 'broadcast') {
    console.log('Sending WebRTC answer:', answer);
    this.sendSignal('answer', answer, to);
  }

  sendIceCandidate(candidate: RTCIceCandidateInit, to: string = 'broadcast') {
    console.log('Sending ICE candidate:', candidate);
    this.sendSignal('ice-candidate', candidate, to);
  }

  async sendChatMessage(message: string) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'chat-message',
          callId: this.callId,
          userId: this.userId,
          message
        }),
      });

      if (!response.ok) {
        console.error('Failed to send chat message:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  }

  async startScreenShare() {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'screen-share-start',
          callId: this.callId,
          userId: this.userId
        }),
      });

      if (!response.ok) {
        console.error('Failed to start screen share:', response.statusText);
      }
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  }

  async endScreenShare() {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'screen-share-end',
          callId: this.callId,
          userId: this.userId
        }),
      });

      if (!response.ok) {
        console.error('Failed to end screen share:', response.statusText);
      }
    } catch (error) {
      console.error('Error ending screen share:', error);
    }
  }

  async endCall() {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'call-ended',
          callId: this.callId,
          userId: this.userId
        }),
      });

      if (!response.ok) {
        console.error('Failed to end call:', response.statusText);
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }

  async disconnect() {
    this.isConnected = false;
    this.stopPolling();
    this.onConnectionChange(false);

    try {
      await fetch(`${this.baseUrl}?action=leave&callId=${this.callId}&userId=${this.userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }
}

// Factory function to create signaling instance
export function createHTTPSignaling(
  callId: string,
  userId: string,
  userType: 'advisor' | 'client',
  onMessage: (message: SignalingMessage) => void,
  onConnectionChange: (connected: boolean) => void
): HTTPSignaling {
  return new HTTPSignaling(callId, userId, userType, onMessage, onConnectionChange);
}
