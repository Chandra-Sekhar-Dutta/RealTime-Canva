export class CanvasManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    
    this.remoteCanvas = document.createElement('canvas');
    this.remoteCtx = this.remoteCanvas.getContext('2d', { alpha: true });
    
    this.drawing = false;
    this.lastPos = { x: 0, y: 0 };
    this.mode = 'brush';
    this.strokeColor = '#000000';
    this.lineWidth = 5;
    
    this.undoStack = [];
    this.redoStack = [];
    this.MAX_STACK = 50;
    
    this.onStateChange = null;
    
    this.initCanvas();
    this.setupEventListeners();
  }
  
  initCanvas() {
    this.setCanvasSize();
    window.addEventListener('resize', () => this.setCanvasSize());
  }
  
  setCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    const data = this.canvas.toDataURL();
    const remoteData = this.remoteCanvas.toDataURL();
    
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.remoteCanvas.width = this.canvas.width;
    this.remoteCanvas.height = this.canvas.height;
    
    this.ctx.scale(dpr, dpr);
    this.remoteCtx.scale(dpr, dpr);
    
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.remoteCtx.imageSmoothingEnabled = true;
    this.remoteCtx.imageSmoothingQuality = 'high';
    
    const img = new Image();
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0, rect.width, rect.height);
      this.composeLayers();
    };
    img.src = data;
    
    const remoteImg = new Image();
    remoteImg.onload = () => {
      this.remoteCtx.clearRect(0, 0, this.remoteCanvas.width, this.remoteCanvas.height);
      this.remoteCtx.drawImage(remoteImg, 0, 0, rect.width, rect.height);
    };
    remoteImg.src = remoteData;
  }
  
  composeLayers() {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.drawImage(this.remoteCanvas, 0, 0, rect.width, rect.height);
    this.ctx.restore();
  }
  
  setupEventListeners() {
    this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    this.canvas.addEventListener('pointercancel', (e) => this.handlePointerUp(e));
    this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  }
  
  getPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top)
    };
  }
  
  handlePointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    
    this.canvas.setPointerCapture(e.pointerId);
    this.pushUndo();
    
    this.drawing = true;
    this.lastPos = this.getPointerPos(e);
    
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = this.lineWidth;
    
    if (this.mode === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.strokeColor;
    }
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastPos.x, this.lastPos.y);
    
    if (this.mode === 'brush') {
      this.emitDrawEvent('start', this.lastPos);
    }
  }
  
  handlePointerMove(e) {
    if (!this.drawing) return;
    
    const pos = this.getPointerPos(e);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    this.lastPos = pos;
    
    if (this.mode === 'brush') {
      this.emitDrawEvent('move', pos);
    }
  }
  
  handlePointerUp(e) {
    if (!this.drawing) return;
    
    this.drawing = false;
    this.ctx.closePath();
    this.redoStack.length = 0;
    
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch (err) {}
    
    if (this.mode === 'brush') {
      this.emitDrawEvent('end', this.lastPos);
    }
    
    this.composeLayers();
  }
  
  setMode(mode) {
    this.mode = mode;
    if (this.onStateChange) this.onStateChange('mode', mode);
  }
  
  setColor(color) {
    this.strokeColor = color;
    if (this.onStateChange) this.onStateChange('color', color);
  }
  
  setLineWidth(width) {
    this.lineWidth = width;
    if (this.onStateChange) this.onStateChange('width', width);
  }
  
  pushUndo() {
    if (this.undoStack.length >= this.MAX_STACK) this.undoStack.shift();
    this.undoStack.push(this.canvas.toDataURL());
    if (this.redoStack.length > this.MAX_STACK) this.redoStack.shift();
  }
  
  undo() {
    if (this.undoStack.length === 0) return false;
    
    this.redoStack.push(this.canvas.toDataURL());
    const dataUrl = this.undoStack.pop();
    this.applyDataUrl(dataUrl);
    return true;
  }
  
  redo() {
    if (this.redoStack.length === 0) return false;
    
    this.undoStack.push(this.canvas.toDataURL());
    const dataUrl = this.redoStack.pop();
    this.applyDataUrl(dataUrl);
    return true;
  }
  
  applyDataUrl(dataUrl) {
    const img = new Image();
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
    };
    img.src = dataUrl;
  }
  
  clear() {
    this.pushUndo();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.redoStack.length = 0;
  }
  
  download(filename = 'canvas.png') {
    const a = document.createElement('a');
    a.href = this.canvas.toDataURL('image/png');
    a.download = filename;
    a.click();
  }
  
  emitDrawEvent(type, pos) {
    if (this.onStateChange) {
      this.onStateChange('draw', {
        type,
        pos,
        mode: this.mode,
        color: this.strokeColor,
        width: this.lineWidth
      });
    }
  }
  
  applyRemoteDrawing(drawData) {
    const { type, pos, mode, color, width } = drawData;
    
    if (mode === 'eraser') {
      return;
    }
    
    this.remoteCtx.lineCap = 'round';
    this.remoteCtx.lineJoin = 'round';
    this.remoteCtx.lineWidth = width;
    this.remoteCtx.globalCompositeOperation = 'source-over';
    this.remoteCtx.strokeStyle = color;
    
    if (type === 'start') {
      this.remoteCtx.beginPath();
      this.remoteCtx.moveTo(pos.x, pos.y);
    } else if (type === 'move') {
      this.remoteCtx.lineTo(pos.x, pos.y);
      this.remoteCtx.stroke();
      this.composeLayers();
    } else if (type === 'end') {
      this.remoteCtx.closePath();
      this.composeLayers();
    }
  }
  
  getCanvasData() {
    return this.canvas.toDataURL();
  }
  
  loadCanvasData(dataUrl) {
    this.applyDataUrl(dataUrl);
  }
}
