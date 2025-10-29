# WebRTC Video Call Troubleshooting Guide

## Overview
This guide helps diagnose and fix video streaming issues in the WebRTC video calling system deployed on Vercel.

## Quick Diagnosis Steps

### 1. Check Debug Console
- Click the WiFi icon in the video call controls to open the debug console
- Look for connection states and error messages
- Copy debug info and share for analysis

### 2. Common Issues and Solutions

#### Issue: ICE Connection Failed
**Symptoms:**
- Debug console shows `iceConnectionState: failed`
- No video/audio streams between parties
- Chat messages work but media doesn't

**Causes:**
- Both parties behind symmetric NATs
- Corporate firewalls blocking WebRTC
- Missing TURN server configuration

**Solutions:**
1. Configure TURN server in Vercel environment variables:
   ```
   NEXT_PUBLIC_TURN_URL=turn:your-turn-server.com:3478
   NEXT_PUBLIC_TURN_USERNAME=your-username
   NEXT_PUBLIC_TURN_CREDENTIAL=your-password
   NEXT_PUBLIC_FORCE_TURN=true
   ```

2. Use a reliable TURN service:
   - Twilio STUN/TURN
   - Xirsys
   - Custom TURN server

#### Issue: Connection Established but No Remote Video
**Symptoms:**
- `connectionState: connected`
- `iceConnectionState: connected`
- Local video works, remote video doesn't appear

**Causes:**
- Media permissions not granted
- Video tracks disabled
- Browser autoplay restrictions

**Solutions:**
1. Ensure both parties grant camera/microphone permissions
2. Check if video tracks are enabled in debug console
3. Click on video elements to trigger autoplay
4. Verify `ontrack` events are firing

#### Issue: Media Access Denied
**Symptoms:**
- Permission check fails
- No local video/audio
- Browser shows permission denied

**Solutions:**
1. Grant permissions in browser settings
2. Check if camera/microphone are in use by other applications
3. Try different browser or incognito mode
4. Verify HTTPS is enabled (required for media access)

### 3. Browser-Specific Issues

#### Chrome/Edge
- Check `chrome://settings/content/camera` and `chrome://settings/content/microphone`
- Disable hardware acceleration if having issues
- Try `--disable-web-security` flag for testing

#### Firefox
- Check `about:preferences#privacy` for camera/microphone settings
- Disable `media.peerconnection.ice.no_host` in about:config

#### Safari
- Ensure `Develop > Disable Cross-Origin Restrictions` is off
- Check `Safari > Preferences > Websites > Camera/Microphone`

### 4. Network Troubleshooting

#### Check STUN/TURN Connectivity
```javascript
// Run in browser console
const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});

pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('ICE candidate:', event.candidate.type, event.candidate.candidate);
  }
};

pc.createOffer().then(offer => pc.setLocalDescription(offer));
```

#### Test TURN Server
```javascript
// Test TURN server connectivity
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' }
  ]
});

pc.onicecandidate = (event) => {
  if (event.candidate && event.candidate.candidate.includes('relay')) {
    console.log('TURN candidate found:', event.candidate);
  }
};
```

### 5. Vercel-Specific Considerations

#### Environment Variables
Ensure these are set in Vercel dashboard:
- `NEXT_PUBLIC_TURN_URL`
- `NEXT_PUBLIC_TURN_USERNAME`
- `NEXT_PUBLIC_TURN_CREDENTIAL`
- `NEXT_PUBLIC_FORCE_TURN=true` (if needed)

#### Serverless Limitations
- WebRTC signaling uses HTTP polling (not persistent WebSockets)
- Each API call is stateless
- Consider Redis for production signaling storage

### 6. Debug Information Collection

When reporting issues, collect:
1. Debug console output (copy/download from debug panel)
2. Browser console logs
3. Network conditions (NAT type, firewall)
4. Browser version and OS
5. Whether TURN server is configured

### 7. Testing Checklist

- [ ] Both parties can access camera/microphone
- [ ] ICE connection state reaches 'connected'
- [ ] Remote tracks are received (`ontrack` events fire)
- [ ] Video elements have `srcObject` set
- [ ] Video elements are not paused
- [ ] No browser autoplay restrictions
- [ ] TURN server configured if behind NATs

### 8. Advanced Debugging

#### Enable Detailed Logging
Add to browser console:
```javascript
// Enable WebRTC logging
localStorage.setItem('webrtc-debug', 'true');
```

#### Monitor RTC Stats
The debug console shows:
- Inbound/outbound RTP stats
- Candidate pair information
- Frame rates and resolutions
- Packet loss and latency

#### Network Analysis
Use browser dev tools Network tab to monitor:
- Signaling API calls to `/api/websocket`
- ICE candidate exchanges
- Media stream data

## Getting Help

If issues persist:
1. Collect debug information using the debug console
2. Test with different browsers/devices
3. Try from different network locations
4. Verify TURN server configuration
5. Check Vercel deployment logs

## Production Recommendations

1. **Use a reliable TURN service** - Essential for production
2. **Monitor connection success rates** - Track ICE connection failures
3. **Implement fallback strategies** - Audio-only mode, reconnection logic
4. **Test across different networks** - Corporate, mobile, residential
5. **Consider WebRTC analytics** - Monitor call quality and failures
