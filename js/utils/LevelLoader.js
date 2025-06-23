/**
 * Level Loader and Manager
 * Handles loading, saving, and managing level files
 */

import { LevelData } from './LevelData.js';

export class LevelLoader {
    constructor() {
        this.cache = new Map();
        this.preloadedLevels = new Map();
        this.loadingPromises = new Map();
    }

    /**
     * Load a level from a file or URL
     * @param {string} source - File path, URL, or level ID
     * @param {Object} options - Loading options
     * @returns {Promise<LevelData>} Loaded level data
     */
    async loadLevel(source, options = {}) {
        // Check cache first
        if (this.cache.has(source) && !options.forceReload) {
            return this.cache.get(source);
        }

        // Check if already loading
        if (this.loadingPromises.has(source)) {
            return this.loadingPromises.get(source);
        }

        // Start loading
        const loadPromise = this._loadLevelInternal(source, options);
        this.loadingPromises.set(source, loadPromise);

        try {
            const level = await loadPromise;
            this.cache.set(source, level);
            return level;
        } finally {
            this.loadingPromises.delete(source);
        }
    }

    /**
     * Internal level loading implementation
     * @private
     */
    async _loadLevelInternal(source, options) {
        try {
            let data;

            // Check if it's a preloaded level
            if (this.preloadedLevels.has(source)) {
                data = this.preloadedLevels.get(source);
            }
            // Check if it's a local storage key
            else if (source.startsWith('localStorage:')) {
                const key = source.substring(13);
                const stored = localStorage.getItem(key);
                if (!stored) {
                    throw new Error(`Level not found in local storage: ${key}`);
                }
                data = stored;
            }
            // Check if it's embedded data
            else if (source.startsWith('data:')) {
                data = atob(source.substring(5));
            }
            // Otherwise, load from URL/file
            else {
                const response = await fetch(source);
                if (!response.ok) {
                    throw new Error(`Failed to load level: ${response.status} ${response.statusText}`);
                }
                data = await response.text();
            }

            // Parse the level data
            const level = LevelData.fromJSON(data);

            // Validate if requested
            if (options.validate !== false) {
                const validation = level.validate();
                if (!validation.valid && options.strict) {
                    throw new Error(`Level validation failed: ${validation.errors.join(', ')}`);
                }
                if (validation.warnings.length > 0) {
                    console.warn('Level validation warnings:', validation.warnings);
                }
            }

            return level;
        } catch (error) {
            throw new Error(`Failed to load level from ${source}: ${error.message}`);
        }
    }

    /**
     * Save a level to local storage or download as file
     * @param {LevelData} level - Level to save
     * @param {string} target - Save target (localStorage key or 'download')
     * @param {Object} options - Save options
     */
    async saveLevel(level, target, options = {}) {
        try {
            // Update modification time
            level.metadata.modified = new Date().toISOString();

            // Validate before saving
            if (options.validate !== false) {
                const validation = level.validate();
                if (!validation.valid && options.strict) {
                    throw new Error(`Cannot save invalid level: ${validation.errors.join(', ')}`);
                }
            }

            const jsonData = level.toJSON(options.minify);

            if (target === 'download') {
                this._downloadLevel(level, jsonData, options);
            } else if (target.startsWith('localStorage:')) {
                const key = target.substring(13);
                localStorage.setItem(key, jsonData);
            } else {
                throw new Error(`Unsupported save target: ${target}`);
            }

            // Update cache
            this.cache.set(target, level);
        } catch (error) {
            throw new Error(`Failed to save level: ${error.message}`);
        }
    }

    /**
     * Download level as a file
     * @private
     */
    _downloadLevel(level, jsonData, options) {
        const filename = options.filename || `${level.metadata.name || 'level'}.json`;
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Preload a level into memory
     * @param {string} id - Level identifier
     * @param {string} data - Level JSON data
     */
    preloadLevel(id, data) {
        this.preloadedLevels.set(id, data);
    }

    /**
     * Get a list of saved levels from local storage
     * @returns {Array} Array of level metadata
     */
    getSavedLevels() {
        const levels = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('level_')) {
                try {
                    const data = localStorage.getItem(key);
                    const levelData = JSON.parse(data);
                    
                    levels.push({
                        id: key,
                        name: levelData.metadata?.name || 'Untitled',
                        author: levelData.metadata?.author || 'Unknown',
                        created: levelData.metadata?.created,
                        modified: levelData.metadata?.modified,
                        size: data.length
                    });
                } catch (error) {
                    console.warn(`Failed to parse saved level ${key}:`, error);
                }
            }
        }
        
        return levels.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    }

    /**
     * Delete a saved level from local storage
     * @param {string} levelId - Level ID to delete
     * @returns {boolean} True if deleted successfully
     */
    deleteSavedLevel(levelId) {
        try {
            localStorage.removeItem(levelId);
            this.cache.delete(`localStorage:${levelId}`);
            return true;
        } catch (error) {
            console.error(`Failed to delete level ${levelId}:`, error);
            return false;
        }
    }

    /**
     * Import level from file
     * @param {File} file - File to import
     * @returns {Promise<LevelData>} Imported level
     */
    async importLevel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                try {
                    const level = LevelData.fromJSON(event.target.result);
                    resolve(level);
                } catch (error) {
                    reject(new Error(`Failed to import level: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Create a thumbnail for a level
     * @param {LevelData} level - Level to create thumbnail for
     * @param {Object} options - Thumbnail options
     * @returns {Promise<string>} Base64 encoded thumbnail image
     */
    async generateThumbnail(level, options = {}) {
        const width = options.width || 256;
        const height = options.height || 192;
        const scale = Math.min(width / (level.properties.width * level.properties.tileSize),
                              height / (level.properties.height * level.properties.tileSize));
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Fill background
        ctx.fillStyle = level.properties.backgroundColor || '#1a1a2e';
        ctx.fillRect(0, 0, width, height);
        
        // Draw a simplified representation of the level
        const tileSize = level.properties.tileSize * scale;
        
        for (let y = 0; y < level.properties.height; y++) {
            for (let x = 0; x < level.properties.width; x++) {
                const collisionTile = level.getTile('collision', x, y);
                const backgroundTile = level.getTile('background', x, y);
                
                const pixelX = x * tileSize;
                const pixelY = y * tileSize;
                
                if (collisionTile > 0) {
                    ctx.fillStyle = '#4a5568';
                    ctx.fillRect(pixelX, pixelY, tileSize, tileSize);
                } else if (backgroundTile > 0) {
                    ctx.fillStyle = '#2d3748';
                    ctx.fillRect(pixelX, pixelY, tileSize, tileSize);
                }
            }
        }
        
        // Draw entities as small dots
        ctx.fillStyle = '#ffd700';
        level.layers.entities.forEach(entity => {
            const x = entity.x * scale;
            const y = entity.y * scale;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        });
        
        return canvas.toDataURL('image/png');
    }

    /**
     * Clear the level cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            levels: Array.from(this.cache.keys()),
            memoryUsage: Array.from(this.cache.values()).reduce((total, level) => {
                return total + JSON.stringify(level).length;
            }, 0)
        };
    }
}

// Default level templates
export const DefaultLevels = {
    /**
     * Create a simple test level
     */
    createTestLevel() {
        const level = LevelData.createEmpty({
            metadata: {
                name: "Test Level",
                author: "System",
                description: "A simple test level for debugging"
            },
            properties: {
                width: 50,
                height: 30
            }
        });

        // Add ground
        for (let x = 0; x < 50; x++) {
            level.setTile('collision', x, 25, 1);
            level.setTile('collision', x, 26, 1);
        }

        // Add some platforms
        for (let x = 10; x < 20; x++) {
            level.setTile('collision', x, 20, 1);
        }

        for (let x = 30; x < 40; x++) {
            level.setTile('collision', x, 15, 1);
        }

        // Add player spawn
        level.addEntity({
            type: 'player_spawn',
            x: 100,
            y: 700
        });

        // Add some power-ups
        level.addEntity({
            type: 'powerup',
            x: 500,
            y: 600,
            properties: { powerType: 'double_jump' }
        });

        level.addEntity({
            type: 'powerup',
            x: 1200,
            y: 400,
            properties: { powerType: 'dash' }
        });

        // Add checkpoint
        level.addCheckpoint(800, 700);

        return level;
    },

    /**
     * Create an empty level template
     */
    createEmpty(width = 100, height = 50) {
        return LevelData.createEmpty({
            metadata: {
                name: "New Level",
                description: "A blank level ready for editing"
            },
            properties: {
                width,
                height
            }
        });
    },

    /**
     * Create a tutorial level template
     */
    createTutorial() {
        const level = LevelData.createEmpty({
            metadata: {
                name: "Tutorial",
                author: "System",
                description: "Learn the basics of movement and abilities"
            },
            properties: {
                width: 80,
                height: 30
            }
        });

        // Tutorial level layout would be implemented here
        // For now, just add basic ground and spawn
        for (let x = 0; x < 80; x++) {
            level.setTile('collision', x, 25, 1);
        }

        level.addEntity({
            type: 'player_spawn',
            x: 100,
            y: 700
        });

        return level;
    }
};
