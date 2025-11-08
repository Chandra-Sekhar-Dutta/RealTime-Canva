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
![Drawing Event Flow Diagram](Client/assets/DrawingEventFlow.png)

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

## Undo/Redo Strategy

### Design Philosophy: Local-Only Operations

**Decision**: Undo and Redo are **NOT synchronized** across clients. Each user maintains their own independent history stack.

**Rationale:**
1. **User Expectations**: Users expect undo to reverse their own actions, not others'
2. **Complexity**: Global undo/redo with multiple concurrent users is extremely complex
3. **Conflict Resolution**: Who "owns" the undo? First to press Ctrl+Z?
4. **Performance**: Tracking global operation history would be expensive
5. **UX Confusion**: Undoing someone else's work would be confusing and frustrating

---

### Implementation Details

#### Data Structure

```javascript
class CanvasManager {
  constructor() {
    this.undoStack = [];    
    this.redoStack = [];    
    this.MAX_STACK = 50;    
  }
}
```

#### Undo Operation Flow

![Undo Operation Flow Diagram](Client/assets/UndoOperationFlow.png)

#### Redo Operation Flow

![Redo Operation Flow Diagram](Client/assets/RedoOperationFlow.png)

#### Stack Management

```javascript
pushUndo() {
  if (this.undoStack.length >= this.MAX_STACK) {
    this.undoStack.shift();  
  }
  this.undoStack.push(this.canvas.toDataURL());
  
  if (this.redoStack.length > this.MAX_STACK) {
    this.redoStack.shift();
  }
}
```

---

### Memory Management

**Memory Usage Calculation:**
- Average canvas size: 1000x600 pixels
- PNG data URL size: ~500KB-2MB (depends on complexity)
- Max stack size: 50 items
- **Maximum memory per user**: 50 × 2MB = **100MB**

**Optimization Strategies:**
1. **Stack Limit**: Cap at 50 items (configurable)
2. **Compression**: PNG format already compressed
3. **Lazy Cleanup**: Remove old states when stack is full
4. **No Server Storage**: Undo/redo never sent to server

---

### Edge Cases Handled

1. **Empty Stack**: Undo/Redo buttons disabled when no history
2. **New Drawing**: Redo stack cleared on new stroke (standard behavior)
3. **Canvas Resize**: History preserved across resize events
4. **Clear Canvas**: Added to undo stack (can undo clear)
5. **Remote Drawings**: Do NOT affect local undo/redo stack

---

### Alternative Approaches (Not Implemented)

#### 1. Operation-Based History (OT - Operational Transformation)
```javascript
undoStack = [
  {type: 'stroke', points: [...], color: '#000', width: 5},
  {type: 'erase', points: [...], width: 20},
  {type: 'clear'}
]
```
**Pros**: Less memory, more granular
**Cons**: Complex to replay, hard to sync with remote changes

#### 2. Global Collaborative Undo (Not Recommended)
```javascript
  globalHistory = [
  {userId: 'user1', operation: {...}, timestamp: 123},
  {userId: 'user2', operation: {...}, timestamp: 124}
]
```
**Pros**: True collaborative editing
**Cons**: 
- Extremely complex to implement correctly
- Confusing UX (whose undo takes precedence?)
- Requires CRDT or OT algorithms
- High network overhead

#### 3. User-Specific Global Undo
```javascript
  userHistory = {
  'user1': [stroke1, stroke2, ...],
  'user2': [stroke3, stroke4, ...]
}
```
**Pros**: More intuitive than global undo
**Cons**: 
- Still complex to implement
- Doesn't undo local-only actions (eraser)
- Requires tracking stroke ownership

---

### Current Solution: Best for Simplicity

The local-only undo/redo strategy provides:
- ✅ Fast, instant operations (no network latency)
- ✅ Predictable behavior (users control their own history)
- ✅ Simple implementation (no distributed state)
- ✅ Low memory overhead (per-client, not per-room)
- ✅ No conflicts or race conditions
- ❌ Cannot undo remote users' strokes (acceptable trade-off)

---

## Performance Decisions

### 1. Dual Canvas Layer System

**Implementation:**
```javascript
class CanvasManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;              
    this.ctx = this.canvas.getContext('2d');
    

    this.remoteCanvas = document.createElement('canvas');
    this.remoteCtx = this.remoteCanvas.getContext('2d');
  }
  
  composeLayers() {
    this.ctx.drawImage(this.remoteCanvas, 0, 0);
  }
}
```

**Rationale:**
- **Separation of Concerns**: Local and remote drawings isolated
- **Eraser Handling**: Local eraser doesn't affect remote strokes
- **Performance**: Only composites on stroke end, not every pixel
- **Conflict Prevention**: No race conditions between local and remote

**Trade-offs:**
- Slightly more memory usage (two canvas buffers)
- Additional compositing step (minimal overhead)

---

### 2. Optimistic UI Rendering

**Decision**: Render local drawings immediately, before server confirmation

```javascript
handlePointerMove(e) {
  this.ctx.lineTo(pos.x, pos.y);
  this.ctx.stroke();
  
  this.emitDrawEvent('move', pos);
}
```

**Benefits:**
- **Zero Perceived Latency**: Drawing feels instant
- **Better UX**: No waiting for network round-trip
- **Smooth Strokes**: No stuttering or lag

**Trade-offs:**
- Potential desync if server rejects event (rare)
- Cannot easily "cancel" a stroke after it's drawn

---

### 3. Event Frequency Management

**Strategy**: Let browser's pointer event system naturally throttle events

```javascript
canvas.addEventListener('pointermove', handlePointerMove);
```

**Rationale:**
- Browser already throttles pointer events to screen refresh rate
- Manual throttling adds complexity and potential stuttering
- Network can handle ~100 events/second easily on modern connections

**Alternative Considered (Not Implemented):**
```javascript
let lastEmit = 0;
function handlePointerMove(e) {
  if (Date.now() - lastEmit < 16) return;  // Max 60 FPS
  lastEmit = Date.now();
  // ... emit event
}
```

**Why rejected**: Unnecessary complexity, browser already handles this

---

### 4. Canvas Data Format: Data URLs vs Binary

**Decision**: Use data URLs (base64-encoded PNG) for canvas state transfer

```javascript
const canvasData = canvas.toDataURL('image/png');
// Result: "data:image/png;base64,iVBORw0KGgo..."
```

**Advantages:**
- Simple to implement (built-in browser API)
- Easy to store in JSON
- Can be displayed in `<img>` tags directly
- Compressed (PNG encoding)

**Disadvantages:**
- Base64 encoding adds ~33% size overhead
- Large payloads for complex drawings (500KB-2MB)

**Alternative Considered:**
```javascript
// Binary blob transfer (more efficient)
canvas.toBlob((blob) => {
  // Send blob directly via Socket.IO
  socket.emit('canvas-state', blob);
});
```

**Why not used**: Added complexity, data URLs sufficient for current scale

---

### 5. State Persistence: In-Memory vs Database

**Decision**: Store canvas state in JavaScript `Map` (in-memory)

```javascript
class DrawingStateManager {
  constructor() {
    this.states = new Map();  // roomId -> {canvasData, version, timestamp}
  }
}
```

**Advantages:**
- Fast read/write (no I/O latency)
- Simple implementation (no database setup)
- Good for prototyping and small scale

**Disadvantages:**
- Data lost on server restart
- Limited by server RAM
- Cannot scale horizontally without Redis

**Production Alternative:**
```javascript
// Redis for distributed state
const redis = require('redis');
const client = redis.createClient();

async function saveState(roomId, canvasData) {
  await client.set(`canvas:${roomId}`, canvasData, {
    EX: 86400  // Expire after 24 hours
  });
}
```

---

### 6. Broadcast Pattern: Room-Based vs Global

**Decision**: Use Socket.IO rooms for targeted broadcasting

```javascript
// Broadcast only to users in same room
socket.to(roomId).emit('drawing', data);
```

**Advantages:**
- Efficient (no unnecessary network traffic)
- Scalable (events isolated per room)
- Privacy (room isolation)

**vs Global Broadcast:**
```javascript
// DON'T DO THIS - sends to ALL clients
io.emit('drawing', data);  // Bad performance
```

---

### 7. Compression: Enabled for Socket.IO

**Configuration:**
```javascript
const io = new Server(server, {
  perMessageDeflate: true,  // Enable WebSocket compression
  httpCompression: true      // Enable HTTP compression
});
```

**Impact:**
- Reduces data URL size by ~70%
- Adds minimal CPU overhead
- Essential for large canvas states

---

### 8. Device Pixel Ratio Handling

**Decision**: Use device pixel ratio for high-DPI displays

```javascript
setCanvasSize() {
  const dpr = window.devicePixelRatio || 1;
  this.canvas.width = rect.width * dpr;
  this.canvas.height = rect.height * dpr;
  this.ctx.scale(dpr, dpr);
}
```

**Benefits:**
- Crisp rendering on Retina/4K displays
- No blurry strokes on high-DPI screens

**Trade-off:**
- Larger canvas buffer (4x pixels on 2x DPI)
- More memory usage

---

### 9. Pointer Events API (Not Mouse Events)

**Decision**: Use Pointer Events for unified input handling

```javascript
canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerup', handlePointerUp);
```

**Advantages:**
- Handles mouse, touch, and pen with same code
- Supports pressure sensitivity (future enhancement)
- Better browser support than touch events

**vs Separate Mouse/Touch Handlers:**
```javascript
// Old approach (not used)
canvas.addEventListener('mousedown', ...);
canvas.addEventListener('touchstart', ...);
// Duplicate code, harder to maintain
```

---

### Performance Benchmarks (Approximate)

--------------------------------------------------------------------------------------
| Operation                         | Latency   | Notes                              |
|-----------------------------------|-----------|------------------------------------|
| Local drawing (optimistic)        | <1ms      | Instant visual feedback            |
| Server round-trip (drawing event) | 20-100ms  | Depends on network                 |
| Canvas state transfer (500KB)     | 100-500ms | Depends on network and compression |
| Undo/Redo operation               | <10ms     | Load image from data URL           |
| Canvas clear                      | <5ms      | Simple clearRect operation         |
| Pointer event frequency           | 60-120 Hz | Browser-dependent                  |
--------------------------------------------------------------------------------------

---

## State Management

### Client State
- **Canvas State**: Pixel data stored as data URL
- **Tool State**: Current tool, color, width
- **History State**: Undo/redo stacks (max 50 items)
- **Connection State**: Connected/disconnected status
- **User State**: userId, username, color, room

### Server State
- **Room State**: Active rooms and their clients (Map)
- **Drawing State**: Last known canvas for each room (Map)
- **Metadata**: Timestamps, versions, statistics
- **User Registry**: Anonymous username counters per room

## Conflict Resolution Strategy

### Overview

In a real-time collaborative drawing application, conflicts arise when multiple users draw simultaneously. This section describes how the system handles concurrent operations.

---

### Conflict Scenarios

#### 1. **Simultaneous Drawing (Most Common)**

**Scenario**: Two users draw on the same canvas area at the same time

```
Time: T0
User A: Draws red stroke at (100, 100)
User B: Draws blue stroke at (105, 100)

Both strokes overlap!
```

**Resolution Strategy**: **Last-Write-Wins (LWW) with Layer Compositing**

**Implementation:**
```javascript
// User A's red stroke
applyRemoteDrawing({type: 'start', pos: {x: 100, y: 100}, color: '#ff0000'});
// Draws on remote canvas layer

// User B's blue stroke (arrives 50ms later)
applyRemoteDrawing({type: 'start', pos: {x: 105, y: 100}, color: '#0000ff'});
// Draws on same remote canvas layer, composites on top

// Final result: Blue stroke appears on top of red stroke
```

**Why This Works:**
- Natural compositing order (temporal ordering)
- No explicit conflict detection needed
- Deterministic outcome (all clients see same result)
- Matches user expectations (later strokes appear on top)

---

#### 2. **Race Condition on Join**

**Scenario**: New user joins while others are actively drawing

```
Time: T0 - User A starts drawing long stroke
Time: T1 - User B joins room
Time: T2 - User A continues stroke
Time: T3 - Server sends canvas state to User B
Time: T4 - User A finishes stroke

User B might miss User A's stroke!
```

**Resolution Strategy**: **State Transfer with Event Buffer**

**Implementation:**
```javascript
// Server-side (pseudo-code)
socket.on('join-room', async ({roomId, userId}) => {
  // 1. Join room first
  socket.join(roomId);
  
  // 2. Get current canvas state
  const state = drawingStateManager.getState(roomId);
  
  // 3. Send state immediately
  socket.emit('canvas-state', state);
  
  // 4. All subsequent events will be received in order
  // No buffer needed - Socket.IO guarantees ordered delivery
});
```

**Why This Works:**
- Socket.IO guarantees message ordering per connection
- New user gets latest state, then receives all future events
- Temporal causality preserved
- Worst case: User sees stroke appear slightly delayed

---

#### 3. **Concurrent Clear Operations**

**Scenario**: Two users press "Clear Canvas" simultaneously

```
Time: T0
User A: Clicks "Clear Canvas"
User B: Clicks "Clear Canvas" (1ms later)

Both send clear events!
```

**Resolution Strategy**: **Idempotent Clear Operation**

**Implementation:**
```javascript
// Server broadcasts clear to all clients
socket.on('clear-canvas', ({roomId}) => {
  io.to(roomId).emit('clear-canvas', {userId});
  drawingStateManager.clearState(roomId);
});

// Client handles clear (idempotent)
socket.on('clear-canvas', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Clearing twice has same effect as clearing once
});
```

**Why This Works:**
- Clear operation is idempotent (clearing empty canvas = no-op)
- All clients converge to same state (empty canvas)
- No data loss or corruption possible

---

#### 4. **Undo After Remote Drawing**

**Scenario**: User A draws, then User B draws, then User A presses undo

```
Time: T0 - User A draws red stroke (local)
Time: T1 - User B draws blue stroke (appears on User A's canvas)
Time: T2 - User A presses Ctrl+Z

What gets undone?
```

**Resolution Strategy**: **Local-Only Undo (No Conflict)**

**Implementation:**
```javascript
// User A's undo operation
undo() {
  // Only affects User A's local canvas
  // Does NOT send any event to server
  // Does NOT affect User B's drawing
  
  const previousState = this.undoStack.pop();
  this.loadCanvas(previousState);
  // User A's canvas reverts to before red stroke
  // Blue stroke from User B remains (it's on remote layer)
}
```

**Why This Works:**
- Undo is purely local operation
- Each user controls their own history
- No conflict possible (users can't undo each other's work)
- Dual-layer system keeps local and remote strokes separate

---

#### 5. **Network Partition / Split Brain**

**Scenario**: User loses connection, draws offline, then reconnects

```
Time: T0 - User A disconnects (network issue)
Time: T1 - User A draws red stroke (offline - not synced)
Time: T2 - User B draws blue stroke (online - synced to others)
Time: T3 - User A reconnects

User A's canvas has red stroke, server/others don't!
```

**Resolution Strategy**: **Server State Authority (Discard Offline Work)**

**Current Implementation:**
```javascript
// On reconnect
socket.on('connect', () => {
  // 1. Rejoin room
  socket.emit('join-room', {roomId, userId});
  
  // 2. Receive authoritative state from server
  socket.on('canvas-state', ({canvasData}) => {
    this.loadCanvas(canvasData);
    // User A's offline red stroke is lost!
  });
});
```

**Why This Approach:**
- Server is single source of truth
- Prevents divergent states
- Simple to implement
- Users are notified of disconnection (can save work)

**Alternative (Not Implemented): Conflict Resolution on Reconnect**
```javascript
// On reconnect - merge offline work
socket.on('connect', () => {
  const offlineStrokes = this.getOfflineBuffer();
  if (offlineStrokes.length > 0) {
    // Replay offline strokes to server
    offlineStrokes.forEach(stroke => {
      socket.emit('drawing', stroke);
    });
  }
});
```
**Why not used**: More complex, rare scenario, risk of merging incompatible states

---

#### 6. **Eraser Conflicts**

**Scenario**: User A erases area where User B is drawing

```
Time: T0 - User B draws red stroke at (100, 100)
Time: T1 - User A erases at (100, 100)

User A's erase removes User B's stroke locally!
```

**Resolution Strategy**: **Eraser Not Synchronized (Design Decision)**

**Implementation:**
```javascript
// Eraser events are NOT sent to server
handlePointerMove(e) {
  if (this.mode === 'eraser') {
    // Draw locally only
    ctx.globalCompositeOperation = 'destination-out';
    ctx.stroke();
    // NO call to emitDrawEvent()
  }
}
```

**Why This Decision:**
- **Prevents Destructive Conflicts**: User A can't erase User B's work
- **User Control**: Each user controls their own eraser
- **Simpler Logic**: No need to track "who drew what"
- **Performance**: Less network traffic

**Trade-off:**
- Erase operations don't sync across clients
- Each user must erase their own mistakes

**Future Enhancement (CRDT-Based Eraser):**
```javascript
// Track stroke ownership
strokes = [
  {id: 'stroke1', userId: 'userA', points: [...], deleted: false},
  {id: 'stroke2', userId: 'userB', points: [...], deleted: false}
]

// Erase by stroke ID
eraseStroke(strokeId) {
  if (stroke.userId === currentUserId) {
    stroke.deleted = true;
    socket.emit('delete-stroke', {strokeId});
  }
}
```

---

### Conflict Resolution Hierarchy

The system uses a layered approach to conflict resolution:

```
1. Prevention (Best)
   ↓ Room isolation, local-only undo
   
2. Avoidance (Good)
   ↓ Dual-layer canvas, eraser not synced
   
3. Detection (Acceptable)
   ↓ No explicit detection - last-write-wins
   
4. Resolution (Fallback)
   ↓ Server authority, idempotent operations
```

---

### Why Not Use CRDTs or OT?

**CRDT (Conflict-free Replicated Data Types):**
- Pros: Automatic conflict resolution, strong eventual consistency
- Cons: Complex to implement for canvas operations, high overhead
- Example: Yjs, Automerge

**OT (Operational Transformation):**
- Pros: Proven for collaborative text editing (Google Docs)
- Cons: Very complex for canvas (pixel-level vs operation-level)
- Example: ShareDB, CodeMirror

**Current Approach: Simple Last-Write-Wins**
- Pros: Easy to implement, low overhead, predictable
- Cons: No formal conflict resolution, potential for confusion
- Good enough for: Casual collaborative drawing, brainstorming

**When to Upgrade:**
- Professional design tools requiring version control
- Legal/audit requirements for stroke ownership
- Large teams (>10 concurrent users) with tight collaboration
- Need to support offline editing with merge

---

### Conflict Resolution Summary Table

-------------------------------------------------------------------------------------------
|Conflict Type             |Strategy                        |Data Loss?        |Complexity|
|--------------------------|-------------------------------|-------------------|----------|
| Simultaneous Drawing     | Last-write-wins + Compositing | No                | Low      |
| Race on Join             | State transfer+Event ordering | Rare (timing)     | Low      |
| Concurrent Clear         | Idempotent operation          | No                | Low      |
| Undo After Remote Drawing| Local-only undo (no conflict) | No                | Low      |
| Network Partition        | Server authority              | Yes (offline work)| Medium   |
| Eraser Conflicts         | Not synchronized              | No (by design)    | Low      |
-------------------------------------------------------------------------------------------

---

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

### 5. **Optimistic UI Pattern**
- Render local changes immediately
- Assume success, handle failures asynchronously
- Better perceived performance

### 6. **Last-Write-Wins (LWW) Pattern**
- Simple conflict resolution
- Temporal ordering determines outcome
- No explicit locking or coordination needed

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
│Load Balancer│
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

### 1. **Microservices Architecture**
Split monolithic server into specialized services:
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Auth      │  │   Canvas    │  │    Room     │
│  Service    │  │  Service    │  │  Service    │
└─────────────┘  └─────────────┘  └─────────────┘
       │                │                │
       └────────────────┴────────────────┘
                        │
                 ┌──────┴──────┐
                 │ API Gateway │
                 └─────────────┘
```

### 2. **Event Sourcing**
Store drawing operations instead of full state:
```javascript
// Instead of: canvas.toDataURL()
// Store: 
events = [
  {type: 'stroke-start', pos: {x, y}, timestamp: 123, userId: 'A'},
  {type: 'stroke-move', pos: {x, y}, timestamp: 124, userId: 'A'},
  {type: 'stroke-end', timestamp: 125, userId: 'A'}
]

// Rebuild canvas by replaying events
function rebuildCanvas(events) {
  events.forEach(event => applyEvent(event));
}
```
**Benefits**: Full history, time-travel debugging, audit trail

### 3. **CRDT (Conflict-free Replicated Data Types)**
Use CRDTs for automatic conflict resolution:
```javascript
// Yjs integration example
import * as Y from 'yjs';

const doc = new Y.Doc();
const strokes = doc.getArray('strokes');

// Add stroke (automatically merges with others)
strokes.push([{
  points: [...],
  color: '#000',
  userId: 'A'
}]);

// Sync between clients
doc.on('update', (update) => {
  socket.emit('sync', update);
});
```
**Benefits**: Offline support, strong consistency, no server arbitration

### 4. **WebRTC Peer-to-Peer**
Reduce server load with P2P connections:
```
Traditional:
Client A → Server → Client B

WebRTC:
Client A ←→ Client B (direct connection)
         ↓
      Server (signaling only)
```
**Benefits**: Lower latency, reduced server cost, scales better

### 5. **GraphQL API**
Replace REST with GraphQL for flexible queries:
```graphql
query {
  room(id: "room1") {
    clients {
      username
      cursorPosition
    }
    canvasState
    history(last: 10) {
      userId
      action
      timestamp
    }
  }
}
```
**Benefits**: Efficient data fetching, strong typing, real-time subscriptions

### 6. **Database Integration**
Replace in-memory storage:
```javascript
// MongoDB for canvas state
const CanvasState = mongoose.model('CanvasState', {
  roomId: String,
  canvasData: Buffer,  // Binary PNG data
  version: Number,
  timestamp: Date
});

// Redis for session state
redis.set(`room:${roomId}:users`, JSON.stringify(users), 'EX', 3600);

// PostgreSQL for user data
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(50),
  email VARCHAR(100),
  created_at TIMESTAMP
);
```

### 7. **Serverless Architecture**
Deploy as serverless functions:
```
┌────────────────┐
│   AWS Lambda   │  Drawing event processor
│   Azure Funcs  │  State management
│   Cloudflare   │  Room management
└────────────────┘
        ↓
┌────────────────┐
│   DynamoDB     │  Persistent storage
│   Redis        │  Session cache
└────────────────┘
```

### 8. **Progressive Web App (PWA)**
Add offline support:
```javascript
// Service worker for offline caching
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Save drawings offline
if (!navigator.onLine) {
  localStorage.setItem('offlineDrawing', canvas.toDataURL());
}
```

---

## Architecture Decision Records (ADRs)

### ADR-001: WebSocket vs Server-Sent Events vs WebRTC
- **Decision**: Use WebSocket (Socket.IO)
- **Rationale**: Bidirectional, mature library, room support
- **Status**: Accepted

### ADR-002: Local-Only vs Global Undo/Redo
- **Decision**: Local-only undo/redo
- **Rationale**: Simpler UX, no conflicts, instant response
- **Status**: Accepted

### ADR-003: Data URLs vs Binary Blobs for Canvas State
- **Decision**: Data URLs (base64 PNG)
- **Rationale**: Simpler implementation, sufficient performance
- **Status**: Accepted (may revisit for v2.0)

### ADR-004: In-Memory vs Persistent Storage
- **Decision**: In-memory (Map)
- **Rationale**: Prototyping, simplicity, fast access
- **Status**: Temporary (will migrate to database)

### ADR-005: Eraser Synchronization
- **Decision**: Do NOT sync eraser operations
- **Rationale**: Prevents destructive conflicts, simpler logic
- **Status**: Accepted (may add CRDT-based eraser later)

### ADR-006: Room Isolation vs Global Canvas
- **Decision**: Room-based isolation
- **Rationale**: Privacy, performance, scalability
- **Status**: Accepted

### ADR-007: Optimistic UI vs Wait-for-Server
- **Decision**: Optimistic UI (render immediately)
- **Rationale**: Better UX, lower perceived latency
- **Status**: Accepted

---

## System Metrics & Monitoring

### Recommended Metrics to Track

**Performance Metrics:**
- Average drawing event latency (client → server → other clients)
- Canvas state transfer time (size and duration)
- Undo/Redo operation time
- Memory usage per connection
- CPU usage during active drawing

**Reliability Metrics:**
- WebSocket connection success rate
- Reconnection frequency
- Event delivery success rate
- Server uptime

**Usage Metrics:**
- Active rooms count
- Concurrent users per room
- Average session duration
- Drawing events per second (per room)
- Canvas state size distribution

**Business Metrics:**
- New rooms created per day
- Peak concurrent users
- Average room occupancy
- User engagement (strokes per session)

### Monitoring Tools (Recommended)

```javascript
// Prometheus metrics example
const client = require('prom-client');

const drawingEventsCounter = new client.Counter({
  name: 'canvas_drawing_events_total',
  help: 'Total number of drawing events',
  labelNames: ['room', 'event_type']
});

socket.on('drawing', (data) => {
  drawingEventsCounter.inc({room: data.roomId, event_type: data.type});
  // ... process drawing
});
```

---

## Conclusion

This architecture provides a solid foundation for a real-time collaborative canvas application. The key design principles are:

1. **Simplicity Over Complexity**: Choose simple solutions (local undo, in-memory storage) that work well for the target scale
2. **Optimistic UI**: Prioritize user experience with immediate local rendering
3. **Room Isolation**: Ensure scalability and privacy through room-based architecture
4. **Pragmatic Conflict Resolution**: Use last-write-wins instead of complex CRDTs for now
5. **Modular Design**: Clean separation of concerns for maintainability

The system is designed to be easily extended with:
- Database persistence
- User authentication
- Advanced conflict resolution (CRDTs)
- Horizontal scaling (Redis adapter)
- Additional drawing tools and features

---

**Document Version**: 2.0  
**Last Updated**: November 8, 2025  
**Next Review**: When implementing database persistence or scaling beyond single server