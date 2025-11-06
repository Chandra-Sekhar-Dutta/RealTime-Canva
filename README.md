# Collaborative Canvas

A real-time collaborative drawing application built with HTML5 Canvas, WebSocket (Socket.IO), and Node.js.

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

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+ recommended)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd collaborative-canvas
   ```

2. **Install dependencies**
   ```bash
   cd Server
   npm install
   ```

3. **Start the server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Using Different Rooms

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

## 🧪 Testing

### Local Testing
1. Open multiple browser windows/tabs
2. Navigate to `http://localhost:3000?room=test`
3. Draw in one window and see it appear in others

### Network Testing
1. Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Access from other devices: `http://YOUR_IP:3000`

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

In the `Server/` directory:
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
- Check browser console for errors
- Verify server is running on port 3000
- Clear browser cache

### WebSocket not connecting
- Check if server is accessible
- Verify firewall settings
- Check browser console for connection errors

### Drawing lag
- Reduce canvas size
- Check network latency
- Optimize drawing event frequency

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
