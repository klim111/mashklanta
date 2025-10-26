import { NextRequest } from 'next/server';

// In-memory store for call data (in production, use Redis or database)
const callStore = new Map<string, {
  participants: Map<string, any>;
  messages: any[];
  signals: any[];
}>();

// WebSocket-like API using HTTP polling and Server-Sent Events
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const callId = searchParams.get('callId');
  const userId = searchParams.get('userId');
  const userType = searchParams.get('userType');
  const action = searchParams.get('action');

  if (!callId || !userId) {
    return new Response('Missing callId or userId', { status: 400 });
  }

  // Initialize call if it doesn't exist
  if (!callStore.has(callId)) {
    callStore.set(callId, {
      participants: new Map(),
      messages: [],
      signals: []
    });
  }

  const call = callStore.get(callId)!;

  switch (action) {
    case 'join':
      // Add participant to call
      call.participants.set(userId, {
        userType,
        joinedAt: new Date(),
        lastSeen: Date.now()
      });

      // Return call info
      return new Response(JSON.stringify({
        success: true,
        callId,
        participants: Array.from(call.participants.entries()).map(([id, info]) => ({
          userId: id,
          userType: info.userType,
          joinedAt: info.joinedAt
        })),
        messages: call.messages.slice(-50),
        signals: call.signals.slice(-20)
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    case 'poll':
      // Poll for new messages and signals
      const since = parseInt(searchParams.get('since') || '0');
      const newMessages = call.messages.filter(msg => msg.timestamp > since);
      const newSignals = call.signals.filter(signal => signal.timestamp > since);

      // Update last seen
      if (call.participants.has(userId)) {
        call.participants.get(userId)!.lastSeen = Date.now();
      }

      return new Response(JSON.stringify({
        success: true,
        messages: newMessages,
        signals: newSignals,
        timestamp: Date.now()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    case 'leave':
      // Remove participant
      call.participants.delete(userId);
      
      // Clean up empty calls
      if (call.participants.size === 0) {
        callStore.delete(callId);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    default:
      return new Response('Invalid action', { status: 400 });
  }
}

// Handle signaling messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, callId, userId, target = 'broadcast', signal, message } = body;

    if (!callId || !userId) {
      return new Response('Missing callId or userId', { status: 400 });
    }

    // Initialize call if it doesn't exist
    if (!callStore.has(callId)) {
      callStore.set(callId, {
        participants: new Map(),
        messages: [],
        signals: []
      });
    }

    const call = callStore.get(callId)!;

    switch (type) {
      case 'webrtc-signal':
        // Store WebRTC signal
        const signalData = {
          type: signal.type || type,
          from: userId,
          target,
          signal: signal,
          timestamp: Date.now()
        };
        call.signals.push(signalData);
        
        // Keep only last 100 signals
        if (call.signals.length > 100) {
          call.signals = call.signals.slice(-100);
        }
        break;

      case 'chat-message':
        // Store chat message
        const chatMessage = {
          id: Date.now().toString(),
          from: userId,
          message,
          timestamp: Date.now(),
          userType: call.participants.get(userId)?.userType || 'unknown'
        };
        call.messages.push(chatMessage);
        
        // Keep only last 200 messages
        if (call.messages.length > 200) {
          call.messages = call.messages.slice(-200);
        }
        break;

      case 'screen-share-start':
      case 'screen-share-end':
      case 'call-ended':
        // Store event
        call.signals.push({
          type,
          from: userId,
          timestamp: Date.now()
        });
        break;

      default:
        return new Response('Unknown message type', { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('WebSocket API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
