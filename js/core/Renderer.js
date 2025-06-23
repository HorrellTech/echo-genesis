/**
 * Renderer - Handles all rendering operations for Echo Genesis
 * Provides drawing methods for sprites, shapes, text, and effects
 */
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.camera = null;
        
        // Rendering settings
        this.pixelArt = true;
        this.backgroundColor = '#1a1a2e';
        this.debugMode = false;
        
        // Layer system
        this.layers = new Map();
        this.layerOrder = [];
        this.setupDefaultLayers();
        
        // Effects system
        this.effects = [];
        this.particles = [];
        
        // Sprite cache
        this.spriteCache = new Map();
        this.textureAtlas = null;
        
        // Post-processing
        this.postProcessing = {
            enabled: false,
            effects: []
        };
        
        // Performance tracking
        this.stats = {
            drawCalls: 0,
            objectsRendered: 0,
            frameTime: 0
        };
        
        // Setup canvas for pixel art
        if (this.pixelArt) {
            this.context.imageSmoothingEnabled = false;
            this.context.webkitImageSmoothingEnabled = false;
            this.context.mozImageSmoothingEnabled = false;
            this.context.msImageSmoothingEnabled = false;
        }
    }
    
    setupDefaultLayers() {
        this.addLayer('background', -100);
        this.addLayer('tiles', -50);
        this.addLayer('entities', 0);
        this.addLayer('player', 50);
        this.addLayer('effects', 100);
        this.addLayer('ui', 1000);
        this.addLayer('debug', 2000);
    }
    
    addLayer(name, zIndex) {
        this.layers.set(name, {
            name: name,
            zIndex: zIndex,
            visible: true,
            objects: []
        });
        
        // Resort layers
        this.layerOrder = Array.from(this.layers.keys()).sort((a, b) => {
            return this.layers.get(a).zIndex - this.layers.get(b).zIndex;
        });
    }
    
    setCamera(camera) {
        this.camera = camera;
    }
    
    // Main render method
    render(world) {
        const startTime = performance.now();
        
        // Reset stats
        this.stats.drawCalls = 0;
        this.stats.objectsRendered = 0;
        
        // Clear canvas
        this.clear();
        
        // Apply camera transform
        this.context.save();
        if (this.camera) {
            this.applyCameraTransform();
        }
        
        // Render layers in order
        for (const layerName of this.layerOrder) {
            const layer = this.layers.get(layerName);
            if (layer.visible) {
                this.renderLayer(layer, world);
            }
        }
        
        this.context.restore();
        
        // Render UI (always on top, no camera transform)
        this.renderUI();
        
        // Apply post-processing effects
        if (this.postProcessing.enabled) {
            this.applyPostProcessing();
        }
        
        // Render debug info
        if (this.debugMode) {
            this.renderDebugInfo();
        }
        
        // Update performance stats
        this.stats.frameTime = performance.now() - startTime;
    }
    
    clear() {
        this.context.fillStyle = this.backgroundColor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    applyCameraTransform() {
        const pos = this.camera.position;
        const zoom = this.camera.zoom;
        const shake = this.camera.shake.offset;
        
        this.context.scale(zoom, zoom);
        this.context.translate(
            -pos.x + shake.x / zoom,
            -pos.y + shake.y / zoom
        );
    }
    
    renderLayer(layer, world) {
        if (!world) return;
        
        // Get objects for this layer from world
        const objects = world.getObjectsForLayer(layer.name);
        
        for (const obj of objects) {
            if (obj.visible && !obj.destroyed) {
                // Frustum culling
                if (this.camera && !this.isObjectInView(obj)) {
                    continue;
                }
                
                this.renderObject(obj);
                this.stats.objectsRendered++;
            }
        }
    }
    
    renderObject(obj) {
        this.context.save();
        
        // Apply object transform
        const pos = obj.position;
        const center = new Vector2(pos.x + obj.size.x / 2, pos.y + obj.size.y / 2);
        
        this.context.translate(center.x, center.y);
        this.context.rotate(obj.rotation);
        this.context.scale(obj.scale.x, obj.scale.y);
        this.context.globalAlpha = obj.opacity;
        
        // Render based on object type
        if (obj.sprite && obj.currentAnimation) {
            this.renderSprite(obj);
        } else if (obj.color) {
            this.renderRect(obj);
        }
        
        // Custom object rendering
        if (obj.onRender) {
            obj.onRender(this.context);
        }
        
        this.context.restore();
        this.stats.drawCalls++;
    }
    
    renderSprite(obj) {
        if (!obj.sprite || !obj.currentAnimation) return;
        
        const animation = obj.animations.get(obj.currentAnimation);
        if (!animation) return;
        
        const frame = animation.frames[obj.currentFrame];
        if (!frame) return;
        
        this.context.drawImage(
            obj.sprite,
            frame.x, frame.y, frame.width, frame.height,
            -obj.size.x / 2, -obj.size.y / 2, obj.size.x, obj.size.y
        );
    }
    
    renderRect(obj) {
        this.context.fillStyle = obj.color;
        this.context.fillRect(-obj.size.x / 2, -obj.size.y / 2, obj.size.x, obj.size.y);
    }
    
    renderUI() {
        // UI rendering goes here - no camera transform applied
        this.context.save();
        
        // Render UI elements
        const uiLayer = this.layers.get('ui');
        if (uiLayer && uiLayer.visible) {
            for (const obj of uiLayer.objects) {
                if (obj.visible && !obj.destroyed) {
                    this.renderUIObject(obj);
                }
            }
        }
        
        this.context.restore();
    }
    
    renderUIObject(obj) {
        this.context.save();
        
        this.context.translate(obj.position.x, obj.position.y);
        this.context.globalAlpha = obj.opacity;
        
        if (obj.render) {
            obj.render(this.context);
        } else {
            // Default UI rendering
            this.context.fillStyle = obj.color || '#ffffff';
            this.context.fillRect(0, 0, obj.size.x, obj.size.y);
        }
        
        this.context.restore();
    }
    
    // Shape drawing methods
    drawRect(x, y, width, height, color = '#ffffff', filled = true) {
        this.context.save();
        
        if (filled) {
            this.context.fillStyle = color;
            this.context.fillRect(x, y, width, height);
        } else {
            this.context.strokeStyle = color;
            this.context.strokeRect(x, y, width, height);
        }
        
        this.context.restore();
        this.stats.drawCalls++;
    }
    
    drawCircle(x, y, radius, color = '#ffffff', filled = true) {
        this.context.save();
        
        this.context.beginPath();
        this.context.arc(x, y, radius, 0, Math.PI * 2);
        
        if (filled) {
            this.context.fillStyle = color;
            this.context.fill();
        } else {
            this.context.strokeStyle = color;
            this.context.stroke();
        }
        
        this.context.restore();
        this.stats.drawCalls++;
    }
    
    drawLine(x1, y1, x2, y2, color = '#ffffff', width = 1) {
        this.context.save();
        
        this.context.strokeStyle = color;
        this.context.lineWidth = width;
        this.context.beginPath();
        this.context.moveTo(x1, y1);
        this.context.lineTo(x2, y2);
        this.context.stroke();
        
        this.context.restore();
        this.stats.drawCalls++;
    }
    
    drawPolygon(points, color = '#ffffff', filled = true) {
        if (points.length < 3) return;
        
        this.context.save();
        
        this.context.beginPath();
        this.context.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            this.context.lineTo(points[i].x, points[i].y);
        }
        
        this.context.closePath();
        
        if (filled) {
            this.context.fillStyle = color;
            this.context.fill();
        } else {
            this.context.strokeStyle = color;
            this.context.stroke();
        }
        
        this.context.restore();
        this.stats.drawCalls++;
    }
    
    // Text rendering
    drawText(text, x, y, options = {}) {
        this.context.save();
        
        const font = options.font || '16px Arial';
        const color = options.color || '#ffffff';
        const align = options.align || 'left';
        const baseline = options.baseline || 'top';
        const maxWidth = options.maxWidth;
        const outline = options.outline;
        const outlineWidth = options.outlineWidth || 2;
        const shadow = options.shadow;
        
        this.context.font = font;
        this.context.fillStyle = color;
        this.context.textAlign = align;
        this.context.textBaseline = baseline;
        
        // Draw shadow
        if (shadow) {
            this.context.save();
            this.context.fillStyle = shadow.color || '#000000';
            this.context.fillText(
                text,
                x + (shadow.offsetX || 2),
                y + (shadow.offsetY || 2),
                maxWidth
            );
            this.context.restore();
        }
        
        // Draw outline
        if (outline) {
            this.context.strokeStyle = outline;
            this.context.lineWidth = outlineWidth;
            this.context.strokeText(text, x, y, maxWidth);
        }
        
        // Draw text
        this.context.fillText(text, x, y, maxWidth);
        
        this.context.restore();
        this.stats.drawCalls++;
    }
    
    // Sprite rendering
    drawSprite(sprite, x, y, width, height, frame = null) {
        if (!sprite) return;
        
        this.context.save();
        
        if (frame) {
            this.context.drawImage(
                sprite,
                frame.x, frame.y, frame.width, frame.height,
                x, y, width, height
            );
        } else {
            this.context.drawImage(sprite, x, y, width, height);
        }
        
        this.context.restore();
        this.stats.drawCalls++;
    }
    
    // Tile rendering (optimized for tilemaps)
    renderTiles(tilemap, tileset) {
        if (!tilemap || !tileset) return;
        
        const tileSize = tilemap.tileSize;
        const viewBounds = this.camera ? this.camera.getViewBounds() : {
            x: 0, y: 0,
            width: this.canvas.width,
            height: this.canvas.height
        };
        
        // Calculate visible tile range
        const startX = Math.floor(viewBounds.x / tileSize);
        const endX = Math.ceil((viewBounds.x + viewBounds.width) / tileSize);
        const startY = Math.floor(viewBounds.y / tileSize);
        const endY = Math.ceil((viewBounds.y + viewBounds.height) / tileSize);
        
        // Render visible tiles
        for (let y = Math.max(0, startY); y < Math.min(tilemap.height, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(tilemap.width, endX); x++) {
                const tileId = tilemap.getTile(x, y);
                if (tileId > 0) {
                    this.renderTile(tileset, tileId, x * tileSize, y * tileSize, tileSize);
                }
            }
        }
    }
    
    renderTile(tileset, tileId, x, y, size) {
        const tileFrame = tileset.getTileFrame(tileId);
        if (tileFrame) {
            this.drawSprite(tileset.image, x, y, size, size, tileFrame);
        }
    }
    
    // Particle system rendering
    renderParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            if (particle.active) {
                this.renderParticle(particle);
            } else {
                this.particles.splice(i, 1);
            }
        }
    }
    
    renderParticle(particle) {
        this.context.save();
        
        this.context.globalAlpha = particle.opacity;
        this.context.translate(particle.position.x, particle.position.y);
        this.context.rotate(particle.rotation);
        this.context.scale(particle.scale, particle.scale);
        
        if (particle.sprite) {
            this.context.drawImage(
                particle.sprite,
                -particle.size / 2, -particle.size / 2,
                particle.size, particle.size
            );
        } else {
            this.context.fillStyle = particle.color;
            this.context.fillRect(
                -particle.size / 2, -particle.size / 2,
                particle.size, particle.size
            );
        }
        
        this.context.restore();
    }
    
    // Effect rendering
    applyPostProcessing() {
        for (const effect of this.postProcessing.effects) {
            if (effect.enabled) {
                effect.apply(this.context, this.canvas);
            }
        }
    }
    
    // Utility methods
    isObjectInView(obj) {
        if (!this.camera) return true;
        
        const bounds = obj.getBounds ? obj.getBounds() : {
            x: obj.position.x,
            y: obj.position.y,
            width: obj.size.x,
            height: obj.size.y
        };
        
        return this.camera.isInView(bounds);
    }
    
    // Debug rendering
    renderDebugInfo() {
        this.context.save();
        
        // Draw FPS and stats
        const statsText = [
            `FPS: ${Math.round(1000 / this.stats.frameTime)}`,
            `Draw Calls: ${this.stats.drawCalls}`,
            `Objects: ${this.stats.objectsRendered}`,
            `Frame Time: ${this.stats.frameTime.toFixed(2)}ms`
        ];
        
        let y = 10;
        for (const text of statsText) {
            this.drawText(text, 10, y, {
                color: '#00ff00',
                font: '14px monospace',
                shadow: { color: '#000000', offsetX: 1, offsetY: 1 }
            });
            y += 20;
        }
        
        this.context.restore();
    }

    renderObjectDebugInfo(obj, showLabel = true, showBounds = true) {
        if (!this.debugMode) return;
        
        this.context.save();
        
        // Get object bounds
        const bounds = obj.getBounds ? obj.getBounds() : {
            x: obj.position.x,
            y: obj.position.y,
            width: obj.size.x,
            height: obj.size.y
        };
        
        // Draw debug outline
        if (showBounds) {
            this.context.strokeStyle = '#ff0000';
            this.context.lineWidth = 2;
            this.context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
            
            // Draw center point
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            this.context.fillStyle = '#ff0000';
            this.context.fillRect(centerX - 2, centerY - 2, 4, 4);
        }
        
        // Draw label
        if (showLabel) {
            const labelText = this.getObjectDebugLabel(obj);
            const labelX = bounds.x + bounds.width / 2;
            const labelY = bounds.y - 10;
            
            // Background for label
            this.context.font = '12px Arial';
            const textMetrics = this.context.measureText(labelText);
            const padding = 4;
            
            this.context.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.context.fillRect(
                labelX - textMetrics.width / 2 - padding,
                labelY - 16,
                textMetrics.width + padding * 2,
                16
            );
            
            // Label text
            this.context.fillStyle = '#ffffff';
            this.context.textAlign = 'center';
            this.context.textBaseline = 'middle';
            this.context.fillText(labelText, labelX, labelY - 8);
        }
        
        this.context.restore();
    }

    getObjectDebugLabel(obj) {
        // Try to get a meaningful label for the object
        if (obj.name && obj.name !== '') {
            return obj.name;
        }
        
        if (obj.type) {
            return obj.type;
        }
        
        if (obj.constructor && obj.constructor.name !== 'GameObject') {
            return obj.constructor.name;
        }
        
        if (obj.powerType) {
            return `PowerUp (${obj.powerType})`;
        }
        
        if (obj.enemyType) {
            return `Enemy (${obj.enemyType})`;
        }
        
        if (obj.hasTag) {
            if (obj.hasTag('player')) return 'Player';
            if (obj.hasTag('enemy')) return 'Enemy';
            if (obj.hasTag('powerup')) return 'PowerUp';
            if (obj.hasTag('checkpoint')) return 'Checkpoint';
        }
        
        return 'GameObject';
    }

    renderEntityDebugOutline(x, y, width, height, entityType, properties = {}) {
        this.context.save();
        
        // Draw colored outline based on entity type
        const outlineColor = this.getEntityDebugColor(entityType);
        this.context.strokeStyle = outlineColor;
        this.context.lineWidth = 2;
        this.context.strokeRect(x - width/2, y - height/2, width, height);
        
        // Draw label above entity
        const labelText = this.getEntityDebugText(entityType, properties);
        const labelX = x;
        const labelY = y - height/2 - 15;
        
        // Background for label
        this.context.font = '10px Arial';
        const textMetrics = this.context.measureText(labelText);
        const padding = 3;
        
        this.context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.context.fillRect(
            labelX - textMetrics.width / 2 - padding,
            labelY - 6,
            textMetrics.width + padding * 2,
            12
        );
        
        // Label text
        this.context.fillStyle = '#ffffff';
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';
        this.context.fillText(labelText, labelX, labelY);
        
        this.context.restore();
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
            'platform': '#888888',
            'trigger': '#ff00ff'
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
            case 'platform':
                return 'Platform';
            case 'trigger':
                return 'Trigger';
            default:
                return entityType || 'Entity';
        }
    }
    
    // Screenshot functionality
    takeScreenshot() {
        return this.canvas.toDataURL('image/png');
    }
    
    // Resize handling
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Reapply pixel art settings
        if (this.pixelArt) {
            this.context.imageSmoothingEnabled = false;
            this.context.webkitImageSmoothingEnabled = false;
            this.context.mozImageSmoothingEnabled = false;
            this.context.msImageSmoothingEnabled = false;
        }
    }
    
    // Layer management
    addObjectToLayer(layerName, obj) {
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.objects.push(obj);
        }
    }
    
    removeObjectFromLayer(layerName, obj) {
        const layer = this.layers.get(layerName);
        if (layer) {
            const index = layer.objects.indexOf(obj);
            if (index !== -1) {
                layer.objects.splice(index, 1);
            }
        }
    }
    
    setLayerVisible(layerName, visible) {
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.visible = visible;
        }
    }
    
    // Settings
    setPixelArt(enabled) {
        this.pixelArt = enabled;
        this.context.imageSmoothingEnabled = !enabled;
        this.context.webkitImageSmoothingEnabled = !enabled;
        this.context.mozImageSmoothingEnabled = !enabled;
        this.context.msImageSmoothingEnabled = !enabled;
    }
    
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
    
    setBackgroundColor(color) {
        this.backgroundColor = color;
    }
    
    // Resource management
    loadSprite(name, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.spriteCache.set(name, img);
                resolve(img);
            };
            img.onerror = reject;
            img.src = url;
        });
    }
    
    getSprite(name) {
        return this.spriteCache.get(name);
    }
    
    // Cleanup
    destroy() {
        this.layers.clear();
        this.effects = [];
        this.particles = [];
        this.spriteCache.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Renderer;
}
