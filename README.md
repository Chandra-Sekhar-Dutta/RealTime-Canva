# Collaborative Canvas

A real-time collaborative drawing application built with HTML5 Canvas, WebSocket (Socket.IO), and Node.js. Multiple users can draw simultaneously on a shared canvas with real-time synchronization.

## ✨ Features

### 🎨 Drawing Tools
- **Brush & Eraser** - Paint and erase with customizable sizes
- **Color Picker** - Choose from millions of colors
- **Adjustable Stroke Width** - 1px to 80px brush sizes
- **Visual Feedback** - Real-time brush preview and cursor indicators

### 🔄 Canvas Management
- **Undo/Redo** - Up to 50 steps of history
- **Clear Canvas** - Start fresh anytime
- **Download** - Save as PNG image
- **Auto-resize** - Canvas adapts to viewport

### 🌐 Real-Time Collaboration
- **Multi-user Support** - Multiple users can draw simultaneously
- **Room System** - Separate drawing rooms via URL parameter
- **State Synchronization** - Canvas state syncs across all connected clients
- **Join/Leave Notifications** - See when users connect/disconnect
- **User Cursors** - See other users' cursor positions in real-time

### ⌨️ Keyboard Shortcuts
- `Ctrl + Z` / `Cmd + Z` - Undo
- `Ctrl + Y` / `Cmd + Y` - Redo
- `Ctrl + Shift + Z` - Redo (alternate)
- `B` - Switch to Brush
- `E` - Switch to Eraser

### 📱 Device Support
- Desktop (mouse)
- Touch screens (tablets, phones)
- Pen/stylus devices
- Responsive design

## 🚀 Setup Instructions

### Prerequisites
- **Node.js** v14.0.0 or higher
- **npm** v6.0.0 or higher

### Quick Start (One Command)

```bash
npm install && npm start
```

This will:
1. Install all required dependencies in the Server directory
2. Start the server on port 3000
3. Server will be accessible at `http://localhost:3000`

### Detailed Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Chandra-Sekhar-Dutta/RealTime-Canva.git
   cd collaborative-canvas
   ```

2. **Install server dependencies**
   ```bash
   cd Server
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Environment Configuration (Optional)

Create a `.env` file in the `Server/` directory:
```env
PORT=3000
NODE_ENV=development
```

## 🧪 Testing with Multiple Users

### Local Testing (Same Computer)

1. **Start the server**
   ```bash
   cd Server
   npm start
   ```

2. **Open multiple browser windows/tabs**
   - Window 1: `http://localhost:3000?room=test`
   - Window 2: `http://localhost:3000?room=test`
   - Window 3: `http://localhost:3000?room=test` (and so on...)

3. **Draw in one window** and see it appear instantly in all other windows

4. **Test different rooms**
   - Window 1: `http://localhost:3000?room=room1`
   - Window 2: `http://localhost:3000?room=room2`
   - These will have separate canvases

### Network Testing (Multiple Devices)

1. **Find your local IP address**
   - Windows: Open PowerShell and run `ipconfig`
   - Look for "IPv4 Address" (e.g., 192.168.1.5)

2. **Start the server on your computer**
   ```bash
   cd Server
   npm start
   ```

3. **Access from other devices on the same network**
   - On phone/tablet: `http://YOUR_IP:3000?room=test`
   - On another computer: `http://YOUR_IP:3000?room=test`
   - Example: `http://192.168.1.5:3000?room=test`

4. **Test collaboration**
   - Draw on your phone and see it on your computer
   - Multiple people can join the same room and draw together

### Testing Checklist

- ✅ Multiple browser tabs can draw simultaneously
- ✅ Drawing appears in real-time across all connected clients
- ✅ New users joining see the current canvas state
- ✅ Undo/Redo works for each user independently
- ✅ Clear canvas clears for all users
- ✅ Different rooms remain isolated
- ✅ Users can see join/leave notifications
- ✅ Cursor positions are synchronized (if enabled)

## 🐛 Known Limitations and Bugs

### Current Limitations

1. **No Persistent Storage**
   - Canvas state is stored in memory only
   - When server restarts, all drawings are lost
   - Workaround: Download canvas before server restart

2. **No User Authentication**
   - No login system or user accounts
   - Users are assigned anonymous names (User1, User2, etc.)
   - Anyone with the room link can join

3. **Single Server Architecture**
   - Cannot scale horizontally without modifications
   - All users connect to one server instance
   - Limited by single server's resources

4. **Eraser Not Synchronized**
   - Eraser tool works only locally
   - Other users don't see eraser strokes
   - Design decision to prevent conflicting erase operations

5. **No Rate Limiting**
   - Server doesn't limit drawing event frequency
   - Potential for abuse or performance issues
   - Could lead to server overload with many fast strokes

6. **No Input Validation**
   - Drawing data is not validated on server
   - Could accept malformed or malicious data
   - Security risk in production environment

7. **Canvas Size Limitations**
   - Very large canvases may cause performance issues
   - Browser memory limitations apply
   - Download size increases with canvas complexity

### Known Bugs

1. **Race Condition on Join**
   - Very rarely, new users might miss the first few strokes if they join during active drawing
   - Impact: Low (auto-resolves quickly)

2. **Cursor Position Delay**
   - Cursor synchronization may lag on slow networks
   - Impact: Low (aesthetic issue only)

3. **Memory Leak Warning**
   - Long-running server sessions may accumulate unused states
   - Mitigation: Auto-cleanup runs every 5 minutes
   - Impact: Medium (requires server restart after extended use)

4. **Mobile Touch Scrolling**
   - On some mobile browsers, drawing may trigger page scroll
   - Mitigation: Touch events are prevented
   - Impact: Low (works on most devices)

### Future Improvements Needed

- [ ] Implement persistent database storage (MongoDB/PostgreSQL)
- [ ] Add user authentication and profiles
- [ ] Implement rate limiting and input validation
- [ ] Add synchronized eraser functionality
- [ ] Improve error handling and recovery
- [ ] Add unit and integration tests
- [ ] Optimize canvas data transmission (delta updates)
- [ ] Implement drawing permissions/roles
- [ ] Add chat functionality
- [ ] Support for shapes (rectangles, circles, lines)

## ⏱️ Time Spent on Project

### Development Timeline

| Phase | Time Spent | Tasks Completed |
|-------|-----------|-----------------|
| **Initial Setup & Research** | ~3 hours | Project structure, technology selection, WebSocket research |
| **Core Drawing Logic** | ~4 hours | Canvas API, drawing tools, pointer events, undo/redo |
| **WebSocket Integration** | ~3 hours | Socket.IO setup, event handling, client-server communication |
| **Room System** | ~2 hours | Room manager, state persistence, multi-room support |
| **Real-Time Sync** | ~4 hours | Drawing synchronization, state management, conflict handling |
| **UI/UX Design** | ~3 hours | Responsive layout, toolbar, color picker, user feedback |
| **Testing & Debugging** | ~4 hours | Multi-user testing, bug fixes, edge cases |
| **Code Refactoring** | ~2 hours | Modular architecture, ES6 modules, clean code |
| **Documentation** | ~2 hours | README, ARCHITECTURE, code comments |
| **Polish & Features** | ~3 hours | Keyboard shortcuts, notifications, cursor sync |

**Total Time: ~30 hours**

### Key Milestones

- ✅ Day 1-2: Basic canvas drawing with single user
- ✅ Day 3-4: WebSocket integration and real-time sync
- ✅ Day 5: Multi-room support and state management
- ✅ Day 6-7: Testing, debugging, and refinement
- ✅ Day 8: Documentation and final polish

## 🚀 Using Different Rooms

Add a `?room=` query parameter to join specific rooms:
```
http://localhost:3000?room=room1
http://localhost:3000?room=team-design
http://localhost:3000?room=meeting-notes
```

## 📁 Project Structure

```
collaborative-canvas/
├── Client/                   # Frontend application
│   ├── index.html           # Main HTML file
│   ├── style.css            # Styles and design
│   ├── canvas.js            # Canvas drawing logic (ES6 module)
│   ├── websocket.js         # WebSocket client (ES6 module)
│   ├── main.js              # App initialization (ES6 module)
│   └── app.js               # Legacy monolithic version (backup)
├── Server/                   # Backend application
│   ├── server.js            # Express + Socket.IO server
│   ├── rooms.js             # Room management module
│   ├── drawing-state.js     # Canvas state persistence
│   └── package.json         # Server dependencies
├── README.md                 # This file
└── ARCHITECTURE.md           # System architecture documentation
```

## 🔧 Configuration

### Server Configuration

Edit `Server/server.js` to configure:
- **PORT**: Server port (default: 3000)
- **CLIENT_PATH**: Path to client files
- **CORS settings**: Cross-origin resource sharing

### Environment Variables

Create a `.env` file in the `Server/` directory:
```env
PORT=3000
NODE_ENV=development
```

## 🛠️ Development

### Running in Development Mode
```bash
cd Server
npm run dev
```
Uses nodemon for auto-restart on file changes.

### Running in Production Mode
```bash
cd Server
npm start
```

### Available Scripts

**Root directory:**
- `npm install` - Install all dependencies
- `npm start` - Start the server
- `npm run dev` - Start with auto-reload
- `npm run install-server` - Install server dependencies only

**Server directory:**
- `npm start` - Start server
- `npm run dev` - Start with nodemon (auto-reload)

## 🏗️ Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design documentation.

### Key Technologies
- **Frontend**: HTML5 Canvas, ES6 Modules, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO
- **Real-time**: WebSocket protocol via Socket.IO
- **State Management**: In-memory (can be extended to Redis/DB)

### Modular Design

The application is split into focused modules:
- **canvas.js** - Pure drawing logic, no UI dependencies
- **websocket.js** - WebSocket communication layer
- **main.js** - Glues modules together with UI
- **rooms.js** - Server-side room management
- **drawing-state.js** - Canvas state persistence

## 🔐 Security Considerations

- **Input Validation**: Drawing data is not validated (add in production)
- **Rate Limiting**: Not implemented (recommend adding)
- **Authentication**: No user auth (add for production use)
- **CORS**: Currently allows all origins (restrict in production)

## 🐛 Troubleshooting

### Canvas not loading
- Check browser console for errors (F12)
- Verify server is running: `Server Running` message should appear in terminal
- Clear browser cache: Ctrl+Shift+Delete
- Ensure you're accessing the correct URL: `http://localhost:3000`

### WebSocket not connecting
- Check if server is accessible
- Verify firewall settings (allow port 3000)
- Check browser console for connection errors
- Try reconnecting by refreshing the page
- Ensure Socket.IO client is loaded (check Network tab in DevTools)

### Drawing lag or delay
- Check network latency (ping times)
- Reduce canvas size in browser window
- Close other tabs consuming bandwidth
- Try using a wired connection instead of WiFi
- Check CPU usage (drawing is CPU-intensive)

### Drawings not syncing
- Verify all users are in the same room
- Check browser console for WebSocket errors
- Ensure server is running and accessible
- Try refreshing all connected clients

### Server won't start
- Check if port 3000 is already in use: `netstat -ano | findstr :3000`
- Kill existing process or change PORT in Server.js
- Verify Node.js is installed: `node --version`
- Reinstall dependencies: `cd Server && npm install`

## 📈 Future Enhancements

- [ ] User authentication and profiles
- [ ] Persistent storage (MongoDB/PostgreSQL)
- [ ] Shape tools (rectangle, circle, line)
- [ ] Text tool
- [ ] Layers support
- [ ] Export to multiple formats (SVG, JPEG)
- [ ] Pressure sensitivity for stylus
- [ ] Chat feature
- [ ] Drawing permissions/roles
- [ ] Canvas templates
- [ ] History playback

## 📄 License

ISC

## 👥 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review architecture docs

---

Built with ❤️ for collaborative creativity
