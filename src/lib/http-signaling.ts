'use client';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'chat-message' | 'user-joined' | 'user-left' | 'call-ended';
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
  private isConnected: boolean = false;
  private lastPollTimestamp: number = 0;
  private processedKeys: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseUrl: string;
  private pollingDelay = 300; // Start with 300ms polling

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
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  }

  async connect(): Promise<void> {
    try {
      console.log(`[HTTPSignaling] Connecting to call ${this.callId} as ${this.userId} (${this.userType})`);
      
      // Join the call
      const joinUrl = `${this.baseUrl}/api/websocket?action=join&callId=${encodeURIComponent(this.callId)}&userId=${encodeURIComponent(this.userId)}&userType=${encodeURIComponent(this.userType)}`;
      
      const joinResponse = await fetch(joinUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!joinResponse.ok) {
        throw new Error(`Failed to join call: ${joinResponse.statusText}`);
      }

      const joinData = await joinResponse.json();
      console.log(`[HTTPSignaling] Joined call successfully:`, joinData);

      // Process existing messages/signals
      if (joinData.signals && Array.isArray(joinData.signals)) {
        joinData.signals.forEach((signal: any) => {
          this.processSignal(signal);
        });
      }

      this.isConnected = true;
      this.onConnectionChange(true);
      this.reconnectAttempts = 0;

      // Start polling
      this.startPolling();

      console.log(`[HTTPSignaling] Connection established, polling started`);
    } catch (error) {
      console.error(`[HTTPSignaling] Connection failed:`, error);
      this.isConnected = false;
      this.onConnectionChange(false);
      this.attemptReconnect();
      throw error;
    }
  }

  private startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      if (!this.isConnected) {
        return;
      }

      try {
        await this.poll();
      } catch (error) {
        console.error(`[HTTPSignaling] Polling error:`, error);
        // On error, try to reconnect
        this.isConnected = false;
        this.onConnectionChange(false);
        this.attemptReconnect();
      }
    }, this.pollingDelay);
  }

  private async poll(): Promise<void> {
    const pollUrl = `${this.baseUrl}/api/websocket?action=poll&callId=${encodeURIComponent(this.callId)}&userId=${encodeURIComponent(this.userId)}&since=${this.lastPollTimestamp}`;
    
    const response = await fetch(pollUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Polling failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.messages && Array.isArray(data.messages)) {
      data.messages.forEach((msg: any) => {
        const key = `${msg.type}-${msg.from}-${msg.timestamp}`;
        if (!this.processedKeys.has(key)) {
          this.processedKeys.add(key);
          this.onMessage({
            type: msg.type || 'chat-message',
            data: msg.message || msg.data || {},
            from: msg.from,
            callId: this.callId,
            timestamp: msg.timestamp || Date.now(),
          });
        }
      });
    }

    if (data.signals && Array.isArray(data.signals)) {
      data.signals.forEach((signal: any) => {
        this.processSignal(signal);
      });
    }

    if (data.timestamp) {
      this.lastPollTimestamp = data.timestamp;
    }
  }

  private processSignal(signal: any) {
    const key = `${signal.type}-${signal.from}-${signal.timestamp}`;
    if (this.processedKeys.has(key)) {
      return; // Already processed
    }

    this.processedKeys.add(key);

    // Map signal types to SignalingMessage format
    let messageType: SignalingMessage['type'] = 'chat-message';
    let messageData: any = {};

    if (signal.type === 'webrtc-signal' || signal.signal) {
      const signalData = signal.signal || signal;
      if (signalData.type === 'offer') {
        messageType = 'offer';
        messageData = signalData;
      } else if (signalData.type === 'answer') {
        messageType = 'answer';
        messageData = signalData;
      } else if (signalData.candidate) {
        messageType = 'ice-candidate';
        messageData = signalData;
      }
    } else if (signal.type === 'user-joined') {
      messageType = 'user-joined';
      messageData = signal.signal || signal.data || {};
    } else if (signal.type === 'user-left') {
      messageType = 'user-left';
      messageData = signal.signal || signal.data || {};
    } else if (signal.type === 'call-ended') {
      messageType = 'call-ended';
      messageData = {};
    } else if (signal.type === 'chat-message') {
      messageType = 'chat-message';
      messageData = { message: signal.message || signal.data?.message || '' };
    }

    // Don't process our own messages
    if (signal.from === this.userId && messageType !== 'user-joined' && messageType !== 'user-left') {
      return;
    }

    this.onMessage({
      type: messageType,
      data: messageData,
      from: signal.from || 'unknown',
      callId: this.callId,
      timestamp: signal.timestamp || Date.now(),
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[HTTPSignaling] Max reconnection attempts reached`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
    
    console.log(`[HTTPSignaling] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect().catch((error) => {
        console.error(`[HTTPSignaling] Reconnection failed:`, error);
      });
    }, delay);
  }

  sendOffer(offer: RTCSessionDescriptionInit, to: string = 'broadcast') {
    this.sendSignal('offer', offer, to);
  }

  sendAnswer(answer: RTCSessionDescriptionInit, to: string = 'broadcast') {
    this.sendSignal('answer', answer, to);
  }

  sendIceCandidate(candidate: RTCIceCandidateInit, to: string = 'broadcast') {
    this.sendSignal('ice-candidate', candidate, to);
  }

  sendChatMessage(message: string) {
    this.sendMessage('chat-message', { message });
  }

  endCall() {
    this.sendMessage('call-ended', {});
  }

  private async sendSignal(type: 'offer' | 'answer' | 'ice-candidate', signal: any, target: string) {
    const signalData = {
      type: 'webrtc-signal',
      callId: this.callId,
      userId: this.userId,
      target,
      signal: {
        type,
        ...signal,
      },
    };

    console.log(`[HTTPSignaling] Sending ${type} signal:`, { type, target, hasSdp: !!signal.sdp, hasCandidate: !!signal.candidate });
    
    await this.postToServer(signalData);
  }

  private async sendMessage(type: string, data: any) {
    const messageData = {
      type,
      callId: this.callId,
      userId: this.userId,
      message: data.message || '',
      ...data,
    };

    console.log(`[HTTPSignaling] Sending ${type} message:`, messageData);
    
    await this.postToServer(messageData);
  }

  private async postToServer(data: any) {
    try {
      const response = await fetch(`${this.baseUrl}/api/websocket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`[HTTPSignaling] Failed to send message:`, error);
      throw error;
    }
  }

  disconnect() {
    console.log(`[HTTPSignaling] Disconnecting from call ${this.callId}`);
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Send leave request
    if (this.isConnected) {
      const leaveUrl = `${this.baseUrl}/api/websocket?action=leave&callId=${encodeURIComponent(this.callId)}&userId=${encodeURIComponent(this.userId)}&userType=${encodeURIComponent(this.userType)}`;
      fetch(leaveUrl, { method: 'GET' }).catch(() => {
        // Ignore errors on disconnect
      });
    }

    this.isConnected = false;
    this.onConnectionChange(false);
    this.processedKeys.clear();
  }
}

export function createHTTPSignaling(
  callId: string,
  userId: string,
  userType: 'advisor' | 'client',
  onMessage: (message: SignalingMessage) => void,
  onConnectionChange: (connected: boolean) => void
): HTTPSignaling {
  return new HTTPSignaling(callId, userId, userType, onMessage, onConnectionChange);
}

