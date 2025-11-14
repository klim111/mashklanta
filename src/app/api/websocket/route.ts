import { NextRequest } from 'next/server';
import { callStore } from '@/lib/redis';

// Logging utility
const log = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [WebSocket API] [${level.toUpperCase()}] ${message}${logData}`);
};

// In-memory store for call data (fallback if Redis not available)
const inMemoryCallStore = new Map<string, {
  participants: Map<string, any>;
  messages: any[];
  signals: any[];
}>();

// Helper to get call data (Redis first, fallback to in-memory)
async function getCall(callId: string) {
  if (callStore) {
    const data = await callStore.get(callId);
    if (data) {
      log('info', `Retrieved call from Redis`, { callId, participants: Object.keys(data.participants || {}).length });
      return {
        participants: new Map(Object.entries(data.participants || {})),
        messages: data.messages || [],
        signals: data.signals || []
      };
    }
  }
  
  // Fallback to in-memory
  if (inMemoryCallStore.has(callId)) {
    log('info', `Retrieved call from memory`, { callId });
    return inMemoryCallStore.get(callId)!;
  }
  
  return null;
}

// Helper to save call data
async function saveCall(callId: string, call: { participants: Map<string, any>; messages: any[]; signals: any[] }) {
  const data = {
    participants: Object.fromEntries(call.participants),
    messages: call.messages,
    signals: call.signals
  };
  
  if (callStore) {
    await callStore.set(callId, data, 3600); // 1 hour TTL
    log('info', `Saved call to Redis`, { callId });
  } else {
    inMemoryCallStore.set(callId, call);
    log('info', `Saved call to memory`, { callId });
  }
}

// Clean up old calls every 5 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  for (const [callId, call] of inMemoryCallStore.entries()) {
    const hasActiveParticipants = Array.from(call.participants.values())
      .some(p => (now - p.lastSeen) < maxAge);
    
    if (!hasActiveParticipants) {
      inMemoryCallStore.delete(callId);
      log('info', `Cleaned up inactive call`, { callId });
    }
  }
}, 5 * 60 * 1000);

// Helper to get call data for response
async function getCallData(callId: string) {
  const call = await getCall(callId);
  if (call) {
    return {
      participants: Object.fromEntries(call.participants),
      messages: call.messages,
      signals: call.signals
    };
  }
  return null;
}

// WebSocket-like API using HTTP polling with Redis persistence
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const callId = searchParams.get('callId');
  const userId = searchParams.get('userId');
  const userType = searchParams.get('userType');
  const action = searchParams.get('action');
  const since = searchParams.get('since');

  log('info', `GET request received`, { callId, userId, userType, action, since, ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown' });

  if (!callId || !userId) {
    log('warn', `Missing required parameters`, { callId: !!callId, userId: !!userId });
    return new Response('Missing callId or userId', { status: 400 });
  }

  // Initialize call if it doesn't exist
  let call = await getCall(callId);
  if (!call) {
    call = {
      participants: new Map(),
      messages: [],
      signals: []
    };
    await saveCall(callId, call);
    log('info', `Created new call`, { callId, userId, userType });
  }

  try {
    switch (action) {
      case 'join':
        // Add participant to call
        call.participants.set(userId, {
          userType: userType || 'client',
          joinedAt: new Date(),
          lastSeen: Date.now()
        });
        await saveCall(callId, call);

        log('info', `User joined call`, { callId, userId, userType, totalParticipants: call.participants.size });

        // Notify other participants about new user
        const joinSignal = {
          type: 'user-joined',
          from: userId,
          target: 'broadcast',
          signal: { userId, userType: userType || 'client' },
          timestamp: Date.now()
        };
        call.signals.push(joinSignal);
        await saveCall(callId, call);

        // Return call info
        const callData = await getCallData(callId);
        return new Response(JSON.stringify({
          success: true,
          callId,
          participants: Object.entries(callData?.participants || {}).map(([id, info]: [string, any]) => ({
            userId: id,
            userType: info.userType,
            joinedAt: info.joinedAt
          })),
          messages: (callData?.messages || []).slice(-50),
          signals: (callData?.signals || []).slice(-20)
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
        const sinceTimestamp = parseInt(since || '0');
        const newMessages = call.messages.filter((msg: any) => msg.timestamp > sinceTimestamp);
        const newSignals = call.signals.filter((signal: any) => signal.timestamp > sinceTimestamp);

        // Update last seen
        if (call.participants.has(userId)) {
          call.participants.get(userId)!.lastSeen = Date.now();
          await saveCall(callId, call);
        }

        log('info', `Poll response`, { 
          callId, 
          userId, 
          since: sinceTimestamp, 
          newMessages: newMessages.length, 
          newSignals: newSignals.length 
        });

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
          signal: { userId, userType: userType || 'client' },
          timestamp: Date.now()
        };
        call.signals.push(leaveSignal);
        
        // Clean up empty calls
        if (call.participants.size === 0) {
          if (callStore) {
            await callStore.delete(callId);
          } else {
            inMemoryCallStore.delete(callId);
          }
          log('info', `Deleted empty call`, { callId });
        } else {
          await saveCall(callId, call);
        }
        
        log('info', `User left call`, { callId, userId, remainingParticipants: call.participants.size });

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      default:
        log('warn', `Invalid action`, { callId, userId, action });
        return new Response('Invalid action', { status: 400 });
    }
  } catch (error) {
    log('error', `GET request error`, { callId, userId, action, error: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle signaling messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, callId, userId, target = 'broadcast', signal, message } = body;

    log('info', `POST request received`, { 
      type, 
      callId, 
      userId, 
      target, 
      hasSignal: !!signal, 
      hasMessage: !!message,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    });

    if (!callId || !userId) {
      log('warn', `Missing required parameters in POST`, { callId: !!callId, userId: !!userId });
      return new Response('Missing callId or userId', { status: 400 });
    }

    // Initialize call if it doesn't exist
    let call = await getCall(callId);
    if (!call) {
      call = {
        participants: new Map(),
        messages: [],
        signals: []
      };
      await saveCall(callId, call);
      log('info', `Created new call via POST`, { callId, userId });
    }

    switch (type) {
      case 'webrtc-signal':
        // Store WebRTC signal with proper structure for client consumption
        const signalData = {
          type: signal?.type || 'webrtc-signal',
          from: userId,
          target,
          signal: signal?.type === 'offer' ? signal : 
                 signal?.type === 'answer' ? signal :
                 signal?.type === 'ice-candidate' ? signal :
                 signal, // fallback to original signal structure
          timestamp: Date.now()
        };
        call.signals.push(signalData);
        
        // Keep only last 100 signals
        if (call.signals.length > 100) {
          call.signals = call.signals.slice(-100);
        }
        
        await saveCall(callId, call);
        
        log('info', `WebRTC signal stored`, { 
          callId, 
          userId, 
          signalType: signal?.type, 
          target,
          hasSdp: !!signal?.sdp, 
          hasCandidate: !!signal?.candidate,
          candidateType: signal?.candidate?.type,
          candidateProtocol: signal?.candidate?.protocol
        });
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
        
        await saveCall(callId, call);
        
        log('info', `Chat message stored`, { callId, userId, messageLength: message?.length || 0 });
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
        
        await saveCall(callId, call);
        
        log('info', `Event signal stored`, { callId, userId, eventType: type });
        break;

      default:
        log('warn', `Unknown message type`, { callId, userId, type });
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
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Ignore JSON parse errors
    }
    
    log('error', `POST request error`, { 
      callId: body?.callId, 
      userId: body?.userId, 
      type: body?.type,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
