# System Architecture

## Overview

This document describes the architecture of the Collaborative Canvas application, a real-time multi-user drawing platform built with modern web technologies.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                     User Interface                      │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │ │
│  │  │ Toolbar  │  │  Canvas  │  │  Status Indicators   │ │ │
│  │  └──────────┘  └──────────┘  └──────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────┴──────────────────────────────┐ │
│  │              Application Layer (main.js)               │ │
│  └──────────────┬────────────────────────┬─────────────────┘ │
│                 │                        │                   │
│  ┌──────────────┴──────────────┐  ┌─────┴──────────────┐   │
│  │    CanvasManager           │  │  WebSocketClient    │   │
│  │    (canvas.js)             │  │  (websocket.js)     │   │
│  │  • Drawing operations      │  │  • Socket.IO client │   │
│  │  • Tool management         │  │  • Event handling   │   │
│  │  • Undo/Redo               │  │  • Room management  │   │
│  └────────────────────────────┘  └─────────┬────────────┘   │
└──────────────────────────────────────────────┼───────────────┘
                                               │ WebSocket
                                               │ (Socket.IO)
┌──────────────────────────────────────────────┼───────────────┐
│                        Server (Node.js)      │               │
│  ┌───────────────────────────────────────────┴─────────────┐ │
│  │              Socket.IO Server (server.js)              │ │
│  │  • Connection handling                                 │ │
│  │  • Event routing                                       │ │
│  │  • Broadcasting                                        │ │
│  └──────────────┬─────────────────────────┬────────────────┘ │
│                 │                         │                   │
│  ┌──────────────┴──────────────┐  ┌──────┴─────────────────┐ │
│  │    RoomManager             │  │  DrawingStateManager   │ │
│  │    (rooms.js)              │  │  (drawing-state.js)    │ │
│  │  • Room lifecycle          │  │  • State persistence   │ │
│  │  • Client tracking         │  │  • Version management  │ │
│  │  • Cleanup                 │  │  • Data storage        │ │
│  └────────────────────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Client-Side Components

#### 1. **Main Application (`main.js`)**
- **Responsibility**: Application initialization and orchestration
- **Key Functions**:
  - Initialize CanvasManager and WebSocketClient
  - Wire up UI event handlers
  - Coordinate between modules
  - Handle keyboard shortcuts
  - Display notifications

#### 2. **Canvas Manager (`canvas.js`)**
- **Responsibility**: All drawing operations and canvas state
- **Key Functions**:
  - Handle pointer events (mouse, touch, pen)
  - Draw strokes with configurable tools
  - Manage undo/redo stacks
  - Convert canvas to/from data URLs
  - Apply remote drawing operations
- **State**:
  - Current tool (brush/eraser)
  - Color and stroke width
  - Drawing state (active/inactive)
  - History stacks (undo/redo)
- **Design Pattern**: Module pattern with clear API

#### 3. **WebSocket Client (`websocket.js`)**
- **Responsibility**: Real-time communication with server
- **Key Functions**:
  - Connect/disconnect from server
  - Join/leave rooms
  - Send drawing events
  - Receive and process remote events
  - Handle connection state
- **Events**:
  - `drawing` - Real-time stroke data
  - `canvas-state` - Full canvas synchronization
  - `user-joined` / `user-left` - Presence notifications
  - `clear-canvas` - Clear event
- **Design Pattern**: Event-driven with callbacks

### Server-Side Components

#### 1. **Express Server (`server.js`)**
- **Responsibility**: HTTP server and WebSocket gateway
- **Key Functions**:
  - Serve static client files
  - Provide REST API endpoints
  - Handle Socket.IO connections
  - Route events between clients
  - Manage server lifecycle
- **Endpoints**:
  - `GET /` - Serve client app
  - `GET /api/health` - Health check
  - `GET /api/rooms` - List active rooms
  - `GET /api/rooms/:roomId` - Get room info

#### 2. **Room Manager (`rooms.js`)**
- **Responsibility**: Multi-room session management
- **Key Functions**:
  - Create/delete rooms
  - Track clients per room
  - Handle join/leave operations
  - Clean up inactive rooms
  - Provide room statistics
- **Data Structure**:
  ```javascript
  {
    id: 'room-name',
    clients: Set<{clientId, socketId}>,
    canvasState: DataURL,
    createdAt: Date,
    lastActivity: Date
  }
  ```

#### 3. **Drawing State Manager (`drawing-state.js`)**
- **Responsibility**: Canvas state persistence
- **Key Functions**:
  - Save/load canvas data
  - Version tracking
  - Cleanup old states
  - Provide state metadata
- **Storage**: In-memory Map (can be extended to Redis/DB)

## Data Flow

### 1. Drawing Event Flow

```
User draws on canvas
        │
        ↓
CanvasManager captures pointer events
        │
        ↓
Canvas rendered locally (immediate feedback)
        │
        ↓
Drawing event sent to WebSocketClient
        │
        ↓
WebSocket emits 'drawing' event to server
        │
        ↓
Server receives event in room context
        │
        ↓
Server broadcasts to other clients in room
        │
        ↓
Other clients receive 'drawing' event
        │
        ↓
CanvasManager.applyRemoteDrawing() renders stroke
```

### 2. Room Join Flow

```
Client loads page with ?room=xyz
        │
        ↓
WebSocketClient.connect('xyz')
        │
        ↓
Socket.IO connection established
        │
        ↓
Client emits 'join-room' event
        │
        ↓
RoomManager.addClient(roomId, clientId)
        │
        ├─→ Server sends current canvas state to new client
        │
        └─→ Server notifies existing clients of new user
```

### 3. Canvas State Synchronization

```
New client joins room
        │
        ↓
Server checks DrawingStateManager for saved state
        │
        ├─→ If state exists: send to client
        │        │
        │        ↓
        │   Client loads canvas from data URL
        │
        └─→ If no state: client starts with blank canvas
```

## Communication Protocol

### WebSocket Events

#### Client → Server

| Event | Data | Purpose |
|-------|------|---------|
| `join-room` | `{roomId, clientId}` | Join a drawing room |
| `drawing` | `{type, pos, mode, color, width}` | Real-time drawing stroke |
| `canvas-state` | `{roomId, canvasData}` | Save canvas state |
| `request-canvas-state` | `{roomId}` | Request current state |
| `clear-canvas` | `{roomId}` | Clear the canvas |

#### Server → Client

| Event | Data | Purpose |
|-------|------|---------|
| `canvas-state` | `{canvasData, version}` | Full canvas sync |
| `drawing` | `{type, pos, mode, color, width, clientId}` | Remote drawing event |
| `user-joined` | `{clientId, socketId}` | User joined room |
| `user-left` | `{clientId, socketId}` | User left room |
| `clear-canvas` | `{clientId}` | Canvas was cleared |

### Drawing Event Types

```javascript
{
  type: 'start' | 'move' | 'end',
  pos: {x: number, y: number},
  mode: 'brush' | 'eraser',
  color: '#RRGGBB',
  width: number,
  clientId: string
}
```

## State Management

### Client State
- **Canvas State**: Pixel data stored as data URL
- **Tool State**: Current tool, color, width
- **History State**: Undo/redo stacks (max 50 items)
- **Connection State**: Connected/disconnected status

### Server State
- **Room State**: Active rooms and their clients
- **Drawing State**: Last known canvas for each room
- **Metadata**: Timestamps, versions, statistics

## Design Patterns

### 1. **Module Pattern**
- Each component is a self-contained ES6 module
- Clear separation of concerns
- Explicit exports and imports

### 2. **Observer Pattern**
- Callback-based event handling
- `onStateChange`, `onConnect`, `onDrawing`, etc.
- Decouples components

### 3. **Pub/Sub Pattern**
- Socket.IO events for client-server communication
- Room-based broadcasting
- Event-driven architecture

### 4. **Singleton Pattern**
- RoomManager and DrawingStateManager
- Single source of truth for server state

## Scalability Considerations

### Current Limitations
- **In-memory storage**: State lost on server restart
- **Single server**: No horizontal scaling
- **No load balancing**: Single point of failure
- **No rate limiting**: Vulnerable to abuse

### Scaling Strategies

#### 1. **Database Integration**
```
Replace in-memory Maps with:
- MongoDB for canvas state (binary data)
- Redis for session state (fast access)
- PostgreSQL for user data and metadata
```

#### 2. **Horizontal Scaling**
```
- Use Redis adapter for Socket.IO
- Enable multi-server rooms
- Load balancer (nginx/HAProxy)
- Sticky sessions for Socket.IO
```

#### 3. **Optimization**
```
- Implement drawing operation batching
- Use delta compression for canvas state
- Add rate limiting per client
- Implement server-side drawing validation
```

## Security Architecture

### Current Security Measures
- CORS enabled (currently permissive)
- Socket.IO reconnection with authentication

### Recommended Additions
1. **Authentication**: JWT tokens for user identity
2. **Authorization**: Room access control
3. **Validation**: Server-side drawing data validation
4. **Rate Limiting**: Prevent drawing spam
5. **Input Sanitization**: Prevent XSS attacks
6. **HTTPS**: TLS encryption for production

## Performance Considerations

### Client Optimizations
- **Pointer capture**: Smooth drawing on mobile
- **RequestAnimationFrame**: Efficient rendering
- **Event throttling**: Reduce message frequency
- **Local rendering**: Immediate visual feedback

### Server Optimizations
- **Room isolation**: Broadcast only to relevant clients
- **Compression**: Enable Socket.IO compression
- **Cleanup**: Periodic removal of inactive rooms
- **Binary data**: Consider using binary for canvas data

## Error Handling

### Client-Side
- Graceful degradation when server is offline
- Retry logic for WebSocket connections
- User notifications for errors
- Local-only mode fallback

### Server-Side
- Socket error handling
- Room cleanup on errors
- Graceful shutdown procedures
- Logging and monitoring

## Deployment Architecture

### Development
```
Single machine:
- Node.js server on localhost:3000
- Client served statically
- No external dependencies
```

### Production (Recommended)
```
┌─────────────┐
│   CDN/Edge  │ (Static assets)
└──────┬──────┘
       │
┌──────┴──────┐
│ Load Balancer│
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──┴──┐ ┌──┴──┐
│App 1│ │App 2│ (Node.js servers)
└──┬──┘ └──┬──┘
   │       │
   └───┬───┘
       │
┌──────┴──────┐
│    Redis    │ (Socket.IO adapter + state)
└─────────────┘
       │
┌──────┴──────┐
│  MongoDB    │ (Persistent storage)
└─────────────┘
```

## Testing Strategy

### Unit Tests
- Canvas drawing logic
- State management functions
- Event handlers

### Integration Tests
- WebSocket event flow
- Room management
- State persistence

### E2E Tests
- Multi-client scenarios
- Drawing synchronization
- Connection handling

## Monitoring & Observability

### Metrics to Track
- Active connections per room
- Drawing events per second
- Canvas state size
- Memory usage
- Error rates

### Logging
- Connection/disconnection events
- Room lifecycle events
- Drawing state updates
- Errors and exceptions

## Future Architecture Considerations

1. **Microservices**: Split into auth, canvas, and room services
2. **Event Sourcing**: Store drawing operations instead of full state
3. **CRDT**: Conflict-free replicated data types for better sync
4. **WebRTC**: Peer-to-peer for reduced server load
5. **GraphQL**: Flexible API for complex queries

---

*Last updated: 2025-11-06*
