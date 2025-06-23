/**
 * Level Data Management
 * Handles level structure, serialization, and validation
 */

export class LevelData {
    constructor() {
        this.metadata = {
            name: "Untitled Level",
            author: "Unknown",
            version: "1.0",
            description: "",
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            thumbnail: null
        };

        this.properties = {
            width: 100,      // Level width in tiles
            height: 50,      // Level height in tiles
            tileSize: 32,    // Size of each tile in pixels
            gravity: 800,    // Gravity strength
            backgroundColor: "#1a1a2e",
            ambientLight: 0.3,
            music: null,
            parallaxLayers: []
        };

        this.layers = {
            background: [],   // Background decoration tiles
            collision: [],    // Collision tiles
            foreground: [],   // Foreground decoration tiles
            entities: []      // Game objects and entities
        };

        this.tilesets = [];  // References to tileset data
        this.checkpoints = []; // Checkpoint positions
        this.areas = [];     // Special areas (water, wind, etc.)
        this.triggers = [];  // Event triggers
        this.connections = []; // Level connections/transitions
    }

    /**
     * Create a new empty level with default settings
     * @param {Object} options - Level creation options
     * @returns {LevelData} New level instance
     */
    static createEmpty(options = {}) {
        const level = new LevelData();
        
        Object.assign(level.metadata, options.metadata || {});
        Object.assign(level.properties, options.properties || {});
        
        // Initialize tile layers with empty arrays
        const tileCount = level.properties.width * level.properties.height;
        
        level.layers.background = new Array(tileCount).fill(0);
        level.layers.collision = new Array(tileCount).fill(0);
        level.layers.foreground = new Array(tileCount).fill(0);
        
        return level;
    }

    /**
     * Get tile at specific coordinates
     * @param {string} layer - Layer name
     * @param {number} x - Tile X coordinate
     * @param {number} y - Tile Y coordinate
     * @returns {number} Tile ID (0 = empty)
     */
    getTile(layer, x, y) {
        if (!this.layers[layer] || x < 0 || y < 0 || 
            x >= this.properties.width || y >= this.properties.height) {
            return 0;
        }
        
        const index = y * this.properties.width + x;
        return this.layers[layer][index] || 0;
    }

    /**
     * Set tile at specific coordinates
     * @param {string} layer - Layer name
     * @param {number} x - Tile X coordinate
     * @param {number} y - Tile Y coordinate
     * @param {number} tileId - Tile ID to set
     */
    setTile(layer, x, y, tileId) {
        if (!this.layers[layer] || x < 0 || y < 0 || 
            x >= this.properties.width || y >= this.properties.height) {
            return;
        }
        
        const index = y * this.properties.width + x;
        this.layers[layer][index] = tileId;
        this.metadata.modified = new Date().toISOString();
    }

    /**
     * Add an entity to the level
     * @param {Object} entity - Entity data
     */
    addEntity(entity) {
        const entityData = {
            id: this.generateId(),
            type: entity.type || 'unknown',
            x: entity.x || 0,
            y: entity.y || 0,
            properties: entity.properties || {},
            created: new Date().toISOString()
        };
        
        this.layers.entities.push(entityData);
        this.metadata.modified = new Date().toISOString();
        return entityData.id;
    }

    /**
     * Remove an entity from the level
     * @param {string} entityId - Entity ID to remove
     */
    removeEntity(entityId) {
        const index = this.layers.entities.findIndex(e => e.id === entityId);
        if (index !== -1) {
            this.layers.entities.splice(index, 1);
            this.metadata.modified = new Date().toISOString();
            return true;
        }
        return false;
    }

    /**
     * Get entity by ID
     * @param {string} entityId - Entity ID
     * @returns {Object|null} Entity data or null
     */
    getEntity(entityId) {
        return this.layers.entities.find(e => e.id === entityId) || null;
    }

    /**
     * Get all entities of a specific type
     * @param {string} type - Entity type
     * @returns {Array} Array of matching entities
     */
    getEntitiesByType(type) {
        return this.layers.entities.filter(e => e.type === type);
    }

    /**
     * Add a checkpoint to the level
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} properties - Checkpoint properties
     */
    addCheckpoint(x, y, properties = {}) {
        const checkpoint = {
            id: this.generateId(),
            x,
            y,
            properties,
            created: new Date().toISOString()
        };
        
        this.checkpoints.push(checkpoint);
        this.metadata.modified = new Date().toISOString();
        return checkpoint.id;
    }

    /**
     * Add a special area to the level
     * @param {Object} area - Area definition
     */
    addArea(area) {
        const areaData = {
            id: this.generateId(),
            type: area.type || 'default',
            x: area.x || 0,
            y: area.y || 0,
            width: area.width || 32,
            height: area.height || 32,
            properties: area.properties || {},
            created: new Date().toISOString()
        };
        
        this.areas.push(areaData);
        this.metadata.modified = new Date().toISOString();
        return areaData.id;
    }

    /**
     * Add a trigger to the level
     * @param {Object} trigger - Trigger definition
     */
    addTrigger(trigger) {
        const triggerData = {
            id: this.generateId(),
            type: trigger.type || 'default',
            x: trigger.x || 0,
            y: trigger.y || 0,
            width: trigger.width || 32,
            height: trigger.height || 32,
            action: trigger.action || '',
            conditions: trigger.conditions || {},
            properties: trigger.properties || {},
            created: new Date().toISOString()
        };
        
        this.triggers.push(triggerData);
        this.metadata.modified = new Date().toISOString();
        return triggerData.id;
    }

    /**
     * Resize the level
     * @param {number} newWidth - New width in tiles
     * @param {number} newHeight - New height in tiles
     */
    resize(newWidth, newHeight) {
        const oldWidth = this.properties.width;
        const oldHeight = this.properties.height;
        
        // Create new tile arrays
        const newBackground = new Array(newWidth * newHeight).fill(0);
        const newCollision = new Array(newWidth * newHeight).fill(0);
        const newForeground = new Array(newWidth * newHeight).fill(0);
        
        // Copy existing tiles
        const copyWidth = Math.min(oldWidth, newWidth);
        const copyHeight = Math.min(oldHeight, newHeight);
        
        for (let y = 0; y < copyHeight; y++) {
            for (let x = 0; x < copyWidth; x++) {
                const oldIndex = y * oldWidth + x;
                const newIndex = y * newWidth + x;
                
                newBackground[newIndex] = this.layers.background[oldIndex] || 0;
                newCollision[newIndex] = this.layers.collision[oldIndex] || 0;
                newForeground[newIndex] = this.layers.foreground[oldIndex] || 0;
            }
        }
        
        // Update properties and layers
        this.properties.width = newWidth;
        this.properties.height = newHeight;
        this.layers.background = newBackground;
        this.layers.collision = newCollision;
        this.layers.foreground = newForeground;
        
        // Remove entities that are now outside bounds
        const maxX = newWidth * this.properties.tileSize;
        const maxY = newHeight * this.properties.tileSize;
        
        this.layers.entities = this.layers.entities.filter(entity => 
            entity.x >= 0 && entity.x < maxX && entity.y >= 0 && entity.y < maxY
        );
        
        this.metadata.modified = new Date().toISOString();
    }

    /**
     * Validate level data integrity
     * @returns {Object} Validation result with errors and warnings
     */
    validate() {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Check basic properties
        if (this.properties.width <= 0 || this.properties.height <= 0) {
            result.errors.push("Level dimensions must be positive");
            result.valid = false;
        }

        if (this.properties.tileSize <= 0) {
            result.errors.push("Tile size must be positive");
            result.valid = false;
        }

        // Check layer integrity
        const expectedTileCount = this.properties.width * this.properties.height;
        
        if (this.layers.background.length !== expectedTileCount) {
            result.errors.push("Background layer size mismatch");
            result.valid = false;
        }

        if (this.layers.collision.length !== expectedTileCount) {
            result.errors.push("Collision layer size mismatch");
            result.valid = false;
        }

        if (this.layers.foreground.length !== expectedTileCount) {
            result.errors.push("Foreground layer size mismatch");
            result.valid = false;
        }

        // Check for player spawn point
        const playerSpawns = this.getEntitiesByType('player_spawn');
        if (playerSpawns.length === 0) {
            result.warnings.push("No player spawn point found");
        } else if (playerSpawns.length > 1) {
            result.warnings.push("Multiple player spawn points found");
        }

        // Check entity positions
        const maxX = this.properties.width * this.properties.tileSize;
        const maxY = this.properties.height * this.properties.tileSize;
        
        this.layers.entities.forEach(entity => {
            if (entity.x < 0 || entity.x >= maxX || entity.y < 0 || entity.y >= maxY) {
                result.warnings.push(`Entity ${entity.id} is outside level bounds`);
            }
        });

        return result;
    }

    /**
     * Convert level to JSON string
     * @param {boolean} minify - Whether to minify the JSON
     * @returns {string} JSON representation
     */
    toJSON(minify = false) {
        const data = {
            metadata: this.metadata,
            properties: this.properties,
            layers: this.layers,
            tilesets: this.tilesets,
            checkpoints: this.checkpoints,
            areas: this.areas,
            triggers: this.triggers,
            connections: this.connections
        };
        
        return JSON.stringify(data, null, minify ? 0 : 2);
    }

    /**
     * Load level from JSON string
     * @param {string} jsonString - JSON representation
     * @returns {LevelData} Loaded level instance
     */
    static fromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            const level = new LevelData();
            
            // Copy data with validation
            if (data.metadata) Object.assign(level.metadata, data.metadata);
            if (data.properties) Object.assign(level.properties, data.properties);
            if (data.layers) Object.assign(level.layers, data.layers);
            if (data.tilesets) level.tilesets = data.tilesets;
            if (data.checkpoints) level.checkpoints = data.checkpoints;
            if (data.areas) level.areas = data.areas;
            if (data.triggers) level.triggers = data.triggers;
            if (data.connections) level.connections = data.connections;
            
            return level;
        } catch (error) {
            throw new Error(`Failed to parse level JSON: ${error.message}`);
        }
    }

    /**
     * Create a deep copy of the level
     * @returns {LevelData} Cloned level
     */
    clone() {
        return LevelData.fromJSON(this.toJSON());
    }

    /**
     * Generate a unique ID
     * @returns {string} Unique identifier
     */
    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get level statistics
     * @returns {Object} Level statistics
     */
    getStats() {
        const tileCount = this.properties.width * this.properties.height;
        const usedTiles = {
            background: this.layers.background.filter(t => t !== 0).length,
            collision: this.layers.collision.filter(t => t !== 0).length,
            foreground: this.layers.foreground.filter(t => t !== 0).length
        };

        return {
            dimensions: {
                width: this.properties.width,
                height: this.properties.height,
                tileSize: this.properties.tileSize,
                pixelWidth: this.properties.width * this.properties.tileSize,
                pixelHeight: this.properties.height * this.properties.tileSize
            },
            tiles: {
                total: tileCount,
                used: usedTiles,
                percentage: {
                    background: (usedTiles.background / tileCount * 100).toFixed(1),
                    collision: (usedTiles.collision / tileCount * 100).toFixed(1),
                    foreground: (usedTiles.foreground / tileCount * 100).toFixed(1)
                }
            },
            entities: {
                total: this.layers.entities.length,
                byType: this.layers.entities.reduce((acc, entity) => {
                    acc[entity.type] = (acc[entity.type] || 0) + 1;
                    return acc;
                }, {})
            },
            checkpoints: this.checkpoints.length,
            areas: this.areas.length,
            triggers: this.triggers.length,
            connections: this.connections.length
        };
    }
}
