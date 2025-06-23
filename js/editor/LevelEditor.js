/**
 * Level Editor Main Class
 * Handles the level editor interface and functionality
 */

import { LevelData } from '../utils/LevelData.js';
import { LevelLoader } from '../utils/LevelLoader.js';
import { Vector2 } from '../utils/Vector2.js';

export class LevelEditor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.currentLevel = null;
        this.levelLoader = new LevelLoader();
        
        // Editor state
        this.currentTool = 'brush';
        this.currentLayer = 'collision';
        this.selectedTile = 1;
        this.selectedEntity = 'player_spawn';
        this.selectedEntities = [];
        this.clipboard = null;
          // View state
        this.camera = { x: 0, y: 0 };
        this.zoom = 1;
        this.showGrid = true;
        this.snapToGrid = true;
        this.gridSize = 32;
        this.debugMode = true; // Debug mode on by default in editor
        
        // Mouse state
        this.mousePos = { x: 0, y: 0 };
        this.worldPos = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.isMouseDown = false;
        this.lastDrawPos = { x: -1, y: -1 };
        
        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        
        // UI references
        this.elements = {};
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupUI();
        this.setupEventListeners();
        this.createNewLevel();
        this.render();
        
        console.log('Level Editor initialized');
    }

    setupCanvas() {
        this.canvas = document.getElementById('editorCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set up canvas properties
        this.ctx.imageSmoothingEnabled = false;
        this.canvas.style.imageRendering = 'pixelated';
          // Cache UI elements
        this.elements = {
            levelName: document.getElementById('levelName'),
            zoomLevel: document.getElementById('zoomLevel'),
            cursorPosition: document.getElementById('cursorPosition'),
            levelSize: document.getElementById('levelSize'),
            entityCount: document.getElementById('entityCount'),
            tileCount: document.getElementById('tileCount'),
            fileSize: document.getElementById('fileSize'),
            debugIndicator: document.getElementById('debugModeIndicator')
        };
    }

    setupUI() {
        // Initialize tile palette
        this.initializeTilePalette();
        
        // Initialize layer controls
        this.updateLayerVisibility();
        
        // Update initial UI state
        this.updateUI();
    }

    setupEventListeners() {
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTool(e.target.dataset.tool);
            });
        });
        
        // Layer controls
        document.querySelectorAll('.layer-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    this.setLayer(e.currentTarget.dataset.layer);
                }
            });
        });
        
        // Layer visibility checkboxes
        document.querySelectorAll('.layer-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateLayerVisibility());
        });
        
        // Entity buttons
        document.querySelectorAll('.entity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setSelectedEntity(e.currentTarget.dataset.entity);
                this.setTool('entity');
            });
        });
        
        // Header buttons
        document.getElementById('playTestBtn').addEventListener('click', () => this.playTest());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveLevel());
        document.getElementById('loadBtn').addEventListener('click', () => this.showLoadModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportLevel());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettingsModal());
        
        // Zoom controls
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('resetZoomBtn').addEventListener('click', () => this.resetZoom());
        
        // Property controls
        document.getElementById('levelWidth').addEventListener('change', (e) => {
            this.resizeLevel(parseInt(e.target.value), this.currentLevel.properties.height);
        });
        document.getElementById('levelHeight').addEventListener('change', (e) => {
            this.resizeLevel(this.currentLevel.properties.width, parseInt(e.target.value));
        });
        document.getElementById('backgroundColor').addEventListener('change', (e) => {
            this.currentLevel.properties.backgroundColor = e.target.value;
            this.render();
        });
        
        // Grid controls
        document.getElementById('showGrid').addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.render();
        });
        document.getElementById('snapToGrid').addEventListener('change', (e) => {
            this.snapToGrid = e.target.checked;
        });
        document.getElementById('gridSize').addEventListener('change', (e) => {
            this.gridSize = parseInt(e.target.value);
            this.render();
        });
        
        // Modal controls
        this.setupModalListeners();
    }

    setupModalListeners() {
        // Modal close buttons
        document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.modal || e.target.closest('.modal').id;
                this.hideModal(modalId);
            });
        });
        
        // Modal background clicks
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    createNewLevel() {
        this.currentLevel = LevelData.createEmpty({
            metadata: {
                name: "New Level",
                author: "Level Editor",
                description: "Created with Echo Genesis Level Editor"
            }
        });
        
        this.saveToHistory();
        this.updateUI();
        this.render();
    }

    initializeTilePalette() {
        const palette = document.getElementById('tilePalette');
        palette.innerHTML = '';
        
        // Create tile buttons (simplified - would normally load from tileset)
        for (let i = 0; i < 64; i++) {
            const btn = document.createElement('div');
            btn.className = 'tile-btn';
            btn.dataset.tileId = i;
            
            // Simple color coding for different tile types
            if (i === 0) {
                btn.style.background = 'transparent';
                btn.style.border = '1px dashed #666';
            } else if (i <= 10) {
                btn.style.background = `hsl(${(i * 30) % 360}, 60%, 50%)`;
            } else {
                btn.style.background = `hsl(${(i * 15) % 360}, 40%, 30%)`;
            }
            
            btn.addEventListener('click', () => {
                this.selectedTile = i;
                document.querySelectorAll('.tile-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
            
            palette.appendChild(btn);
        }
        
        // Select first tile by default
        palette.firstChild.classList.add('selected');
    }

    setTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        
        // Update cursor
        this.updateCursor();
    }

    setLayer(layer) {
        this.currentLayer = layer;
        
        // Update UI
        document.querySelectorAll('.layer-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-layer="${layer}"]`).classList.add('active');
    }

    setSelectedEntity(entityType) {
        this.selectedEntity = entityType;
        
        // Update UI
        document.querySelectorAll('.entity-btn').forEach(btn => btn.classList.remove('selected'));
        document.querySelector(`[data-entity="${entityType}"]`).classList.add('selected');
    }

    updateCursor() {
        const cursors = {
            brush: 'crosshair',
            eraser: 'crosshair',
            fill: 'crosshair',
            select: 'default',
            entity: 'copy'
        };
        
        this.canvas.style.cursor = cursors[this.currentTool] || 'default';
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.worldPos = this.screenToWorld(this.mousePos);
        this.isMouseDown = true;
        this.isDragging = false;
        this.dragStart = { ...this.worldPos };
        
        // Handle tool actions
        if (e.button === 0) { // Left click
            this.handleToolAction();
        } else if (e.button === 1) { // Middle click - pan
            this.canvas.style.cursor = 'grab';
            e.preventDefault();
        } else if (e.button === 2) { // Right click
            this.handleRightClick();
        }
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.worldPos = this.screenToWorld(this.mousePos);
        
        // Update cursor position display
        const tileX = Math.floor(this.worldPos.x / this.currentLevel.properties.tileSize);
        const tileY = Math.floor(this.worldPos.y / this.currentLevel.properties.tileSize);
        this.elements.cursorPosition.textContent = `${tileX}, ${tileY}`;
        
        if (this.isMouseDown) {
            if (e.buttons === 4) { // Middle mouse drag - pan camera
                const deltaX = (this.mousePos.x - this.dragStart.x) / this.zoom;
                const deltaY = (this.mousePos.y - this.dragStart.y) / this.zoom;
                this.camera.x -= deltaX;
                this.camera.y -= deltaY;
                this.render();
            } else if (e.buttons === 1) { // Left drag
                this.handleToolDrag();
            }
        }
        
        // Always render to show cursor
        this.render();
    }

    onMouseUp(e) {
        this.isMouseDown = false;
        this.isDragging = false;
        this.canvas.style.cursor = '';
        this.updateCursor();
        
        this.lastDrawPos = { x: -1, y: -1 };
    }

    onWheel(e) {
        e.preventDefault();
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const oldZoom = this.zoom;
        this.zoom = Math.max(0.1, Math.min(5, this.zoom * zoomFactor));
        
        // Zoom towards mouse position
        const mouseWorld = this.screenToWorld(this.mousePos);
        this.camera.x += (mouseWorld.x - this.worldPos.x);
        this.camera.y += (mouseWorld.y - this.worldPos.y);
        
        this.updateUI();
        this.render();
    }

    onKeyDown(e) {
        // Tool shortcuts
        const toolKeys = {
            'KeyB': 'brush',
            'KeyE': 'eraser',
            'KeyF': 'fill',
            'KeyS': 'select',
            'KeyT': 'entity'
        };
          if (toolKeys[e.code] && !e.ctrlKey) {
            this.setTool(toolKeys[e.code]);
            e.preventDefault();
            return;
        }
          // Debug mode toggle
        if (e.code === 'KeyD' && !e.ctrlKey) {
            this.debugMode = !this.debugMode;
            this.updateDebugUI();
            this.render();
            this.showNotification(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
            e.preventDefault();
            return;
        }
        
        // Other shortcuts
        if (e.ctrlKey) {
            switch (e.code) {
                case 'KeyZ':
                    this.undo();
                    e.preventDefault();
                    break;
                case 'KeyY':
                    this.redo();
                    e.preventDefault();
                    break;
                case 'KeyS':
                    this.saveLevel();
                    e.preventDefault();
                    break;
                case 'KeyO':
                    this.showLoadModal();
                    e.preventDefault();
                    break;
                case 'KeyN':
                    this.createNewLevel();
                    e.preventDefault();
                    break;
            }
        }
        
        // Arrow key navigation
        const panSpeed = 50;
        switch (e.code) {
            case 'ArrowLeft':
                this.camera.x -= panSpeed;
                this.render();
                break;
            case 'ArrowRight':
                this.camera.x += panSpeed;
                this.render();
                break;
            case 'ArrowUp':
                this.camera.y -= panSpeed;
                this.render();
                break;
            case 'ArrowDown':
                this.camera.y += panSpeed;
                this.render();
                break;
        }
    }

    handleToolAction() {
        const tileX = Math.floor(this.worldPos.x / this.currentLevel.properties.tileSize);
        const tileY = Math.floor(this.worldPos.y / this.currentLevel.properties.tileSize);
        
        switch (this.currentTool) {
            case 'brush':
                this.paintTile(tileX, tileY);
                break;
            case 'eraser':
                this.eraseTile(tileX, tileY);
                break;
            case 'fill':
                this.fillArea(tileX, tileY);
                break;
            case 'entity':
                this.placeEntity();
                break;
            case 'select':
                this.selectArea();
                break;
        }
    }

    handleToolDrag() {
        const tileX = Math.floor(this.worldPos.x / this.currentLevel.properties.tileSize);
        const tileY = Math.floor(this.worldPos.y / this.currentLevel.properties.tileSize);
        
        // Avoid painting same tile multiple times
        if (this.lastDrawPos.x === tileX && this.lastDrawPos.y === tileY) {
            return;
        }
        
        this.lastDrawPos = { x: tileX, y: tileY };
        
        switch (this.currentTool) {
            case 'brush':
                this.paintTile(tileX, tileY);
                break;
            case 'eraser':
                this.eraseTile(tileX, tileY);
                break;
        }
    }

    handleRightClick() {
        // Sample tile or entity under cursor
        const tileX = Math.floor(this.worldPos.x / this.currentLevel.properties.tileSize);
        const tileY = Math.floor(this.worldPos.y / this.currentLevel.properties.tileSize);
        
        if (this.currentLayer !== 'entities') {
            const tileId = this.currentLevel.getTile(this.currentLayer, tileX, tileY);
            this.selectedTile = tileId;
            
            // Update tile palette selection
            document.querySelectorAll('.tile-btn').forEach(btn => btn.classList.remove('selected'));
            const tileBtn = document.querySelector(`[data-tile-id="${tileId}"]`);
            if (tileBtn) tileBtn.classList.add('selected');
        }
    }

    paintTile(tileX, tileY) {
        if (this.currentLayer === 'entities') return;
        
        const oldTile = this.currentLevel.getTile(this.currentLayer, tileX, tileY);
        if (oldTile !== this.selectedTile) {
            this.currentLevel.setTile(this.currentLayer, tileX, tileY, this.selectedTile);
            this.render();
        }
    }

    eraseTile(tileX, tileY) {
        if (this.currentLayer === 'entities') return;
        
        const oldTile = this.currentLevel.getTile(this.currentLayer, tileX, tileY);
        if (oldTile !== 0) {
            this.currentLevel.setTile(this.currentLayer, tileX, tileY, 0);
            this.render();
        }
    }

    fillArea(tileX, tileY) {
        if (this.currentLayer === 'entities') return;
        
        const targetTile = this.currentLevel.getTile(this.currentLayer, tileX, tileY);
        if (targetTile === this.selectedTile) return;
        
        // Simple flood fill algorithm
        const stack = [{ x: tileX, y: tileY }];
        const visited = new Set();
        
        while (stack.length > 0) {
            const { x, y } = stack.pop();
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            if (x < 0 || y < 0 || x >= this.currentLevel.properties.width || y >= this.currentLevel.properties.height) continue;
            if (this.currentLevel.getTile(this.currentLayer, x, y) !== targetTile) continue;
            
            visited.add(key);
            this.currentLevel.setTile(this.currentLayer, x, y, this.selectedTile);
            
            // Add neighbors
            stack.push({ x: x + 1, y });
            stack.push({ x: x - 1, y });
            stack.push({ x, y: y + 1 });
            stack.push({ x, y: y - 1 });
        }
        
        this.render();
    }

    placeEntity() {
        const entityX = this.snapToGrid ? 
            Math.floor(this.worldPos.x / this.gridSize) * this.gridSize :
            this.worldPos.x;
        const entityY = this.snapToGrid ?
            Math.floor(this.worldPos.y / this.gridSize) * this.gridSize :
            this.worldPos.y;
        
        // Check for existing player spawn
        if (this.selectedEntity === 'player_spawn') {
            const existingSpawns = this.currentLevel.getEntitiesByType('player_spawn');
            if (existingSpawns.length > 0) {
                // Remove existing spawn
                this.currentLevel.removeEntity(existingSpawns[0].id);
            }
        }
        
        this.currentLevel.addEntity({
            type: this.selectedEntity,
            x: entityX,
            y: entityY
        });
        
        this.updateUI();
        this.render();
    }

    screenToWorld(screenPos) {
        return {
            x: (screenPos.x / this.zoom) + this.camera.x,
            y: (screenPos.y / this.zoom) + this.camera.y
        };
    }

    worldToScreen(worldPos) {
        return {
            x: (worldPos.x - this.camera.x) * this.zoom,
            y: (worldPos.y - this.camera.y) * this.zoom
        };
    }

    zoomIn() {
        this.zoom = Math.min(5, this.zoom * 1.2);
        this.updateUI();
        this.render();
    }

    zoomOut() {
        this.zoom = Math.max(0.1, this.zoom / 1.2);
        this.updateUI();
        this.render();
    }

    resetZoom() {
        this.zoom = 1;
        this.camera = { x: 0, y: 0 };
        this.updateUI();
        this.render();
    }

    render() {
        if (!this.currentLevel) return;
        
        // Clear canvas
        this.ctx.fillStyle = this.currentLevel.properties.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set up transform
        this.ctx.save();
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Render layers
        this.renderTileLayer('background');
        this.renderTileLayer('collision');
        this.renderTileLayer('foreground');
        this.renderEntities();
        
        // Render grid
        if (this.showGrid) {
            this.renderGrid();
        }
        
        // Render cursor
        this.renderCursor();
        
        this.ctx.restore();
    }

    renderTileLayer(layerName) {
        const checkbox = document.getElementById(`${layerName}Visible`);
        if (!checkbox.checked) return;
        
        const tileSize = this.currentLevel.properties.tileSize;
        const levelWidth = this.currentLevel.properties.width;
        const levelHeight = this.currentLevel.properties.height;
        
        // Calculate visible tile range
        const startX = Math.floor(this.camera.x / tileSize);
        const startY = Math.floor(this.camera.y / tileSize);
        const endX = Math.min(levelWidth, startX + Math.ceil(this.canvas.width / (tileSize * this.zoom)) + 1);
        const endY = Math.min(levelHeight, startY + Math.ceil(this.canvas.height / (tileSize * this.zoom)) + 1);
        
        for (let y = Math.max(0, startY); y < endY; y++) {
            for (let x = Math.max(0, startX); x < endX; x++) {
                const tileId = this.currentLevel.getTile(layerName, x, y);
                if (tileId > 0) {
                    const pixelX = x * tileSize;
                    const pixelY = y * tileSize;
                    
                    // Simple tile rendering - would normally use tileset graphics
                    this.ctx.fillStyle = this.getTileColor(layerName, tileId);
                    this.ctx.fillRect(pixelX, pixelY, tileSize, tileSize);
                    
                    // Tile border for collision layer
                    if (layerName === 'collision') {
                        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                        this.ctx.lineWidth = 1;
                        this.ctx.strokeRect(pixelX, pixelY, tileSize, tileSize);
                    }
                }
            }
        }
    }

    getTileColor(layerName, tileId) {
        const colors = {
            background: `hsl(${(tileId * 30) % 360}, 50%, 40%)`,
            collision: `hsl(${(tileId * 30) % 360}, 60%, 50%)`,
            foreground: `hsl(${(tileId * 30) % 360}, 70%, 60%)`
        };
        return colors[layerName] || '#666';
    }    renderEntities() {
        const checkbox = document.getElementById('entitiesVisible');
        if (!checkbox.checked) return;
        
        this.currentLevel.layers.entities.forEach(entity => {
            const screenPos = this.worldToScreen({ x: entity.x, y: entity.y });
              // Entity background
            this.ctx.fillStyle = this.getEntityColor(entity.type);
            this.ctx.fillRect(entity.x - 8, entity.y - 8, 16, 16);
            
            // Debug outline (only in debug mode)
            if (this.debugMode) {
                this.ctx.strokeStyle = this.getEntityDebugColor(entity.type);
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(entity.x - 8, entity.y - 8, 16, 16);
            }
            
            // Entity symbol
            this.ctx.fillStyle = 'white';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.getEntitySymbol(entity.type), entity.x, entity.y + 3);
            
            // Debug label above entity (only in debug mode)
            if (this.debugMode) {
                this.renderEntityDebugLabel(entity);
            }
        });
    }

    renderEntityDebugLabel(entity) {
        const labelText = this.getEntityDebugText(entity.type, entity.properties);
        const labelX = entity.x;
        const labelY = entity.y - 20;
        
        // Background for label
        this.ctx.font = '9px Arial';
        const textMetrics = this.ctx.measureText(labelText);
        const padding = 3;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(
            labelX - textMetrics.width / 2 - padding,
            labelY - 6,
            textMetrics.width + padding * 2,
            12
        );
        
        // Label text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(labelText, labelX, labelY);
    }

    getEntityDebugColor(entityType) {
        const colors = {
            'player_spawn': '#00ff00',
            'powerup': '#ffff00', 
            'health': '#ff0088',
            'checkpoint': '#00ffff',
            'basic_enemy': '#ff0000',
            'flying_enemy': '#ff8800',
            'enemy': '#ff0000',
            'platform': '#888888'
        };
        return colors[entityType] || '#ffffff';
    }

    getEntityDebugText(entityType, properties = {}) {
        switch (entityType) {
            case 'player_spawn':
                return 'Player Spawn';
            case 'powerup':
                return properties.powerType ? `PowerUp (${properties.powerType})` : 'PowerUp';
            case 'health':
                return 'Health Pack';
            case 'checkpoint':
                return 'Checkpoint';
            case 'basic_enemy':
                return 'Basic Enemy';
            case 'flying_enemy':
                return 'Flying Enemy';
            case 'enemy':
                return properties.enemyType ? `Enemy (${properties.enemyType})` : 'Enemy';
            default:
                return entityType || 'Entity';
        }
    }

    getEntityColor(entityType) {
        const colors = {
            player_spawn: '#4fd1c7',
            powerup: '#ffd700',
            health: '#ff6b6b',
            checkpoint: '#4ecdc4',
            basic_enemy: '#e74c3c',
            flying_enemy: '#9b59b6'
        };
        return colors[entityType] || '#999';
    }

    getEntitySymbol(entityType) {
        const symbols = {
            player_spawn: '♦',
            powerup: '⭐',
            health: '❤',
            checkpoint: '🏁',
            basic_enemy: '👾',
            flying_enemy: '🛸'
        };
        return symbols[entityType] || '?';
    }

    renderGrid() {
        const tileSize = this.gridSize;
        const startX = Math.floor(this.camera.x / tileSize) * tileSize;
        const startY = Math.floor(this.camera.y / tileSize) * tileSize;
        const endX = this.camera.x + this.canvas.width / this.zoom;
        const endY = this.camera.y + this.canvas.height / this.zoom;
        
        this.ctx.strokeStyle = 'rgba(79, 209, 199, 0.2)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = startX; x < endX; x += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.camera.y);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = startY; y < endY; y += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.camera.x, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
    }

    renderCursor() {
        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            const tileSize = this.currentLevel.properties.tileSize;
            const tileX = Math.floor(this.worldPos.x / tileSize) * tileSize;
            const tileY = Math.floor(this.worldPos.y / tileSize) * tileSize;
            
            this.ctx.strokeStyle = this.currentTool === 'brush' ? '#4fd1c7' : '#e53e3e';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(tileX, tileY, tileSize, tileSize);
        } else if (this.currentTool === 'entity') {
            this.ctx.strokeStyle = '#4fd1c7';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(this.worldPos.x - 8, this.worldPos.y - 8, 16, 16);
        }
    }

    updateUI() {
        if (!this.currentLevel) return;
        
        // Update level name
        this.elements.levelName.textContent = this.currentLevel.metadata.name;
        
        // Update zoom level
        this.elements.zoomLevel.textContent = Math.round(this.zoom * 100) + '%';
        
        // Update level size
        this.elements.levelSize.textContent = 
            `${this.currentLevel.properties.width} x ${this.currentLevel.properties.height}`;
        
        // Update statistics
        const stats = this.currentLevel.getStats();
        this.elements.entityCount.textContent = stats.entities.total;
        
        const totalTiles = stats.tiles.used.background + stats.tiles.used.collision + stats.tiles.used.foreground;
        this.elements.tileCount.textContent = totalTiles;
        
        const jsonSize = Math.ceil(this.currentLevel.toJSON().length / 1024);
        this.elements.fileSize.textContent = jsonSize + ' KB';
          // Update property inputs
        document.getElementById('levelWidth').value = this.currentLevel.properties.width;
        document.getElementById('levelHeight').value = this.currentLevel.properties.height;
        document.getElementById('backgroundColor').value = this.currentLevel.properties.backgroundColor;
        
        // Update debug UI
        this.updateDebugUI();
    }

    updateLayerVisibility() {
        this.render();
    }

    resizeLevel(newWidth, newHeight) {
        if (newWidth === this.currentLevel.properties.width && 
            newHeight === this.currentLevel.properties.height) {
            return;
        }
        
        this.currentLevel.resize(newWidth, newHeight);
        this.saveToHistory();
        this.updateUI();
        this.render();
    }

    saveToHistory() {
        // Remove any future history if we're in the middle
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add current state
        this.history.push(this.currentLevel.clone());
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.currentLevel = this.history[this.historyIndex].clone();
            this.updateUI();
            this.render();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.currentLevel = this.history[this.historyIndex].clone();
            this.updateUI();
            this.render();
        }
    }

    async saveLevel() {
        try {
            const levelId = `level_${Date.now()}`;
            await this.levelLoader.saveLevel(this.currentLevel, `localStorage:${levelId}`);
            
            this.showNotification('Level saved successfully!', 'success');
        } catch (error) {
            this.showNotification(`Failed to save level: ${error.message}`, 'error');
        }
    }

    async exportLevel() {
        try {
            await this.levelLoader.saveLevel(this.currentLevel, 'download', {
                filename: `${this.currentLevel.metadata.name.replace(/[^a-z0-9]/gi, '_')}.json`
            });
            
            this.showNotification('Level exported successfully!', 'success');
        } catch (error) {
            this.showNotification(`Failed to export level: ${error.message}`, 'error');
        }
    }

    showLoadModal() {
        const modal = document.getElementById('loadLevelModal');
        this.populateSavedLevels();
        this.showModal('loadLevelModal');
    }

    showSettingsModal() {
        // Populate settings modal with current level data
        document.getElementById('levelNameInput').value = this.currentLevel.metadata.name;
        document.getElementById('levelAuthor').value = this.currentLevel.metadata.author || '';
        document.getElementById('levelDescription').value = this.currentLevel.metadata.description || '';
        
        this.showModal('levelSettingsModal');
    }

    populateSavedLevels() {
        const levelsList = document.getElementById('savedLevelsList');
        const savedLevels = this.levelLoader.getSavedLevels();
        
        levelsList.innerHTML = '';
        
        if (savedLevels.length === 0) {
            levelsList.innerHTML = '<p class="text-muted text-center">No saved levels found</p>';
            return;
        }
        
        savedLevels.forEach(level => {
            const levelItem = document.createElement('div');
            levelItem.className = 'level-item';
            levelItem.dataset.levelId = level.id;
            
            levelItem.innerHTML = `
                <div class="level-info">
                    <h4>${level.name}</h4>
                    <div class="level-meta">
                        By ${level.author} • ${new Date(level.modified).toLocaleDateString()}
                    </div>
                </div>
                <div class="level-actions">
                    <button class="btn btn-small btn-danger" onclick="this.deleteLevel('${level.id}')">Delete</button>
                </div>
            `;
            
            levelItem.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    document.querySelectorAll('.level-item').forEach(item => item.classList.remove('selected'));
                    levelItem.classList.add('selected');
                }
            });
            
            levelsList.appendChild(levelItem);
        });
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#e53e3e' : '#4fd1c7'};
            color: white;
            border-radius: 4px;
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    playTest() {
        // Save current level to temporary storage and open game
        localStorage.setItem('temp_level', this.currentLevel.toJSON());
        window.open('game.html?level=temp_level', '_blank');
    }

    updateDebugUI() {
        if (this.elements.debugIndicator) {
            if (this.debugMode) {
                this.elements.debugIndicator.classList.remove('hidden');
            } else {
                this.elements.debugIndicator.classList.add('hidden');
            }
        }
    }
}

// Initialize editor when page loads
document.addEventListener('DOMContentLoaded', () => {
    new LevelEditor();
});
