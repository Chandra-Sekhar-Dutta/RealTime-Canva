/**
 * Drawing State Management Module
 * Handles canvas state persistence and synchronization
 */

class DrawingStateManager {
  constructor() {
    this.states = new Map(); // roomId -> canvas state
  }
  
  /**
   * Save canvas state for a room
   */
  saveState(roomId, canvasData) {
    this.states.set(roomId, {
      canvasData,
      timestamp: Date.now(),
      version: (this.states.get(roomId)?.version || 0) + 1
    });
    console.log(`Saved canvas state for room ${roomId}`);
  }
  
  /**
   * Get canvas state for a room
   */
  getState(roomId) {
    return this.states.get(roomId) || null;
  }
  
  /**
   * Clear canvas state for a room
   */
  clearState(roomId) {
    this.states.delete(roomId);
    console.log(`Cleared canvas state for room ${roomId}`);
  }
  
  /**
   * Get all room IDs with saved states
   */
  getAllRoomIds() {
    return Array.from(this.states.keys());
  }
  
  /**
   * Check if a room has saved state
   */
  hasState(roomId) {
    return this.states.has(roomId);
  }
  
  /**
   * Get state metadata
   */
  getStateMetadata(roomId) {
    const state = this.states.get(roomId);
    if (!state) return null;
    
    return {
      roomId,
      version: state.version,
      timestamp: state.timestamp,
      age: Date.now() - state.timestamp
    };
  }
  
  /**
   * Clean up old states
   */
  cleanup(maxAge = 86400000) { // 24 hours default
    const now = Date.now();
    let cleaned = 0;
    
    for (const [roomId, state] of this.states) {
      if ((now - state.timestamp) > maxAge) {
        this.states.delete(roomId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old canvas states`);
    }
    
    return cleaned;
  }
  
  /**
   * Get storage statistics
   */
  getStats() {
    let totalSize = 0;
    const roomStats = [];
    
    for (const [roomId, state] of this.states) {
      const size = state.canvasData ? state.canvasData.length : 0;
      totalSize += size;
      
      roomStats.push({
        roomId,
        size,
        version: state.version,
        age: Date.now() - state.timestamp,
        timestamp: state.timestamp
      });
    }
    
    return {
      totalRooms: this.states.size,
      totalSize,
      rooms: roomStats
    };
  }
}

module.exports = DrawingStateManager;
