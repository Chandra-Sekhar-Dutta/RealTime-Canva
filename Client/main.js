/**
 * Main Application Entry Point
 * Wires up canvas and websocket modules with UI
 */

import { CanvasManager } from './canvas.js';
import { WebSocketClient } from './websocket.js';

class CollaborativeCanvasApp {
  constructor() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    this.userColor = urlParams.get('color') || '#6366f1';
    this.roomId = urlParams.get('room') || 'default';
    
    // Generate or retrieve persistent userId
    let storedUserId = sessionStorage.getItem('canvas_userId');
    if (!storedUserId) {
      storedUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('canvas_userId', storedUserId);
    }
    this.userId = storedUserId;
    
    // Username will be assigned by server
    this.username = 'Anonymous';
    
    console.log('Initialized with userId:', this.userId);
    
    // Redirect to signin if no room (only if we're on the canvas page)
    if (!urlParams.get('room') && window.location.pathname.includes('canvas')) {
      window.location.href = '/';
      return;
    }
    
    // Don't initialize if no canvas element (we're on signin page)
    if (!document.getElementById('canvas')) {
      return;
    }
    
    // Get DOM elements
    this.canvas = document.getElementById('canvas');
    this.brushBtn = document.getElementById('brushBtn');
    this.eraserBtn = document.getElementById('eraserBtn');
    this.colorPicker = document.getElementById('colorPicker');
    this.colorHex = document.getElementById('colorHex');
    this.widthRange = document.getElementById('widthRange');
    this.widthLabel = document.getElementById('widthLabel');
    this.brushPreview = document.getElementById('brushPreview');
    this.undoBtn = document.getElementById('undoBtn');
    this.redoBtn = document.getElementById('redoBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.canvasSize = document.getElementById('canvasSize');
    this.toolIndicator = document.getElementById('toolIndicator');
    this.cursorPreview = document.getElementById('cursorPreview');
    
    // Conflict resolution UI elements
    this.conflictInfo = document.getElementById('conflictInfo');
    this.queueLength = document.getElementById('queueLength');
    this.bufferedStrokes = document.getElementById('bufferedStrokes');
    this.lamportClock = document.getElementById('lamportClock');
    
    // User management (userId already set above)
    this.users = new Map(); // userId -> {username, color, cursor}
    
    // Remote cursors container
    this.remoteCursorsContainer = document.createElement('div');
    this.remoteCursorsContainer.id = 'remote-cursors';
    document.querySelector('.canvas-wrapper').appendChild(this.remoteCursorsContainer);
    
    // Initialize managers
    this.canvasManager = new CanvasManager(this.canvas);
    this.wsClient = new WebSocketClient('http://localhost:3000');
    
    // Setup conflict resolution monitoring
    this.startConflictMonitoring();
    
    // Setup
    this.init();
  }
  
  init() {
    this.setupUI();
    this.setupWebSocket();
    this.setupKeyboardShortcuts();
    this.updateUI();
    
    // Try to connect to WebSocket (gracefully fails if server is offline)
    this.wsClient.connect(this.roomId, {
      userId: this.userId,
      username: this.username,
      color: this.userColor
    });
    
    // Add users panel to sidebar
    this.createUsersPanel();
    
    // Track cursor movement for sharing
    this.setupCursorTracking();
  }
  
  setupUI() {
    // Tool buttons
    this.brushBtn.addEventListener('click', () => {
      this.canvasManager.setMode('brush');
      this.updateToolUI();
    });
    
    this.eraserBtn.addEventListener('click', () => {
      this.canvasManager.setMode('eraser');
      this.updateToolUI();
    });
    
    // Color picker
    this.colorPicker.addEventListener('input', (e) => {
      this.canvasManager.setColor(e.target.value);
      this.colorHex.textContent = e.target.value.toUpperCase();
      this.updateBrushPreview();
    });
    
    // Width slider
    this.widthRange.addEventListener('input', (e) => {
      const width = parseInt(e.target.value, 10);
      this.canvasManager.setLineWidth(width);
      this.widthLabel.textContent = width + 'px';
      this.updateBrushPreview();
    });
    
    // Action buttons
    this.undoBtn.addEventListener('click', () => {
      this.canvasManager.undo();
    });
    
    this.redoBtn.addEventListener('click', () => {
      this.canvasManager.redo();
    });
    
    this.clearBtn.addEventListener('click', () => {
      this.canvasManager.clear();
      this.wsClient.clearCanvas();
    });
    
    this.downloadBtn.addEventListener('click', () => {
      this.canvasManager.download();
    });
    
    // Cursor preview
    this.canvas.addEventListener('pointermove', (e) => this.updateCursorPreview(e));
    this.canvas.addEventListener('pointerleave', () => this.updateCursorPreview(null));
    this.canvas.addEventListener('pointerenter', (e) => this.updateCursorPreview(e));
    
    // Canvas state change callback
    this.canvasManager.onStateChange = (type, data) => {
      if (type === 'draw') {
        // Send drawing event to other clients
        console.log('Sending drawing event:', data.type, data.strokeId);
        this.wsClient.sendDrawing(data);
      }
      this.updateUI();
    };
  }
  
  setupWebSocket() {
    this.wsClient.onConnect = () => {
      console.log('WebSocket connected');
      this.showNotification('Connected to server', 'success');
      // Request current canvas state from server
      this.wsClient.requestCanvasState();
    };
    
    this.wsClient.onUsernameAssigned = (username) => {
      console.log('Assigned username:', username);
      this.username = username;
      // Update the room info display with assigned username
      const roomInfo = document.querySelector('.room-info');
      if (roomInfo) {
        roomInfo.innerHTML = `
          <i class="fas fa-door-open"></i> 
          Room: ${this.roomId.substring(0, 8)}... | 
          <i class="fas fa-user"></i> ${this.username}
        `;
      }
    };
    
    this.wsClient.onDisconnect = () => {
      console.log('WebSocket disconnected');
      this.showNotification('Disconnected from server', 'warning');
    };
    
    this.wsClient.onDrawing = (drawData) => {
      // Apply remote drawing from other users
      console.log('Received drawing event:', drawData.type, drawData.userId, drawData.strokeId);
      this.canvasManager.applyRemoteDrawing(drawData);
    };
    
    this.wsClient.onCanvasState = (data) => {
      // Load canvas state from server
      if (data.canvasData) {
        this.canvasManager.loadCanvasData(data.canvasData);
      }
    };
    
    this.wsClient.onUserJoin = (data) => {
      this.users.set(data.userId, {
        userId: data.userId,
        username: data.username,
        color: data.color
      });
      this.updateUsersList();
      
      const totalUsers = this.users.size + 1; // +1 for current user
      this.showNotification(`${data.username} joined • ${totalUsers} user${totalUsers > 1 ? 's' : ''} online`, 'success');
    };
    
    this.wsClient.onUserLeave = (data) => {
      const user = this.users.get(data.userId);
      if (user) {
        this.users.delete(data.userId);
        this.updateUsersList();
        
        const totalUsers = this.users.size + 1; // +1 for current user
        this.showNotification(`${user.username} left • ${totalUsers} user${totalUsers > 1 ? 's' : ''} online`, 'warning');
      }
      // Remove their cursor
      this.updateRemoteCursor(data.userId, '', '', null);
    };
    
    this.wsClient.onCursorMove = (data) => {
      const user = this.users.get(data.userId);
      if (user) {
        this.updateRemoteCursor(data.userId, user.username, user.color, data.pos);
      }
    };
    
    this.wsClient.onUsersUpdate = (users) => {
      this.users.clear();
      users.forEach(user => {
        if (user.userId !== this.userId) {
          this.users.set(user.userId, user);
        }
      });
      this.updateUsersList();
    };
    
    this.wsClient.onError = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      
      // Undo/Redo
      if (ctrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.canvasManager.redo();
        } else {
          this.canvasManager.undo();
        }
      } else if (ctrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.canvasManager.redo();
      }
      // Tool shortcuts
      else if (e.key.toLowerCase() === 'b' && !ctrl) {
        e.preventDefault();
        this.canvasManager.setMode('brush');
        this.updateToolUI();
      } else if (e.key.toLowerCase() === 'e' && !ctrl) {
        e.preventDefault();
        this.canvasManager.setMode('eraser');
        this.updateToolUI();
      }
    });
  }
  
  updateUI() {
    this.updateToolUI();
    this.updateBrushPreview();
    this.updateCanvasSizeDisplay();
  }
  
  updateToolUI() {
    const mode = this.canvasManager.mode;
    
    if (mode === 'eraser') {
      this.eraserBtn.classList.add('active');
      this.brushBtn.classList.remove('active');
      this.toolIndicator.querySelector('i').className = 'fas fa-eraser';
      this.toolIndicator.querySelector('span').textContent = 'Eraser Mode';
    } else {
      this.brushBtn.classList.add('active');
      this.eraserBtn.classList.remove('active');
      this.toolIndicator.querySelector('i').className = 'fas fa-paintbrush';
      this.toolIndicator.querySelector('span').textContent = 'Brush Mode';
    }
  }
  
  updateBrushPreview() {
    if (!this.brushPreview) return;
    
    const size = Math.min(this.canvasManager.lineWidth, 60);
    const color = this.canvasManager.mode === 'eraser' ? '#94a3b8' : this.canvasManager.strokeColor;
    
    this.brushPreview.style.color = color;
  }
  
  updateCanvasSizeDisplay() {
    if (!this.canvasSize) return;
    
    this.canvasSize.querySelector('span').textContent = 
      `${this.canvas.width} × ${this.canvas.height}`;
  }
  
  updateCursorPreview(e) {
    if (!this.cursorPreview) return;
    
    if (e) {
      const rect = this.canvas.getBoundingClientRect();
      this.cursorPreview.style.left = e.clientX - rect.left + 'px';
      this.cursorPreview.style.top = e.clientY - rect.top + 'px';
      this.cursorPreview.style.width = this.canvasManager.lineWidth + 'px';
      this.cursorPreview.style.height = this.canvasManager.lineWidth + 'px';
      this.cursorPreview.style.opacity = '1';
      
      if (this.canvasManager.mode === 'eraser') {
        this.cursorPreview.style.borderColor = '#94a3b8';
      } else {
        this.cursorPreview.style.borderColor = this.canvasManager.strokeColor;
      }
    } else {
      this.cursorPreview.style.opacity = '0';
    }
  }
  
  showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Set icon based on type
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    
    // Set colors based on type
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    
    toast.style.cssText = `
      background: rgba(30, 41, 59, 0.95);
      backdrop-filter: blur(10px);
      color: white;
      padding: 12px 20px;
      border-radius: 10px;
      border-left: 4px solid ${colors[type]};
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 250px;
      animation: slideInRight 0.3s ease;
      pointer-events: auto;
      font-size: 14px;
    `;
    
    toast.innerHTML = `
      <i class="fas ${icons[type]}" style="color: ${colors[type]}; font-size: 18px;"></i>
      <span>${message}</span>
    `;
    
    // Add animation keyframes if not already added
    if (!document.getElementById('toast-animations')) {
      const style = document.createElement('style');
      style.id = 'toast-animations';
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }
  
  createUsersPanel() {
    const sidebar = document.querySelector('.sidebar');
    const usersCard = document.createElement('div');
    usersCard.className = 'tool-card';
    usersCard.innerHTML = `
      <h3 class="card-title">
        <i class="fas fa-users"></i>
        Online Users (<span id="userCount">1</span>)
      </h3>
      <div id="usersList" class="users-list"></div>
    `;
    sidebar.appendChild(usersCard);
    
    // Add current user
    this.updateUsersList();
  }
  
  updateUsersList() {
    const usersList = document.getElementById('usersList');
    const userCount = document.getElementById('userCount');
    
    if (!usersList) return;
    
    usersList.innerHTML = '';
    
    // Add current user
    const currentUserEl = this.createUserElement({
      userId: this.userId,
      username: this.username + ' (You)',
      color: this.userColor
    });
    usersList.appendChild(currentUserEl);
    
    // Add other users
    for (const [userId, user] of this.users) {
      const userEl = this.createUserElement(user);
      usersList.appendChild(userEl);
    }
    
    if (userCount) {
      userCount.textContent = this.users.size + 1;
    }
  }
  
  createUserElement(user) {
    const userEl = document.createElement('div');
    userEl.className = 'user-item';
    userEl.innerHTML = `
      <div class="user-avatar" style="background: ${user.color}">
        ${user.username.charAt(0).toUpperCase()}
      </div>
      <div class="user-info">
        <div class="user-name">${user.username}</div>
      </div>
    `;
    return userEl;
  }
  
  setupCursorTracking() {
    let lastSent = 0;
    const throttleMs = 50; // Send cursor position every 50ms max
    
    this.canvas.addEventListener('pointermove', (e) => {
      const now = Date.now();
      if (now - lastSent < throttleMs) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const pos = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height
      };
      
      this.wsClient.sendCursorPosition(pos);
      lastSent = now;
    });
    
    this.canvas.addEventListener('pointerleave', () => {
      this.wsClient.sendCursorPosition(null);
    });
  }
  
  updateRemoteCursor(userId, username, color, pos) {
    if (!pos) {
      // Remove cursor
      const cursor = document.getElementById(`cursor-${userId}`);
      if (cursor) cursor.remove();
      return;
    }
    
    let cursor = document.getElementById(`cursor-${userId}`);
    
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = `cursor-${userId}`;
      cursor.className = 'remote-cursor';
      cursor.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${color}">
          <path d="M7 2L18 13L13 14L10 19L7 2Z" stroke="${color}" stroke-width="1"/>
        </svg>
        <div class="remote-cursor-label" style="background: ${color}">${username}</div>
      `;
      this.remoteCursorsContainer.appendChild(cursor);
    }
    
    const rect = this.canvas.getBoundingClientRect();
    cursor.style.left = (pos.x * rect.width) + 'px';
    cursor.style.top = (pos.y * rect.height) + 'px';
    cursor.style.display = 'block';
  }
  
  // Start monitoring conflict resolution metrics
  startConflictMonitoring() {
    setInterval(() => {
      if (!this.conflictInfo || !this.canvasManager) return;
      
      const info = this.canvasManager.getConflictInfo();
      
      // Show conflict info if there's activity
      if (info.queueLength > 0 || info.bufferedStrokes > 0) {
        this.conflictInfo.style.display = 'block';
      }
      
      // Update UI
      if (this.queueLength) {
        this.queueLength.textContent = info.queueLength;
      }
      if (this.bufferedStrokes) {
        this.bufferedStrokes.textContent = info.bufferedStrokes;
      }
      if (this.lamportClock) {
        this.lamportClock.textContent = info.lamportClock;
      }
      
      // Hide if no activity for a while
      if (info.queueLength === 0 && info.bufferedStrokes === 0 && this.users.size <= 1) {
        setTimeout(() => {
          if (this.canvasManager.getConflictInfo().queueLength === 0) {
            this.conflictInfo.style.display = 'none';
          }
        }, 3000);
      }
    }, 200); // Update every 200ms
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new CollaborativeCanvasApp();
});
