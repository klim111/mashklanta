# Video Call Deployment Guide for Vercel

## Overview

This guide explains how to deploy the video calling system on Vercel and troubleshoot common issues.

## Key Changes Made for Vercel Compatibility

### 1. HTTP Signaling Implementation
- **Problem**: Vercel's serverless functions don't support persistent WebSocket connections
- **Solution**: Implemented HTTP polling-based signaling using `/api/websocket` route
- **Files Modified**:
  - `src/app/api/websocket/route.ts` - HTTP-based signaling server
  - `src/lib/http-signaling.ts` - Client-side HTTP signaling implementation

### 2. Optimized WebRTC Configuration
- **Problem**: Default WebRTC settings may not work well in serverless environments
- **Solution**: Created optimized configuration for Vercel deployment
- **Files Added**:
  - `src/lib/webrtc-config.ts` - Optimized WebRTC settings

### 3. Enhanced Error Handling
- **Problem**: Connection failures weren't handled gracefully
- **Solution**: Added comprehensive error handling and reconnection logic
- **Files Modified**:
  - `src/components/advisor-dashboard/VideoCallModal.tsx`
  - `src/app/video-call/[id]/page.tsx`

## Deployment Steps

### 1. Environment Variables
Add these environment variables in your Vercel dashboard:

```bash
# Optional: Custom WebSocket server URL (if you deploy a separate WebSocket server)
NEXT_PUBLIC_WEBSOCKET_URL=https://your-websocket-server.com

# Optional: Frontend URL for CORS (if needed)
FRONTEND_URL=https://your-domain.vercel.app
```

### 2. Deploy to Vercel
```bash
# Install dependencies
npm install

# Build the project
npm run build

# Deploy to Vercel
vercel --prod
```

### 3. Verify Deployment
1. Check that the API route is working: `https://your-domain.vercel.app/api/websocket`
2. Test video call functionality between advisor and client
3. Monitor browser console for any errors

## How It Works

### Signaling Flow
1. **Advisor starts call**: Creates call ID and generates share link
2. **Client joins**: Uses share link to join the same call
3. **HTTP Polling**: Both sides poll `/api/websocket` every 300ms for new messages
4. **WebRTC Exchange**: Offers, answers, and ICE candidates are exchanged via HTTP
5. **Direct Connection**: Once WebRTC is established, video/audio flows directly between peers

### API Endpoints

#### GET `/api/websocket`
- `action=join`: Join a call
- `action=poll`: Poll for new messages/signals
- `action=leave`: Leave a call

#### POST `/api/websocket`
- Send WebRTC signals (offers, answers, ICE candidates)
- Send chat messages
- Send call events (screen share, call end)

## Troubleshooting

### Common Issues

#### 1. "Signaling not connected"
**Symptoms**: Red connection indicator, no video/audio
**Causes**:
- API route not deployed properly
- CORS issues
- Network connectivity problems

**Solutions**:
```bash
# Check API route
curl https://your-domain.vercel.app/api/websocket?action=join&callId=test&userId=test&userType=advisor

# Check browser console for errors
# Verify CORS headers in API response
```

#### 2. "WebRTC connection failed"
**Symptoms**: Video/audio not working despite signaling connection
**Causes**:
- Firewall blocking STUN servers
- NAT traversal issues
- Browser permissions

**Solutions**:
```javascript
// Check WebRTC support
console.log('WebRTC supported:', !!window.RTCPeerConnection);

// Check media permissions
navigator.mediaDevices.getUserMedia({video: true, audio: true})
  .then(stream => console.log('Media access OK'))
  .catch(err => console.error('Media access failed:', err));
```

#### 3. "Video not displaying"
**Symptoms**: Connection established but no video stream
**Causes**:
- Video element not properly configured
- Stream not attached to video element
- Browser autoplay policies

**Solutions**:
```javascript
// Ensure video element has proper attributes
<video
  ref={remoteVideoRef}
  autoPlay
  playsInline
  muted={false} // For remote video
  className="w-full h-full object-cover"
/>

// Check if stream is active
console.log('Stream active:', remoteStream.active);
console.log('Video tracks:', remoteStream.getVideoTracks().length);
```

### Debug Mode

Enable debug logging by adding this to your browser console:
```javascript
localStorage.setItem('debug', 'webrtc,signaling');
```

### Performance Optimization

#### 1. Reduce Polling Frequency
For better performance, you can reduce polling frequency:
```typescript
// In http-signaling.ts
}, 500); // Change from 300ms to 500ms
```

#### 2. Optimize Video Quality
Adjust video constraints based on connection:
```typescript
// In webrtc-config.ts
const getMediaConstraints = (isVideoOn: boolean, isAudioOn: boolean, deviceId?: string) => {
  return {
    video: isVideoOn ? {
      width: { ideal: 640, max: 1280 }, // Reduced resolution
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 15, max: 30 }, // Reduced frame rate
    } : false,
    // ... rest of constraints
  };
};
```

## Production Considerations

### 1. Use Redis for Signaling
For production, replace in-memory storage with Redis:
```typescript
// Replace callStore Map with Redis
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
```

### 2. Add TURN Servers
For better NAT traversal, add TURN servers:
```typescript
// In webrtc-config.ts
iceServers: [
  // ... STUN servers
  { 
    urls: 'turn:your-turn-server.com:3478', 
    username: 'user', 
    credential: 'pass' 
  }
]
```

### 3. Implement Rate Limiting
Add rate limiting to prevent abuse:
```typescript
// In websocket route.ts
const rateLimiter = new Map();
// Implement rate limiting logic
```

### 4. Add Monitoring
Monitor call quality and connection success rates:
```typescript
// Add analytics tracking
analytics.track('video_call_started', {
  callId,
  userId,
  userType
});
```

## Testing

### Manual Testing
1. Open advisor dashboard in one browser tab
2. Open client video call page in another tab
3. Start call from advisor side
4. Join call from client side
5. Verify video/audio works in both directions

### Automated Testing
```bash
# Run tests
npm test

# Test WebRTC functionality
npm run test:webrtc
```

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify API endpoints are responding
3. Test with different browsers/devices
4. Check network connectivity and firewall settings
5. Review Vercel function logs

## Changelog

- **v1.0**: Initial HTTP signaling implementation
- **v1.1**: Added optimized WebRTC configuration
- **v1.2**: Enhanced error handling and reconnection logic
- **v1.3**: Improved polling efficiency and debugging
