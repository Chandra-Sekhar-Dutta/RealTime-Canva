/**
 * Express + Socket.IO Server
 * Main server entry point for collaborative canvas
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const RoomManager = require('./rooms');
const DrawingStateManager = require('./drawing-state');

// Configuration
const PORT = process.env.PORT || 3000;
const CLIENT_PATH = path.join(__dirname, '../Client');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize managers
const roomManager = new RoomManager();
const drawingStateManager = new DrawingStateManager();

// Counter for anonymous usernames
const roomUserCounters = new Map(); // roomId -> counter

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(CLIENT_PATH));

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/rooms', (req, res) => {
  const rooms = roomManager.getRoomStats();
  res.json({ rooms });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = roomManager.getRoom(roomId);
  const state = drawingStateManager.getStateMetadata(roomId);
  
  res.json({
    roomId,
    clientCount: room.clients.size,
    state
  });
});

// Serve signin page as homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(CLIENT_PATH, 'signin.html'));
});

// Serve canvas app
app.get('/canvas', (req, res) => {
  res.sendFile(path.join(CLIENT_PATH, 'index.html'));
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  let currentRoom = null;
  let currentUserId = null;
  let currentUsername = null;
  
  // Join room
  socket.on('join-room', ({ roomId, userId, username, color }) => {
    currentRoom = roomId;
    currentUserId = userId;
    
    // Assign anonymous username
    if (!roomUserCounters.has(roomId)) {
      roomUserCounters.set(roomId, 1);
    }
    const userNumber = roomUserCounters.get(roomId);
    currentUsername = `User${userNumber}`;
    roomUserCounters.set(roomId, userNumber + 1);
    
    // Join Socket.IO room
    socket.join(roomId);
    
    // Add to room manager
    roomManager.addClient(roomId, userId, socket.id, currentUsername, color);
    
    // Get all users in room
    const roomClients = roomManager.getRoomClients(roomId);
    const users = roomClients.map(c => ({
      userId: c.userId,
      username: c.username,
      color: c.color
    }));
    
    // Send assigned username and current users to new client
    socket.emit('username-assigned', { username: currentUsername });
    socket.emit('users-update', { users: users.filter(u => u.userId !== userId) });
    
    // Send current canvas state to new client
    const canvasState = drawingStateManager.getState(roomId);
    if (canvasState) {
      socket.emit('canvas-state', {
        canvasData: canvasState.canvasData,
        version: canvasState.version
      });
    }
    
    // Notify other clients
    socket.to(roomId).emit('user-joined', {
      userId,
      username: currentUsername,
      color,
      socketId: socket.id
    });
    
    console.log(`User ${currentUsername} (${userId}) joined room ${roomId}`);
  });
  
  // Handle cursor movement
  socket.on('cursor-move', ({ roomId, userId, pos }) => {
    if (!currentRoom) return;
    
    // Update cursor position in room
    roomManager.updateCursorPosition(roomId, userId, pos);
    
    // Broadcast to other clients
    socket.to(roomId).emit('cursor-move', {
      userId,
      pos
    });
  });
  
  // Handle drawing events
  socket.on('drawing', (data) => {
    if (!currentRoom) return;
    
    // Broadcast to other clients in the room
    socket.to(currentRoom).emit('drawing', {
      ...data,
      userId: currentUserId,
      socketId: socket.id
    });
  });
  
  // Handle canvas state updates
  socket.on('canvas-state', ({ roomId, canvasData }) => {
    // Save canvas state
    drawingStateManager.saveState(roomId, canvasData);
    roomManager.setCanvasState(roomId, canvasData);
    
    // Broadcast to other clients
    socket.to(roomId).emit('canvas-state', {
      canvasData,
      userId: currentUserId
    });
  });
  
  // Handle canvas state requests
  socket.on('request-canvas-state', ({ roomId }) => {
    const canvasState = drawingStateManager.getState(roomId);
    if (canvasState) {
      socket.emit('canvas-state', {
        canvasData: canvasState.canvasData,
        version: canvasState.version
      });
    }
  });
  
  // Handle clear canvas
  socket.on('clear-canvas', ({ roomId }) => {
    // Broadcast clear to all clients in room
    io.to(roomId).emit('clear-canvas', {
      userId: currentUserId
    });
    
    // Clear saved state
    drawingStateManager.clearState(roomId);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    
    if (currentRoom) {
      const client = roomManager.removeClient(currentRoom, socket.id);
      
      if (client) {
        // Notify other clients
        socket.to(currentRoom).emit('user-left', {
          userId: client.userId,
          username: client.username,
          socketId: socket.id
        });
      }
    }
  });
  
  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Periodic cleanup of inactive rooms and old states
setInterval(() => {
  roomManager.cleanupInactiveRooms();
  drawingStateManager.cleanup();
}, 300000); // Every 5 minutes

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   Collaborative Canvas Server Running        ║
╠═══════════════════════════════════════════════╣
║   Port:        ${PORT}                           ║
║   Client Path: ${CLIENT_PATH}
║   Socket.IO:   Enabled                        ║
╚═══════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
