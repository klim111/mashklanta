import { NextRequest } from 'next/server';

// In-memory store for call data (in production, use Redis or database)
const callStore = new Map<string, {
  participants: Map<string, any>;
  messages: any[];
  signals: any[];
}>();

// Clean up old calls every 5 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  for (const [callId, call] of callStore.entries()) {
    const hasActiveParticipants = Array.from(call.participants.values())
      .some(p => (now - p.lastSeen) < maxAge);
    
    if (!hasActiveParticipants) {
      callStore.delete(callId);
      console.log(`Cleaned up inactive call: ${callId}`);
    }
  }
}, 5 * 60 * 1000);

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
    console.log(`Created new call: ${callId}`);
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

      console.log(`User ${userId} (${userType}) joined call ${callId}`);

      // Notify other participants about new user
      const joinSignal = {
        type: 'user-joined',
        from: userId,
        target: 'broadcast',
        signal: { userId, userType },
        timestamp: Date.now()
      };
      call.signals.push(joinSignal);

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
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
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
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

    case 'leave':
      // Remove participant
      call.participants.delete(userId);
      
      // Notify other participants about user leaving
      const leaveSignal = {
        type: 'user-left',
        from: userId,
        target: 'broadcast',
        signal: { userId, userType },
        timestamp: Date.now()
      };
      call.signals.push(leaveSignal);
      
      console.log(`User ${userId} left call ${callId}`);
      
      // Clean up empty calls
      if (call.participants.size === 0) {
        callStore.delete(callId);
        console.log(`Deleted empty call: ${callId}`);
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
      console.log(`Created new call via POST: ${callId}`);
    }

    const call = callStore.get(callId)!;

    switch (type) {
      case 'webrtc-signal':
        // Store WebRTC signal with proper structure
        const signalData = {
          type: signal?.type || 'webrtc-signal',
          from: userId,
          target,
          signal: signal,
          timestamp: Date.now()
        };
        call.signals.push(signalData);
        
        console.log(`WebRTC signal stored: ${signalData.type} from ${userId} in call ${callId}`);
        
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
        
        console.log(`Chat message stored from ${userId} in call ${callId}: ${message}`);
        
        // Keep only last 200 messages
        if (call.messages.length > 200) {
          call.messages = call.messages.slice(-200);
        }
        break;

      case 'screen-share-start':
      case 'screen-share-end':
      case 'call-ended':
        // Store event
        const eventSignal = {
          type,
          from: userId,
          target: 'broadcast',
          signal: { type },
          timestamp: Date.now()
        };
        call.signals.push(eventSignal);
        
        console.log(`Event signal stored: ${type} from ${userId} in call ${callId}`);
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
        return new Response('Unknown message type', { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('WebSocket API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
