# Collaborative Canvas

A real-time collaborative drawing application built with HTML5 Canvas, WebSocket (Socket.IO), and Node.js.

## Features

- **Drawing Tools**: Brush and eraser with adjustable sizes (1-80px) and color picker
- **Canvas Controls**: Undo/Redo (50 steps), clear canvas, download PNG
- **Real-Time Collaboration**: Multiple users can draw simultaneously in separate rooms
- **Synchronization**: Canvas state syncs across all connected clients
- **User Awareness**: Join/leave notifications and cursor positions
- **Keyboard Shortcuts**: Ctrl+Z (Undo), Ctrl+Y (Redo), B (Brush), E (Eraser)
- **Cross-Device**: Works on desktop, tablets, and phones

## Setup Instructions

### Prerequisites
- Node.js v14+ and npm v6+

### Quick Start

```bash
npm install && npm start
```

This installs dependencies and starts the server on port 3000.

### Detailed Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/Chandra-Sekhar-Dutta/RealTime-Canva.git
   cd collaborative-canvas
   ```

2. Install dependencies:
   ```bash
   cd Server
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open browser: `http://localhost:3000`

## Testing with Multiple Users

### Local Testing (Same Computer)

1. Start the server: `npm start`
2. Open multiple browser tabs:
   - Tab 1: `http://localhost:3000?room=test`
   - Tab 2: `http://localhost:3000?room=test`
   - Tab 3: `http://localhost:3000?room=test`
3. Draw in one tab and see it appear instantly in others
4. Test different rooms by using different room parameters

### Network Testing (Multiple Devices)

1. Find your local IP: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Start the server on your computer
3. Access from other devices on same network:
   - Example: `http://192.168.1.5:3000?room=test`
4. Draw on one device and see it sync to others

## Known Limitations and Bugs

### Limitations

1. **No Persistent Storage** - Canvas state stored in memory only; drawings lost on server restart
2. **No Authentication** - Anonymous users (User1, User2, etc.); no access control
3. **Single Server** - Cannot scale horizontally; limited by single server resources
4. **Eraser Not Synchronized** - Eraser works locally only to prevent conflict issues
5. **No Rate Limiting** - No protection against drawing event spam
6. **No Input Validation** - Drawing data not validated on server
7. **Canvas Size Limits** - Very large canvases may cause performance issues

### Known Bugs

1. **Race Condition on Join** - New users may miss first few strokes if joining during active drawing
2. **Cursor Delay** - Cursor sync may lag on slow networks
3. **Memory Accumulation** - Long-running sessions may need restart (auto-cleanup runs every 5 minutes)
4. **Mobile Touch** - Drawing may trigger page scroll on some browsers

## Time Spent on Project

| Phase | Time | Tasks |
|-------|------|-------|
| Initial Setup & Research | 3h | Project structure, technology selection, WebSocket research |
| Core Drawing Logic | 4h | Canvas API, drawing tools, pointer events, undo/redo |
| WebSocket Integration | 3h | Socket.IO setup, event handling, client-server communication |
| Room System | 2h | Room manager, state persistence, multi-room support |
| Real-Time Sync | 4h | Drawing synchronization, state management, conflict handling |
| UI/UX Design | 3h | Responsive layout, toolbar, color picker, user feedback |
| Testing & Debugging | 4h | Multi-user testing, bug fixes, edge cases |
| Code Refactoring | 2h | Modular architecture, ES6 modules, clean code |
| Documentation | 2h | README, ARCHITECTURE |
| Polish & Features | 3h | Keyboard shortcuts, notifications, cursor sync |

**Total: ~30 hours**

## Project Structure

```
collaborative-canvas/
├── Client/
│   ├── index.html         # Main HTML
│   ├── style.css          # Styles
│   ├── canvas.js          # Drawing logic
│   ├── websocket.js       # WebSocket client
│   └── main.js            # App initialization
├── Server/
│   ├── Server.js          # Express + Socket.IO server
│   ├── rooms.js           # Room management
│   ├── drawing-state.js   # State persistence
│   └── package.json       # Dependencies
├── README.md
└── ARCHITECTURE.md
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

**Technologies:**
- Frontend: HTML5 Canvas, ES6 Modules, Socket.IO Client
- Backend: Node.js, Express, Socket.IO
- Real-time: WebSocket (Socket.IO)
- State: In-memory

## License

ISC
