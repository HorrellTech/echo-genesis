/**
 * Sample Level Data
 * Pre-built levels for testing and gameplay
 */

import { LevelData } from '../utils/LevelData.js';

export const SampleLevels = {
    /**
     * Tutorial Level - Teaches basic movement
     */
    tutorial: {
        "metadata": {
            "name": "Welcome to Echo Genesis",
            "author": "Echo Genesis Team",
            "version": "1.0",
            "description": "Learn the basics of movement and exploration in this introductory level.",
            "created": "2024-12-20T00:00:00.000Z",
            "modified": "2024-12-20T00:00:00.000Z",
            "thumbnail": null
        },
        "properties": {
            "width": 60,
            "height": 30,
            "tileSize": 32,
            "gravity": 800,
            "backgroundColor": "#1a1a2e",
            "ambientLight": 0.3,
            "music": "ambient1",
            "parallaxLayers": []
        },
        "layers": {
            "background": [], // Will be populated
            "collision": [],  // Will be populated
            "foreground": [], // Will be populated
            "entities": [
                {
                    "id": "player_spawn_1",
                    "type": "player_spawn",
                    "x": 100,
                    "y": 700,
                    "properties": {},
                    "created": "2024-12-20T00:00:00.000Z"
                },
                {
                    "id": "powerup_1",
                    "type": "powerup",
                    "x": 400,
                    "y": 650,
                    "properties": {
                        "powerType": "double_jump",
                        "message": "Double Jump Unlocked! Press Space twice to double jump."
                    },
                    "created": "2024-12-20T00:00:00.000Z"
                },
                {
                    "id": "powerup_2",
                    "type": "powerup",
                    "x": 800,
                    "y": 500,
                    "properties": {
                        "powerType": "dash",
                        "message": "Dash Unlocked! Hold Shift while moving to dash."
                    },
                    "created": "2024-12-20T00:00:00.000Z"
                },
                {
                    "id": "checkpoint_1",
                    "type": "checkpoint",
                    "x": 600,
                    "y": 700,
                    "properties": {},
                    "created": "2024-12-20T00:00:00.000Z"
                },
                {
                    "id": "enemy_1",
                    "type": "basic_enemy",
                    "x": 1000,
                    "y": 700,
                    "properties": {
                        "patrolDistance": 100,
                        "speed": 30
                    },
                    "created": "2024-12-20T00:00:00.000Z"
                }
            ]
        },
        "tilesets": [
            {
                "id": "default",
                "name": "Default Tileset",
                "tileSize": 32,
                "colors": {
                    "1": "#4a5568", // Basic platform
                    "2": "#2d3748", // Background decoration
                    "3": "#1a202c", // Dark background
                    "4": "#4fd1c7", // Special platform
                    "5": "#38b2ac"  // Water/liquid
                }
            }
        ],
        "checkpoints": [],
        "areas": [],
        "triggers": [],
        "connections": []
    },

    /**
     * Forest Level - More challenging platforming
     */
    forest: {
        "metadata": {
            "name": "Mystic Forest",
            "author": "Echo Genesis Team",
            "version": "1.0",
            "description": "Navigate through the mystical forest with its hidden paths and dangerous creatures.",
            "created": "2024-12-20T00:00:00.000Z",
            "modified": "2024-12-20T00:00:00.000Z"
        },
        "properties": {
            "width": 80,
            "height": 40,
            "tileSize": 32,
            "gravity": 800,
            "backgroundColor": "#0f2027",
            "ambientLight": 0.2,
            "music": "forest_ambient"
        },
        "layers": {
            "background": [],
            "collision": [],
            "foreground": [],
            "entities": [
                {
                    "id": "player_spawn_1",
                    "type": "player_spawn",
                    "x": 100,
                    "y": 1100,
                    "properties": {}
                },
                {
                    "id": "flying_enemy_1",
                    "type": "flying_enemy",
                    "x": 500,
                    "y": 800,
                    "properties": {
                        "enemyType": "drone",
                        "patrolPath": [
                            {"x": 500, "y": 800},
                            {"x": 700, "y": 800},
                            {"x": 700, "y": 600},
                            {"x": 500, "y": 600}
                        ]
                    }
                },
                {
                    "id": "powerup_wall_slide",
                    "type": "powerup",
                    "x": 1200,
                    "y": 400,
                    "properties": {
                        "powerType": "wall_slide",
                        "message": "Wall Slide Unlocked! Hold against walls while falling to slide down slowly."
                    }
                }
            ]
        },
        "tilesets": [
            {
                "id": "forest",
                "name": "Forest Tileset",
                "colors": {
                    "1": "#2d5016", // Tree trunk/platform
                    "2": "#1a2f0a", // Dark forest ground
                    "3": "#0f1f05", // Deep forest background
                    "4": "#4a7c20", // Moss-covered platforms
                    "5": "#6b9932"  // Bright foliage
                }
            }
        ]
    }
};

/**
 * Generate tile data for sample levels
 */
export function generateSampleLevel(levelName) {
    const levelTemplate = SampleLevels[levelName];
    if (!levelTemplate) {
        throw new Error(`Sample level '${levelName}' not found`);
    }

    const level = LevelData.fromJSON(JSON.stringify(levelTemplate));
    
    // Generate tile data based on level type
    if (levelName === 'tutorial') {
        generateTutorialTiles(level);
    } else if (levelName === 'forest') {
        generateForestTiles(level);
    }
    
    return level;
}

function generateTutorialTiles(level) {
    const width = level.properties.width;
    const height = level.properties.height;
    
    // Initialize arrays
    level.layers.background = new Array(width * height).fill(0);
    level.layers.collision = new Array(width * height).fill(0);
    level.layers.foreground = new Array(width * height).fill(0);
    
    // Ground platforms
    for (let x = 0; x < width; x++) {
        // Main ground
        if (x < 15 || (x > 20 && x < 35) || (x > 40 && x < width)) {
            setTile(level, 'collision', x, height - 3, 1);
            setTile(level, 'collision', x, height - 2, 1);
            setTile(level, 'collision', x, height - 1, 1);
        }
    }
    
    // Floating platforms for double jump training
    for (let x = 10; x < 15; x++) {
        setTile(level, 'collision', x, height - 8, 1);
    }
    
    for (let x = 18; x < 23; x++) {
        setTile(level, 'collision', x, height - 12, 1);
    }
    
    // Higher platforms for dash training
    for (let x = 25; x < 30; x++) {
        setTile(level, 'collision', x, height - 15, 1);
    }
    
    for (let x = 35; x < 40; x++) {
        setTile(level, 'collision', x, height - 15, 1);
    }
    
    // Wall for wall mechanics training
    for (let y = height - 20; y < height - 3; y++) {
        setTile(level, 'collision', 45, y, 1);
    }
    
    // Background decoration
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (Math.random() < 0.05) {
                setTile(level, 'background', x, y, 2);
            }
        }
    }
}

function generateForestTiles(level) {
    const width = level.properties.width;
    const height = level.properties.height;
    
    // Initialize arrays
    level.layers.background = new Array(width * height).fill(0);
    level.layers.collision = new Array(width * height).fill(0);
    level.layers.foreground = new Array(width * height).fill(0);
    
    // Ground terrain with organic shapes
    for (let x = 0; x < width; x++) {
        const groundHeight = Math.floor(3 + Math.sin(x * 0.1) * 2);
        for (let y = height - groundHeight; y < height; y++) {
            setTile(level, 'collision', x, y, 1);
        }
    }
    
    // Tree trunks and branches
    const treePositions = [10, 25, 40, 55, 70];
    treePositions.forEach(treeX => {
        // Trunk
        for (let y = height - 8; y < height - 3; y++) {
            setTile(level, 'collision', treeX, y, 1);
            setTile(level, 'collision', treeX + 1, y, 1);
        }
        
        // Branches
        for (let x = treeX - 3; x <= treeX + 4; x++) {
            if (x >= 0 && x < width) {
                setTile(level, 'collision', x, height - 15, 4);
                setTile(level, 'collision', x, height - 25, 4);
            }
        }
    });
    
    // Floating platforms
    for (let i = 0; i < 10; i++) {
        const platformX = Math.floor(Math.random() * (width - 5));
        const platformY = Math.floor(height * 0.3 + Math.random() * height * 0.4);
        const platformLength = 3 + Math.floor(Math.random() * 4);
        
        for (let x = platformX; x < platformX + platformLength && x < width; x++) {
            setTile(level, 'collision', x, platformY, 4);
        }
    }
    
    // Dense background foliage
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (Math.random() < 0.15) {
                setTile(level, 'background', x, y, Math.random() < 0.5 ? 2 : 3);
            }
        }
    }
    
    // Foreground details
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (Math.random() < 0.08) {
                setTile(level, 'foreground', x, y, 5);
            }
        }
    }
}

function setTile(level, layer, x, y, tileId) {
    if (x >= 0 && x < level.properties.width && y >= 0 && y < level.properties.height) {
        const index = y * level.properties.width + x;
        level.layers[layer][index] = tileId;
    }
}

/**
 * Get a sample level by name
 */
export function getSampleLevel(levelName) {
    return generateSampleLevel(levelName);
}

/**
 * Get list of available sample levels
 */
export function getSampleLevelList() {
    return Object.keys(SampleLevels).map(key => ({
        id: key,
        name: SampleLevels[key].metadata.name,
        description: SampleLevels[key].metadata.description,
        author: SampleLevels[key].metadata.author
    }));
}
