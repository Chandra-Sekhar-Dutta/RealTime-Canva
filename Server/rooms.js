/**
 * Room Management Module
 * Handles multiple drawing rooms and client connections
 */

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }
  
  /**
   * Get or create a room
   */
  getRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        clients: new Set(),
        canvasState: null,
        createdAt: new Date(),
        lastActivity: new Date()
      });
      console.log(`Created room: ${roomId}`);
    }
    return this.rooms.get(roomId);
  }
  
  /**
   * Add client to room
   */
  addClient(roomId, userId, socketId, username, color) {
    const room = this.getRoom(roomId);
    room.clients.add({ userId, socketId, username, color, cursorPos: null });
    room.lastActivity = new Date();
    
    console.log(`User ${username} (${userId}) joined room ${roomId} (${room.clients.size} users)`);
    return room;
  }
  
  /**
   * Remove client from room
   */
  removeClient(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    
    // Find and remove client by socket ID
    for (const client of room.clients) {
      if (client.socketId === socketId) {
        room.clients.delete(client);
        console.log(`User ${client.username} left room ${roomId} (${room.clients.size} remaining)`);
        
        // Clean up empty rooms after a delay
        if (room.clients.size === 0) {
          setTimeout(() => {
            if (room.clients.size === 0) {
              this.rooms.delete(roomId);
              console.log(`Deleted empty room: ${roomId}`);
            }
          }, 60000); // 1 minute grace period
        }
        
        return client;
      }
    }
    return null;
  }
  
  /**
   * Update user cursor position
   */
  updateCursorPosition(roomId, userId, cursorPos) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    for (const client of room.clients) {
      if (client.userId === userId) {
        client.cursorPos = cursorPos;
        return true;
      }
    }
    return false;
  }
  
  /**
   * Get all clients in a room
   */
  getRoomClients(roomId) {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.clients) : [];
  }
  
  /**
   * Update canvas state for a room
   */
  setCanvasState(roomId, canvasData) {
    const room = this.getRoom(roomId);
    room.canvasState = canvasData;
    room.lastActivity = new Date();
    console.log(`Canvas state updated for room ${roomId}`);
  }
  
  /**
   * Get canvas state for a room
   */
  getCanvasState(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.canvasState : null;
  }
  
  /**
   * Get room statistics
   */
  getRoomStats() {
    const stats = [];
    for (const [roomId, room] of this.rooms) {
      stats.push({
        roomId,
        clientCount: room.clients.size,
        hasCanvasState: !!room.canvasState,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity
      });
    }
    return stats;
  }
  
  /**
   * Clean up old inactive rooms
   */
  cleanupInactiveRooms(maxAge = 3600000) { // 1 hour default
    const now = Date.now();
    for (const [roomId, room] of this.rooms) {
      if (room.clients.size === 0 && (now - room.lastActivity.getTime()) > maxAge) {
        this.rooms.delete(roomId);
        console.log(`Cleaned up inactive room: ${roomId}`);
      }
    }
  }
}

module.exports = RoomManager;
