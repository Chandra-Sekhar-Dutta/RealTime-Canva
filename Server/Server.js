const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const RoomManager = require('./rooms');
const DrawingStateManager = require('./drawing-state');

const PORT = process.env.PORT || 3000;
const CLIENT_PATH = path.join(__dirname, '../Client');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager();
const drawingStateManager = new DrawingStateManager();

const roomUserCounters = new Map();

app.use(cors());
app.use(express.json());
app.use(express.static(CLIENT_PATH));

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

app.get('/', (req, res) => {
  res.sendFile(path.join(CLIENT_PATH, 'index.html'));
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  let currentRoom = null;
  let currentUserId = null;
  let currentUsername = null;
  
  socket.on('join-room', ({ roomId, userId, username, color }) => {
    currentRoom = roomId;
    currentUserId = userId;
    
    if (!roomUserCounters.has(roomId)) {
      roomUserCounters.set(roomId, 1);
    }
    const userNumber = roomUserCounters.get(roomId);
    currentUsername = `User${userNumber}`;
    roomUserCounters.set(roomId, userNumber + 1);
    
    socket.join(roomId);
    
    roomManager.addClient(roomId, userId, socket.id, currentUsername, color);
    
    const roomClients = roomManager.getRoomClients(roomId);
    const users = roomClients.map(c => ({
      userId: c.userId,
      username: c.username,
      color: c.color
    }));
    
    socket.emit('username-assigned', { username: currentUsername });
    socket.emit('users-update', { users: users.filter(u => u.userId !== userId) });
    
    const canvasState = drawingStateManager.getState(roomId);
    if (canvasState) {
      socket.emit('canvas-state', {
        canvasData: canvasState.canvasData,
        version: canvasState.version
      });
    }
    
    socket.to(roomId).emit('user-joined', {
      userId,
      username: currentUsername,
      color,
      socketId: socket.id
    });
    
    console.log(`User ${currentUsername} (${userId}) joined room ${roomId}`);
  });
  
  socket.on('cursor-move', ({ roomId, userId, pos }) => {
    if (!currentRoom) return;
    
    roomManager.updateCursorPosition(roomId, userId, pos);
    
    socket.to(roomId).emit('cursor-move', {
      userId,
      pos
    });
  });
  
  socket.on('drawing', (data) => {
    if (!currentRoom) return;
    
    socket.to(currentRoom).emit('drawing', {
      ...data,
      userId: currentUserId,
      socketId: socket.id
    });
  });
  
  socket.on('canvas-state', ({ roomId, canvasData }) => {
    drawingStateManager.saveState(roomId, canvasData);
    roomManager.setCanvasState(roomId, canvasData);
    
    socket.to(roomId).emit('canvas-state', {
      canvasData,
      userId: currentUserId
    });
  });
  
  socket.on('request-canvas-state', ({ roomId }) => {
    const canvasState = drawingStateManager.getState(roomId);
    if (canvasState) {
      socket.emit('canvas-state', {
        canvasData: canvasState.canvasData,
        version: canvasState.version
      });
    }
  });
  
  socket.on('clear-canvas', ({ roomId }) => {
    io.to(roomId).emit('clear-canvas', {
      userId: currentUserId
    });
    
    drawingStateManager.clearState(roomId);
  });
  
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    
    if (currentRoom) {
      const client = roomManager.removeClient(currentRoom, socket.id);
      
      if (client) {
        socket.to(currentRoom).emit('user-left', {
          userId: client.userId,
          username: client.username,
          socketId: socket.id
        });
      }
    }
  });
  
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

setInterval(() => {
  roomManager.cleanupInactiveRooms();
  drawingStateManager.cleanup();
}, 300000);

server.listen(PORT, () => {
  console.log(`Collaborative Canvas Server Running`);
});

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
