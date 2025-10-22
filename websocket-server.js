const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for your domain
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://your-domain.com", "https://www.your-domain.com"]
      : ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store active calls
const activeCalls = new Map();

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a call room
  socket.on('join-call', (data) => {
    const { callId, userId, userType } = data;
    
    // Join the socket to the call room
    socket.join(callId);
    
    // Store user info
    socket.callId = callId;
    socket.userId = userId;
    socket.userType = userType;
    
    // Initialize call if it doesn't exist
    if (!activeCalls.has(callId)) {
      activeCalls.set(callId, {
        participants: new Map(),
        messages: []
      });
    }
    
    // Add participant to call
    const call = activeCalls.get(callId);
    call.participants.set(userId, {
      socketId: socket.id,
      userType,
      joinedAt: new Date()
    });
    
    console.log(`User ${userId} (${userType}) joined call ${callId}`);
    
    // Notify other participants
    socket.to(callId).emit('user-joined', {
      userId,
      userType,
      callId,
      timestamp: Date.now()
    });
    
    // Send current participants to the new user
    const participants = Array.from(call.participants.entries()).map(([id, info]) => ({
      userId: id,
      userType: info.userType,
      joinedAt: info.joinedAt
    }));
    
    socket.emit('call-info', {
      callId,
      participants,
      messages: call.messages.slice(-50) // Last 50 messages
    });
  });

  // Handle WebRTC signaling
  socket.on('webrtc-signal', (data) => {
    const { type, target, signal } = data;
    
    if (socket.callId) {
      // Forward the signal to the target user or broadcast to all
      if (target && target !== 'broadcast') {
        socket.to(socket.callId).emit('webrtc-signal', {
          type,
          from: socket.userId,
          signal,
          timestamp: Date.now()
        });
      } else {
        // Broadcast to all other participants in the call
        socket.to(socket.callId).emit('webrtc-signal', {
          type,
          from: socket.userId,
          signal,
          timestamp: Date.now()
        });
      }
    }
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    const { message } = data;
    
    if (socket.callId) {
      const call = activeCalls.get(socket.callId);
      if (call) {
        const chatMessage = {
          id: Date.now().toString(),
          from: socket.userId,
          message,
          timestamp: Date.now(),
          userType: socket.userType
        };
        
        // Store message
        call.messages.push(chatMessage);
        
        // Broadcast to all participants in the call
        io.to(socket.callId).emit('chat-message', chatMessage);
        
        console.log(`Chat message in call ${socket.callId} from ${socket.userId}: ${message}`);
      }
    }
  });

  // Handle screen sharing
  socket.on('screen-share-start', (data) => {
    if (socket.callId) {
      socket.to(socket.callId).emit('screen-share-start', {
        from: socket.userId,
        timestamp: Date.now()
      });
    }
  });

  socket.on('screen-share-end', (data) => {
    if (socket.callId) {
      socket.to(socket.callId).emit('screen-share-end', {
        from: socket.userId,
        timestamp: Date.now()
      });
    }
  });

  // Handle call end
  socket.on('end-call', () => {
    if (socket.callId) {
      socket.to(socket.callId).emit('call-ended', {
        from: socket.userId,
        timestamp: Date.now()
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    if (socket.callId && socket.userId) {
      const call = activeCalls.get(socket.callId);
      if (call) {
        // Remove participant
        call.participants.delete(socket.userId);
        
        // Notify other participants
        socket.to(socket.callId).emit('user-left', {
          userId: socket.userId,
          userType: socket.userType,
          timestamp: Date.now()
        });
        
        // Clean up empty calls
        if (call.participants.size === 0) {
          activeCalls.delete(socket.callId);
          console.log(`Call ${socket.callId} ended - no participants left`);
        }
      }
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeCalls: activeCalls.size,
    uptime: process.uptime()
  });
});

// Get call info endpoint
app.get('/call/:callId', (req, res) => {
  const { callId } = req.params;
  const call = activeCalls.get(callId);
  
  if (call) {
    const participants = Array.from(call.participants.entries()).map(([id, info]) => ({
      userId: id,
      userType: info.userType,
      joinedAt: info.joinedAt
    }));
    
    res.json({
      callId,
      participants,
      messageCount: call.messages.length,
      isActive: true
    });
  } else {
    res.status(404).json({ error: 'Call not found' });
  }
});

const PORT = process.env.WEBSOCKET_PORT || 3001;

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = { app, server, io };
