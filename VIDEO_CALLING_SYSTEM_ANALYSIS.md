# 🎥 Video Calling System - Deep Analysis

## 📋 Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Component Breakdown](#component-breakdown)
3. [Communication Flow](#communication-flow)
4. [TURN Server Authentication](#turn-server-authentication)
5. [WebRTC Implementation Details](#webrtc-implementation-details)
6. [Signaling Mechanisms](#signaling-mechanisms)
7. [Identified Issues](#identified-issues)
8. [Recommendations](#recommendations)

---

## 🏗️ System Architecture Overview

The video calling system is a **peer-to-peer WebRTC implementation** with three main components:

1. **Client (Browser)** - End user connecting for a video call
2. **Advisor (Browser)** - Mortgage advisor receiving the call
3. **TURN Server (Coturn)** - NAT traversal server for relay when direct P2P fails

### Architecture Diagram
```
┌─────────────┐         ┌─────────────┐
│   Client    │◄────────►│   Advisor   │
│  (Browser)  │  WebRTC  │  (Browser)  │
└──────┬──────┘          └──────┬──────┘
       │                        │
       │  HTTP Polling / WS     │
       └──────────┬─────────────┘
                  │
          ┌───────▼───────┐
          │  Next.js API  │
          │  /api/websocket│
          │  (Signaling)   │
          └───────┬───────┘
                  │
          ┌───────▼───────┐
          │  TURN Server   │
          │   (Coturn)    │
          │  Port 3478    │
          └───────────────┘
```

---

## 🔧 Component Breakdown

### 1. **Frontend Components**

#### `src/app/video-call/[id]/page.tsx` (Client Page)
**Purpose**: Main client-side video call interface (full page)
**Key Features**:
- Video/audio stream management
- Device selection (camera/microphone)
- Screen sharing
- Chat functionality
- Connection monitoring and recovery
- Debug console
- Wait screen before advisor joins

**Route**: `/video-call/[callId]` - accessed by client with call link

#### `src/components/advisor-dashboard/VideoCallModal.tsx` (Advisor Component)
**Purpose**: Advisor-side video call interface (modal-based)
**Key Features**:
- Same features as client page
- Modal interface (opens from advisor dashboard)
- Client data sidebar (shows client information during call)
- Share link generation (creates call link for client)
- Mortgage document viewing during call

**Usage**: Opened from advisor dashboard when advisor initiates call with client

**Note**: Both client and advisor components use the same WebRTC/signaling infrastructure but have different UI layouts (full page vs modal)

**State Management**:
```typescript
- isConnected: Call connection status
- isVideoOn/isAudioOn: Media toggle states
- isScreenSharing: Screen share state
- callDuration: Active call timer
- availableCameras/Microphones: Device lists
- connectionState: WebRTC connection state
```

**Key Functions**:
- `initializeWebRTC()`: Sets up peer connection and media streams
- `handleOffer/Answer/IceCandidate()`: Processes WebRTC signaling messages
- `handleVideoFreeze()`: Multi-strategy recovery for frozen video
- `reconnectWebRTC()`: Full connection recovery mechanism

#### `src/components/ui/webrtc-debug.tsx`
**Purpose**: Debugging interface for WebRTC connection
**Features**:
- Real-time connection stats
- ICE candidate tracking
- Connection state monitoring
- Log export functionality

---

### 2. **Signaling Libraries**

#### `src/lib/http-signaling.ts` (HTTPSignaling)
**Purpose**: HTTP polling-based signaling (fallback/primary mechanism)
**How it works**:
- **Join Call**: GET `/api/websocket?action=join&callId=...&userId=...`
- **Poll for Messages**: GET `/api/websocket?action=poll&callId=...&since=timestamp` (every 300ms)
- **Send Signals**: POST `/api/websocket` with WebRTC signals
- **Leave Call**: GET `/api/websocket?action=leave&callId=...&userId=...`

**Key Features**:
- Polling interval: 300ms (fast enough for real-time signaling)
- Message deduplication using processed keys
- Automatic reconnection handling
- Supports offer/answer/ice-candidate message types

#### `src/lib/socketio-signaling.ts` (SocketIOSignaling)
**Purpose**: WebSocket-based signaling (alternative implementation)
**Status**: ⚠️ **Not currently used** - client page uses HTTPSignaling
**How it works**:
- Connects to Socket.IO server (default: `localhost:3002` or production WebSocket URL)
- Real-time bidirectional communication
- Automatic reconnection with exponential backoff
- Ping/pong for connection health

#### `src/lib/webrtc-signaling.ts` (WebRTCSignaling)
**Purpose**: WebSocket-based signaling (basic implementation)
**Status**: ⚠️ **Appears to be legacy/unused**
**Features**:
- Basic WebSocket connection
- Mock signaling server for development
- Less sophisticated than HTTPSignaling

---

### 3. **WebRTC Configuration**

#### `src/lib/webrtc-config.ts`
**Purpose**: WebRTC peer connection configuration and utilities

**Key Functions**:

1. **`getWebRTCConfiguration()`**: Synchronous config with static credentials
   - Uses `NEXT_PUBLIC_TURN_URL`, `NEXT_PUBLIC_TURN_USERNAME`, `NEXT_PUBLIC_TURN_CREDENTIAL`
   - Falls back to STUN servers if TURN not configured

2. **`getWebRTCConfigurationAsync()`**: Async config with TURN REST API
   - Fetches time-limited credentials from `/api/turn/credentials`
   - Falls back to static config if API fails
   - **Preferred method** for production (dynamic credentials)

3. **`getMediaConstraints()`**: Media stream constraints
   - Quality presets: low/medium/high
   - Adaptive video resolution
   - Enhanced audio settings (echo cancellation, noise suppression)

4. **`requestMediaAccess()`**: Adaptive media request
   - Tries high quality first
   - Falls back to lower quality on failure
   - Graceful degradation (video → audio → basic)

5. **`createConnectionMonitor()`**: Connection state monitoring
   - Tracks connection/ICE connection states
   - Handles failure states

6. **`createAdvancedConnectionMonitor()`**: Advanced stats monitoring
   - RTCStats parsing
   - Quality calculation (excellent/good/poor/disconnected)
   - Bitrate monitoring

**ICE Server Priority**:
```typescript
1. Custom TURN server (UDP/TLS) - Highest priority
2. Google STUN servers
3. Cloudflare STUN servers
4. STUN protocol servers
```

---

### 4. **Backend API Routes**

#### `src/app/api/websocket/route.ts`
**Purpose**: HTTP-based signaling server (polling mechanism)
**How it works**:
- **In-memory store** for calls (Map structure)
- Each call stores:
  - `participants`: Map<userId, {userType, joinedAt, lastSeen}>
  - `messages`: Array of chat messages
  - `signals`: Array of WebRTC signals (offers/answers/ice-candidates)

**Endpoints**:
- `GET ?action=join`: Join a call, returns existing participants/messages
- `GET ?action=poll`: Poll for new messages/signals since timestamp
- `GET ?action=leave`: Leave a call, notify other participants
- `POST`: Send messages/signals

**Message Flow**:
```
Client sends offer → POST /api/websocket → Store in signals[]
Advisor polls → GET ?action=poll → Receives offer → Processes it
Advisor sends answer → POST /api/websocket → Store in signals[]
Client polls → Receives answer → Processes it
```

**⚠️ Issues**:
- **In-memory storage**: Data lost on server restart
- **No persistence**: Calls don't survive deployments
- **No Redis**: Could scale better with Redis pub/sub
- **Polling overhead**: 300ms polling from each client (2x per call)

#### `src/app/api/turn/credentials/route.ts`
**Purpose**: Generate time-limited TURN server credentials (TURN REST API)
**How it works**:

**TURN REST Authentication** (coturn `use-auth-secret`):
```typescript
// Username format: expiry_timestamp
const username = Math.floor(Date.now() / 1000) + ttlSeconds;

// Credential: HMAC-SHA1(username, secret)
const hmac = crypto.createHmac('sha1', TURN_STATIC_AUTH_SECRET);
hmac.update(username);
const credential = hmac.digest('base64');
```

**Environment Variables Required**:
- `TURN_REALM`: Authentication realm (default: "mashklanta.com")
- `TURN_STATIC_AUTH_SECRET`: Shared secret with coturn server
- `TURN_URL`: TURN server URL (e.g., "turn:mashklanta.com:3478")
- `TURN_TTL_SECONDS`: Credential validity (default: 86400 = 24 hours)
- `TURN_FORCE_RELAY`: Force relay-only mode (optional)

**Response Format**:
```json
{
  "realm": "mashklanta.com",
  "urls": "turn:mashklanta.com:3478" | ["turn:...", "turns:..."],
  "username": "1734567890",
  "credential": "base64_hmac_sha1",
  "forceRelay": false
}
```

---

### 5. **TURN Server Configuration**

#### `turn-server/coturn.conf`
**Purpose**: Coturn TURN server configuration

**Key Settings**:
```conf
# Ports
listening-port=3478        # UDP/TCP STUN/TURN
tls-listening-port=5349    # TLS/DTLS TURN

# Authentication (REST API)
use-auth-secret            # Enable TURN REST authentication
static-auth-secret=SECRET  # Shared secret (must match API secret)
realm=mashklanta.com       # Authentication realm

# Relay Settings
min-port=49152             # Relay port range
max-port=65535
total-quota=100            # Max concurrent sessions
user-quota=50              # Max per user

# Security
fingerprint                # Add fingerprint to responses
lt-cred-mech               # Long-term credential mechanism
no-tcp-relay               # Disable TCP relay (UDP only)
denied-peer-ip=...         # Block private IP ranges
```

**How Authentication Works**:
1. Client requests credentials from `/api/turn/credentials`
2. API generates username (expiry timestamp) and credential (HMAC-SHA1)
3. Client uses these in RTCPeerConnection config
4. TURN server validates using same secret
5. TURN server checks if username (timestamp) hasn't expired

---

## 🔄 Communication Flow

### Initial Connection Sequence

```
┌──────┐                                    ┌──────┐
│Client│                                    │Advisor│
└──┬───┘                                    └───┬──┘
   │                                             │
   │ 1. Connect to signaling                    │
   │    GET /api/websocket?action=join          │
   │◄───────────────────────────────────────────┤
   │                                             │
   │ 2. Request TURN credentials                │
   │    GET /api/turn/credentials               │
   │◄───────────────────────────────────────────┤
   │                                             │
   │ 3. Initialize WebRTC                        │
   │    Create RTCPeerConnection                │
   │    Add TURN servers to config              │
   │                                             │
   │ 4. Request media                            │
   │    getUserMedia()                          │
   │                                             │
   │ 5. Add tracks to peer connection           │
   │                                             │
   │ 6. Create offer                             │
   │    createOffer()                           │
   │                                             │
   │ 7. Send offer via signaling                │
   │    POST /api/websocket (offer)             │
   │───────────────────────────────────────────►│
   │                                             │
   │                                             │ 8. Poll for messages
   │                                             │    GET /api/websocket?action=poll
   │◄───────────────────────────────────────────┤
   │                                             │
   │                                             │ 9. Receive offer
   │                                             │    Set remote description
   │                                             │
   │                                             │ 10. Create answer
   │                                             │     createAnswer()
   │                                             │
   │                                             │ 11. Send answer
   │                                             │     POST /api/websocket (answer)
   │◄───────────────────────────────────────────┤
   │                                             │
   │ 12. Poll for messages                       │
   │     GET /api/websocket?action=poll         │
   │                                             │
   │ 13. Receive answer                         │
   │     Set remote description                 │
   │                                             │
   │ 14. ICE candidate exchange                  │
   │     (Multiple candidates)                  │
   │◄───────────────────────────────────────────►│
   │                                             │
   │ 15. WebRTC connection established          │
   │     via TURN relay (if needed)             │
   └─────────────────────────────────────────────┘
```

### Ongoing Signaling

- **Client polls every 300ms**: `GET /api/websocket?action=poll&since=timestamp`
- **Advisor polls every 300ms**: Same endpoint
- **Bidirectional**: Both can send offers/answers/candidates

---

## 🔐 TURN Server Authentication

### Authentication Flow

```
1. Client Browser
   └─► GET /api/turn/credentials
       └─► Next.js API Route
           ├─► Reads: TURN_STATIC_AUTH_SECRET (env var)
           ├─► Generates username: timestamp + TTL
           ├─► Generates credential: HMAC-SHA1(username, secret)
           └─► Returns: { username, credential, urls }

2. Client Browser
   └─► Creates RTCPeerConnection with:
       └─► iceServers: [{
             urls: "turn:mashklanta.com:3478",
             username: "1734567890",
             credential: "abc123..."
           }]

3. WebRTC Layer
   └─► During ICE gathering, sends TURN allocate request:
       ├─► Includes: username, credential
       └─► TURN Server validates using same secret

4. TURN Server (Coturn)
   ├─► Reads static-auth-secret from config
   ├─► Validates username format (timestamp)
   ├─► Checks expiry: current_time < username
   ├─► Calculates expected credential: HMAC-SHA1(username, secret)
   ├─► Compares with provided credential
   └─► If valid: Allows relay allocation
```

### Security Considerations

✅ **Good**:
- Time-limited credentials (24h default)
- HMAC-SHA1 for credential generation
- Shared secret stored server-side only
- Realm-based authentication

⚠️ **Potential Issues**:
- **No credential revocation**: If secret leaked, must rotate secret
- **No user-based auth**: Anyone with valid credentials can use TURN
- **Static secret**: Same secret used for all clients (should rotate periodically)

### Configuration Validation

**Required Environment Variables**:

**Server-side** (Next.js API):
```bash
TURN_REALM=mashklanta.com
TURN_STATIC_AUTH_SECRET=<shared_secret>
TURN_URL=turn:mashklanta.com:3478
TURN_TTL_SECONDS=86400
```

**Client-side** (Optional - for static credentials):
```bash
NEXT_PUBLIC_TURN_URL=turn:mashklanta.com:3478
NEXT_PUBLIC_TURN_USERNAME=<static_username>
NEXT_PUBLIC_TURN_CREDENTIAL=<static_credential>
```

**TURN Server** (coturn.conf):
```conf
static-auth-secret=<same_shared_secret>
realm=mashklanta.com
```

---

## 🌐 WebRTC Implementation Details

### Peer Connection Lifecycle

1. **Initialization**
   ```typescript
   const config = await getWebRTCConfigurationAsync();
   const pc = new RTCPeerConnection(config);
   ```

2. **Media Stream Setup**
   ```typescript
   const stream = await requestMediaAccess(isVideoOn, isAudioOn, ...);
   stream.getTracks().forEach(track => pc.addTrack(track, stream));
   ```

3. **Offer Creation**
   ```typescript
   pc.onnegotiationneeded = async () => {
     const offer = await pc.createOffer();
     await pc.setLocalDescription(offer);
     signaling.sendOffer(offer);
   };
   ```

4. **Answer Handling**
   ```typescript
   signaling.onMessage = (message) => {
     if (message.type === 'offer') {
       await pc.setRemoteDescription(message.data);
       const answer = await pc.createAnswer();
       await pc.setLocalDescription(answer);
       signaling.sendAnswer(answer);
     }
   };
   ```

5. **ICE Candidate Exchange**
   ```typescript
   pc.onicecandidate = (event) => {
     if (event.candidate) {
       signaling.sendIceCandidate(event.candidate);
     }
   };
   ```

6. **Remote Stream Reception**
   ```typescript
   pc.ontrack = (event) => {
     const [stream] = event.streams;
     remoteVideoRef.current.srcObject = stream;
   };
   ```

### Connection Monitoring

The system implements comprehensive connection monitoring:

```typescript
// Connection state monitoring
pc.onconnectionstatechange = () => {
  // States: new, connecting, connected, disconnected, failed, closed
};

// ICE connection monitoring
pc.oniceconnectionstatechange = () => {
  // States: new, checking, connected, completed, failed, disconnected, closed
};

// Custom monitoring (every 2 seconds)
- Checks video currentTime advancing
- Detects frozen video streams
- Monitors track ended states
- Tracks advisor activity heartbeat
```

---

## 📡 Signaling Mechanisms

### HTTP Polling (Current Implementation)

**Pros**:
- ✅ Works everywhere (no WebSocket support needed)
- ✅ Works behind firewalls
- ✅ Simple to implement
- ✅ Stateless (easier to scale)

**Cons**:
- ❌ Higher latency (300ms polling interval)
- ❌ Higher server load (constant polling)
- ❌ More bandwidth (repeated GET requests)

### WebSocket (Alternative Implementation)

**Pros**:
- ✅ Lower latency (real-time)
- ✅ Lower server load (persistent connection)
- ✅ Bidirectional (server can push)

**Cons**:
- ❌ Connection management complexity
- ❌ Firewall/NAT issues
- ❌ Reconnection logic needed

**Current Status**: ⚠️ Not actively used - client uses HTTP polling

---

## ⚠️ Identified Issues

### 🔴 Critical Issues

#### 1. **In-Memory Signaling Store**
**Location**: `src/app/api/websocket/route.ts`
**Problem**: 
- Data stored in `Map<string, Call>` - lost on server restart
- No persistence between deployments
- Calls fail if Next.js server restarts

**Impact**: High - production calls will drop on deployments

**Solution**: 
- Use Redis for signaling store
- Or use database for persistence
- Or use serverless-compatible solution (Upstash Redis)

#### 2. **Race Conditions in WebRTC Initialization**
**Location**: `src/app/video-call/[id]/page.tsx`
**Problem**:
- Multiple `useEffect` hooks can trigger WebRTC init simultaneously
- `initializeWebRTC()` called multiple times
- Connection negotiation can conflict

**Evidence**:
```typescript
// Multiple useEffects can trigger this
useEffect(() => {
  if (callState.isConnected) {
    await initializeWebRTC(); // Can be called multiple times
  }
}, [callState.isConnected]);

useEffect(() => {
  if (isSignalingConnected) {
    await initializeWebRTC(); // Race condition!
  }
}, [isSignalingConnected]);
```

**Impact**: Medium - causes failed connections or negotiation errors

**Solution**: Add initialization guard/mutex

#### 3. **TURN Credential Mismatch Risk**
**Location**: `src/app/api/turn/credentials/route.ts` vs `turn-server/coturn.conf`
**Problem**:
- Secret must match exactly between API and coturn
- No validation that secret is configured correctly
- No health check endpoint

**Impact**: Medium - authentication will fail silently

**Solution**: Add health check endpoint that validates TURN server connectivity

#### 4. **No Error Recovery for Signaling Failures**
**Location**: `src/lib/http-signaling.ts`
**Problem**:
- If polling fails, connection is marked as disconnected
- No retry logic with exponential backoff
- No fallback to alternative signaling method

**Impact**: Medium - temporary network issues can drop calls

**Solution**: Implement retry logic with exponential backoff

### 🟡 Medium Issues

#### 5. **Polling Overhead**
**Problem**: Each client polls every 300ms
- For a call with 2 participants: 6.67 requests/second
- 100 concurrent calls: 667 requests/second
- High server load for simple polling

**Solution**: 
- Reduce polling to 500-1000ms when no activity
- Implement Server-Sent Events (SSE) for better efficiency
- Use WebSocket for real-time communication

#### 6. **Video Freeze Detection Issues**
**Location**: `src/app/video-call/[id]/page.tsx` - `handleVideoFreeze()`
**Problem**:
- Multiple recovery strategies can conflict
- No priority ordering for recovery methods
- Can cause infinite recovery loops

**Solution**: Implement recovery queue with priority

#### 7. **No Call Recording/Logging**
**Problem**: 
- No logging of call start/end times
- No analytics for call quality
- No debugging information stored

**Impact**: Low - makes troubleshooting difficult

### 🟢 Minor Issues

#### 8. **Hardcoded Values**
- Polling interval: 300ms (should be configurable)
- Reconnection attempts: 3 (should be configurable)
- TTL: 86400 seconds (24h - should be shorter for security)

#### 9. **Missing Environment Variable Validation**
**Problem**: No validation that required env vars are set
**Solution**: Add startup validation

#### 10. **Debug Console Always Available**
**Problem**: Debug console exposes sensitive connection info
**Solution**: Only show in development mode or behind feature flag

---

## 💡 Recommendations

### Immediate Actions (High Priority)

1. **Add Redis for Signaling**
   ```typescript
   // Replace in-memory Map with Redis
   import { redis } from '@/lib/redis';
   
   // Store signals with TTL
   await redis.setex(`call:${callId}:signals`, 3600, JSON.stringify(signals));
   ```

2. **Fix Race Conditions**
   ```typescript
   let isInitializing = false;
   
   const initializeWebRTC = async () => {
     if (isInitializing) return;
     isInitializing = true;
     try {
       // ... initialization
     } finally {
       isInitializing = false;
     }
   };
   ```

3. **Add TURN Health Check**
   ```typescript
   // New endpoint: /api/turn/health
   export async function GET() {
     // Test TURN server connectivity
     // Validate secret matches
   }
   ```

### Short-term Improvements (Medium Priority)

4. **Implement WebSocket Signaling**
   - Use Socket.IO or native WebSocket
   - Fallback to HTTP polling
   - Better real-time performance

5. **Add Connection Quality Monitoring**
   - Log connection stats to database
   - Track call quality metrics
   - Alert on poor connections

6. **Improve Error Recovery**
   - Exponential backoff for retries
   - Circuit breaker pattern
   - Graceful degradation

### Long-term Enhancements (Low Priority)

7. **Add Call Recording**
   - Record audio/video streams
   - Store in S3
   - Add transcription

8. **Implement Call Analytics**
   - Call duration tracking
   - Quality metrics
   - Usage statistics

9. **Add Load Testing**
   - Test with 100+ concurrent calls
   - Measure server performance
   - Optimize bottlenecks

---

## 📊 Architecture Diagram (Detailed)

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Video Call Page ([id]/page.tsx)               │ │
│  │  - Video/Audio stream management                       │ │
│  │  - Device selection                                    │ │
│  │  - Connection monitoring                               │ │
│  └───────────────┬────────────────────────────────────────┘ │
│                  │                                           │
│  ┌───────────────▼────────────────────────────────────────┐ │
│  │         HTTPSignaling                                   │ │
│  │  - HTTP polling (300ms)                                │ │
│  │  - Message deduplication                                │ │
│  └───────────────┬────────────────────────────────────────┘ │
│                  │                                           │
│  ┌───────────────▼────────────────────────────────────────┐ │
│  │         WebRTC Config                                   │ │
│  │  - TURN credential fetching                             │ │
│  │  - ICE server configuration                             │ │
│  └───────────────┬────────────────────────────────────────┘ │
└──────────────────┼───────────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         │  HTTP Polling     │  WebRTC
         │  (Signaling)      │  (Media)
         │                   │
┌────────▼────────┐   ┌──────▼──────────┐
│  Next.js API    │   │  TURN Server     │
│  /api/websocket │   │  (Coturn)        │
│  /api/turn/...  │   │  Port 3478       │
└────────┬────────┘   └──────────────────┘
         │
         │ Store in memory
         │ (Map structure)
         │
┌─────────▼──────────┐
│  Call Store        │
│  - participants    │
│  - messages        │
│  - signals         │
└────────────────────┘
```

---

## 🔍 Code Flow Analysis

### Client Join Call Flow

1. **Page Load** → `useEffect` triggers when `callId` available
2. **Initialize Devices** → `initializeDevices()` enumerates cameras/mics
3. **Initialize Signaling** → `initializeSignaling()` creates HTTPSignaling instance
4. **Connect Signaling** → `signaling.connect()` sends JOIN request
5. **Request Permissions** → `MediaPermissionCheck` component
6. **User Clicks Join** → `joinCall()` called
7. **Initialize WebRTC** → `initializeWebRTC()`:
   - Request media access
   - Create RTCPeerConnection
   - Add tracks to peer connection
   - Trigger negotiation (offer creation)
8. **Send Offer** → Offer sent via HTTPSignaling
9. **Poll for Answer** → Client polls every 300ms
10. **Receive Answer** → Process answer, set remote description
11. **ICE Exchange** → Exchange candidates until connection established

### Signaling Message Types

```typescript
type SignalingMessage = {
  type: 'offer' | 'answer' | 'ice-candidate' | 
        'chat-message' | 'user-joined' | 
        'user-left' | 'call-ended';
  data: any;  // WebRTC SDP or chat message
  from: string;
  to?: string;
  callId: string;
  timestamp: number;
}
```

---

## 🎯 Summary

The video calling system is a **well-structured WebRTC implementation** with:

✅ **Strengths**:
- Comprehensive connection monitoring
- Multiple recovery strategies
- Adaptive media quality
- TURN server integration with REST API authentication
- Debug tools for troubleshooting

⚠️ **Weaknesses**:
- In-memory signaling store (not production-ready)
- Race conditions in initialization
- High polling overhead
- Limited error recovery
- No persistence layer

🔧 **Key Fixes Needed**:
1. Replace in-memory store with Redis
2. Fix race conditions with initialization guards
3. Add TURN server health checks
4. Implement better error recovery

The system demonstrates a solid understanding of WebRTC principles and provides a good foundation for a production video calling system, but requires the critical fixes mentioned above before being production-ready.

