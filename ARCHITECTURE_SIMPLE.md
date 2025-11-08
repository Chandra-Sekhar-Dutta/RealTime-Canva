# System Architecture

## Overview

Real-time collaborative drawing application using WebSocket for synchronization between multiple users.

## High-Level Architecture

![System Architecture Diagram](Client/assets/WorkingFlowChart.png)

## Components

### Client-Side

**main.js** - Application initialization, UI handlers, keyboard shortcuts

**canvas.js** - Drawing operations, undo/redo, pointer events handling

**websocket.js** - WebSocket communication, event handling

### Server-Side

**Server.js** - Express server, Socket.IO setup, API endpoints

**rooms.js** - Room management, client tracking

**drawing-state.js** - Canvas state persistence (in-memory)

## Data Flow

### Drawing Event Flow
![Drawing Event Flow Diagram](Client/assets/DrawingeventFlow.png)

User draws → Canvas renders locally → Event sent to server → Server broadcasts to room → Other clients render

### Room Join Flow
![Room Join Flow Diagram](Client/assets/RoomJoinFlow.png)

User joins → Server adds to room → Canvas state sent to user → User receives ongoing events

### Canvas State Synchronization
![Canvas State Synchronization Diagram](Client/assets/CanvasStateSynchronization.png)

Canvas changes → Convert to data URL → Store on server → Send to new users

## WebSocket Events

### Client → Server
- `join-room` - Join a drawing room
- `drawing` - Send drawing stroke data
- `canvas-state` - Save canvas state
- `clear-canvas` - Clear the canvas

### Server → Client
- `canvas-state` - Receive canvas state
- `drawing` - Receive remote drawing
- `user-joined` / `user-left` - User presence
- `clear-canvas` - Canvas cleared by user

## Undo/Redo

![Undo Operation Flow](Client/assets/UndoOperationFlow.png)
![Redo Operation Flow](Client/assets/RedoOperationFlow.png)

Undo/Redo is NOT synchronized across clients. Each user maintains their own history stack.

- Stores canvas snapshots as data URLs
- Max stack size: 50 items
- Remote drawings don't affect local history
- Redo stack cleared on new drawing action

## Key Features

### Dual Canvas Layer System
- Main canvas for local drawings
- Separate canvas for remote drawings
- Prevents conflicts between local and remote strokes

### Optimistic Rendering
- Local drawings render immediately without waiting for server confirmation

### Data Format
- Canvas state stored as PNG data URLs
- Base64 encoding adds ~33% size overhead

### Storage
- In-memory storage using JavaScript Maps
- Fast but not persistent (data lost on server restart)

### Conflict Resolution
- Last-write-wins approach
- Later strokes appear on top

### Eraser Behavior
- Eraser NOT synchronized across clients
- Each user erases their own view only

## State Management

### Client State
- Canvas pixel data (data URL)
- Current tool, color, stroke width
- Undo/redo stacks (max 50 items)
- Connection status

### Server State
- Active rooms and clients (Map)
- Canvas state per room (Map)
- Room metadata (timestamps, versions)

## API Endpoints

- `GET /` - Serve client application
- `GET /api/health` - Health check
- `GET /api/rooms` - List active rooms
- `GET /api/rooms/:roomId` - Get room info

## Technology Stack

**Client:** Vanilla JavaScript, HTML5 Canvas API, Socket.IO Client

**Server:** Node.js, Express, Socket.IO

## Performance

| Operation | Latency |
|-----------|---------|
| Local drawing | <1ms |
| Server round-trip | 20-100ms |
| Canvas state transfer | 100-500ms |
| Undo/Redo | <10ms |
| Canvas clear | <5ms |

## Scalability

### Current Limitations
- In-memory storage (not persistent)
- Single server (no horizontal scaling)
- No authentication or rate limiting

### Future Improvements
- Database for persistence (MongoDB/Redis)
- Redis adapter for multi-server setup
- User authentication
- Rate limiting
- Delta compression for canvas state

## Security Recommendations

- JWT authentication
- Rate limiting
- Input validation
- HTTPS/TLS
- CORS restrictions

## Design Patterns

- **Module Pattern** - Self-contained ES6 modules
- **Observer Pattern** - Callback-based event handling
- **Pub/Sub Pattern** - Socket.IO events
- **Singleton Pattern** - RoomManager and DrawingStateManager
- **Optimistic UI Pattern** - Immediate local rendering
