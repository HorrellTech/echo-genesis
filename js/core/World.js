/**
 * World - Manages the game world, levels, objects, and game state for Echo Genesis
 * Handles level loading, object management, and world simulation
 */
class World {
    constructor() {
        this.gameObjects = [];
        this.toAdd = [];
        this.toRemove = [];
        
        // Level data
        this.currentLevel = null;
        this.levelData = null;
        this.tilemap = null;
        this.tileset = null;
        
        // World properties
        this.bounds = { x: 0, y: 0, width: 2048, height: 1536 };
        this.gravity = new Vector2(0, 980);
        this.backgroundColor = '#1a1a2e';
        
        // Checkpoints and spawns
        this.checkpoints = [];
        this.currentCheckpoint = null;
        this.playerSpawn = new Vector2(100, 100);
        
        // Layer management
        this.layers = new Map();
        this.setupDefaultLayers();
        
        // World state
        this.paused = false;
        this.timeScale = 1.0;
        this.worldTime = 0;
        
        // Level transition
        this.transitioning = false;
        this.transitionData = null;
        
        // Persistent data
        this.persistentObjects = new Map();
        this.worldFlags = new Map();
        this.collectibles = new Map();
        
        // Events
        this.eventListeners = new Map();
        
        // Audio zones
        this.audioZones = [];
        
        // Particle systems
        this.particleSystems = [];
        
        // Weather and environmental effects
        this.weather = null;
        this.ambientSounds = [];
    }
    
    setupDefaultLayers() {
        this.layers.set('background', { zIndex: -100, objects: [] });
        this.layers.set('tiles', { zIndex: -50, objects: [] });
        this.layers.set('platforms', { zIndex: -10, objects: [] });
        this.layers.set('entities', { zIndex: 0, objects: [] });
        this.layers.set('player', { zIndex: 50, objects: [] });
        this.layers.set('projectiles', { zIndex: 60, objects: [] });
        this.layers.set('effects', { zIndex: 100, objects: [] });
        this.layers.set('ui', { zIndex: 1000, objects: [] });
    }
    
    // Main update loop
    update(deltaTime) {
        if (this.paused) return;
        
        // Apply time scale
        deltaTime *= this.timeScale;
        this.worldTime += deltaTime;
        
        // Process object additions and removals
        this.processObjectChanges();
        
        // Update all game objects
        this.updateGameObjects(deltaTime);
        
        // Update particle systems
        this.updateParticleSystems(deltaTime);
        
        // Update weather and environmental effects
        this.updateEnvironmentalEffects(deltaTime);
        
        // Check level transitions
        this.checkLevelTransitions();
        
        // Update audio zones
        this.updateAudioZones();
        
        // Process world events
        this.processWorldEvents();
    }
    
    processObjectChanges() {
        // Add new objects
        for (const obj of this.toAdd) {
            this.gameObjects.push(obj);
            this.addObjectToLayer(obj);
        }
        this.toAdd = [];
        
        // Remove destroyed objects
        for (const obj of this.toRemove) {
            const index = this.gameObjects.indexOf(obj);
            if (index !== -1) {
                this.gameObjects.splice(index, 1);
                this.removeObjectFromLayer(obj);
            }
        }
        this.toRemove = [];
        
        // Clean up destroyed objects
        this.gameObjects = this.gameObjects.filter(obj => !obj.destroyed);
    }
    
    updateGameObjects(deltaTime) {
        for (const obj of this.gameObjects) {
            if (obj.active && !obj.destroyed) {
                obj.update(deltaTime);
            }
        }
    }
    
    updateParticleSystems(deltaTime) {
        for (let i = this.particleSystems.length - 1; i >= 0; i--) {
            const system = this.particleSystems[i];
            system.update(deltaTime);
            
            if (system.shouldRemove()) {
                this.particleSystems.splice(i, 1);
            }
        }
    }
    
    updateEnvironmentalEffects(deltaTime) {
        if (this.weather) {
            this.weather.update(deltaTime);
        }
    }
    
    checkLevelTransitions() {
        if (!this.transitioning) {
            const player = this.getPlayer();
            if (player) {
                // Check if player is at level transition points
                const transitions = this.getObjectsWithTag('transition');
                for (const transition of transitions) {
                    if (player.overlaps(transition)) {
                        this.startLevelTransition(transition.targetLevel, transition.targetSpawn);
                        break;
                    }
                }
            }
        }
    }
    
    updateAudioZones() {
        const player = this.getPlayer();
        if (!player) return;
        
        for (const zone of this.audioZones) {
            const inZone = player.contains(zone.bounds);
            
            if (inZone && !zone.active) {
                zone.active = true;
                zone.onEnter();
            } else if (!inZone && zone.active) {
                zone.active = false;
                zone.onExit();
            }
        }
    }
    
    processWorldEvents() {
        // Process any pending world events
        for (const [eventType, callbacks] of this.eventListeners) {
            // Event processing logic would go here
        }
    }
    
    // Object management
    addObject(obj) {
        this.toAdd.push(obj);
        return obj;
    }
    
    removeObject(obj) {
        if (!this.toRemove.includes(obj)) {
            this.toRemove.push(obj);
        }
    }
    
    addObjectToLayer(obj) {
        const layerName = obj.layer || 'entities';
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.objects.push(obj);
        }
    }
    
    removeObjectFromLayer(obj) {
        for (const layer of this.layers.values()) {
            const index = layer.objects.indexOf(obj);
            if (index !== -1) {
                layer.objects.splice(index, 1);
                break;
            }
        }
    }
    
    getObjectsForLayer(layerName) {
        const layer = this.layers.get(layerName);
        return layer ? layer.objects : [];
    }
    
    // Object queries
    getPlayer() {
        return this.gameObjects.find(obj => obj.hasTag('player'));
    }
    
    getObjectsWithTag(tag) {
        return this.gameObjects.filter(obj => obj.hasTag(tag));
    }
    
    getObjectsInRadius(center, radius, tag = null) {
        return this.gameObjects.filter(obj => {
            if (tag && !obj.hasTag(tag)) return false;
            return center.distance(obj.getCenter()) <= radius;
        });
    }
    
    getObjectsInArea(bounds, tag = null) {
        return this.gameObjects.filter(obj => {
            if (tag && !obj.hasTag(tag)) return false;
            const objBounds = obj.getBounds();
            return this.boundsOverlap(bounds, objBounds);
        });
    }
    
    boundsOverlap(a, b) {
        return !(a.x + a.width <= b.x ||
                b.x + b.width <= a.x ||
                a.y + a.height <= b.y ||
                b.y + b.height <= a.y);
    }
      // Level management
    loadLevel(levelData) {
        console.log('Loading level:', levelData.metadata?.name || 'Unknown');
        
        this.levelData = levelData;
        this.currentLevel = levelData.metadata?.name || 'Unknown';
        
        // Clear existing objects (except persistent ones)
        this.clearLevel();
        
        // Set world properties
        this.width = levelData.properties.width;
        this.height = levelData.properties.height;
        this.tileSize = levelData.properties.tileSize;
        
        // Set world bounds
        this.bounds = {
            x: 0,
            y: 0,
            width: levelData.properties.width * levelData.properties.tileSize,
            height: levelData.properties.height * levelData.properties.tileSize
        };
        
        // Set gravity
        if (levelData.properties.gravity) {
            this.gravity = new Vector2(0, levelData.properties.gravity);
        }
        
        // Set background color
        if (levelData.properties.backgroundColor) {
            this.backgroundColor = levelData.properties.backgroundColor;
        }
        
        // Load tile layers
        this.layers.set('background', levelData.layers.background || []);
        this.layers.set('collision', levelData.layers.collision || []);
        this.layers.set('foreground', levelData.layers.foreground || []);
        
        // Load entities
        this.loadLevelEntities(levelData.layers.entities || []);
        
        // Load checkpoints
        this.loadCheckpoints(levelData.checkpoints || []);
        
        // Load special areas
        this.loadAreas(levelData.areas || []);
        
        // Load triggers
        this.loadTriggers(levelData.triggers || []);
        
        // Set player spawn from entities
        const playerSpawn = levelData.layers.entities.find(e => e.type === 'player_spawn');
        if (playerSpawn) {
            this.playerSpawn = new Vector2(playerSpawn.x, playerSpawn.y);
        }
        
        // Trigger level loaded event
        this.triggerEvent('levelLoaded', { level: levelData });
        
        console.log('Level loaded successfully');
    }
    
    clearLevel() {
        // Remove all non-persistent objects
        this.gameObjects = this.gameObjects.filter(obj => obj.persistent);
        
        // Clear layers
        for (const layer of this.layers.values()) {
            layer.objects = layer.objects.filter(obj => obj.persistent);
        }
        
        // Clear particle systems
        this.particleSystems = [];
        
        // Reset checkpoints
        this.checkpoints = [];
        this.currentCheckpoint = null;
    }
    
    loadTilemap(tilemapData) {
        this.tilemap = new Tilemap(tilemapData);
        
        // Create solid tiles as collision objects
        this.createTileColliders();
    }
    
    createTileColliders() {
        if (!this.tilemap) return;
        
        const tileSize = this.tilemap.tileSize;
        const solidTiles = this.tilemap.getSolidTiles();
        
        for (const tile of solidTiles) {
            const collider = new GameObject(
                tile.x * tileSize,
                tile.y * tileSize,
                tileSize,
                tileSize
            );
            collider.solid = true;
            collider.addTag('solid');
            collider.addTag('tile');
            collider.layer = 'tiles';
            collider.visible = false; // Don't render, just collision
            
            this.addObject(collider);
        }
    }
    
    loadLevelObjects(objectsData) {
        for (const objData of objectsData) {
            const obj = this.createObjectFromData(objData);
            if (obj) {
                this.addObject(obj);
            }
        }
    }
    
    createObjectFromData(data) {
        switch (data.type) {
            case 'Player':
                const player = new Player(data.x, data.y);
                return player;
                
            case 'Enemy':
                const enemy = new Enemy(data.x, data.y, data.enemyType);
                return enemy;
                
            case 'PowerUp':
                const powerUp = new PowerUp(data.x, data.y, data.powerType);
                return powerUp;
                
            case 'Platform':
                const platform = new Platform(data.x, data.y, data.width, data.height, data.platformType);
                return platform;
                
            case 'Checkpoint':
                const checkpoint = new Checkpoint(data.x, data.y);
                return checkpoint;
                
            case 'Transition':
                const transition = new LevelTransition(data.x, data.y, data.targetLevel, data.targetSpawn);
                return transition;
                
            default:
                // Generic object
                const obj = GameObject.fromJSON(data);
                return obj;
        }
    }
    
    loadCheckpoints(checkpointsData) {
        for (const checkpointData of checkpointsData) {
            const checkpoint = new Checkpoint(checkpointData.x, checkpointData.y);
            checkpoint.id = checkpointData.id;
            this.checkpoints.push(checkpoint);
            this.addObject(checkpoint);
        }
    }
    
    loadAudioZones(audioZonesData) {
        for (const zoneData of audioZonesData) {
            const zone = {
                bounds: zoneData.bounds,
                musicTrack: zoneData.musicTrack,
                ambientSounds: zoneData.ambientSounds || [],
                active: false,
                onEnter: () => {
                    if (window.game.audioManager) {
                        window.game.audioManager.playMusic(zone.musicTrack);
                        for (const sound of zone.ambientSounds) {
                            window.game.audioManager.playAmbientSound(sound);
                        }
                    }
                },
                onExit: () => {
                    if (window.game.audioManager) {
                        window.game.audioManager.stopAmbientSounds();
                    }
                }
            };
            this.audioZones.push(zone);
        }
    }
    
    loadLevelEntities(entitiesData) {
        // Import entity classes
        import('../entities/Player.js').then(({ Player }) => {
            import('../entities/BasicEntities.js').then(({ PowerUp, Enemy, Platform }) => {
                import('../entities/AdvancedEntities.js').then(({ Checkpoint, FlyingEnemy }) => {
                    this.processEntities(entitiesData, { Player, PowerUp, Enemy, Platform, Checkpoint, FlyingEnemy });
                });
            });
        });
    }
    
    processEntities(entitiesData, entityClasses) {
        for (const entityData of entitiesData) {
            const entity = this.createEntityFromData(entityData, entityClasses);
            if (entity) {
                this.addObject(entity);
            }
        }
    }
    
    createEntityFromData(data, entityClasses) {
        const { Player, PowerUp, Enemy, Platform, Checkpoint, FlyingEnemy } = entityClasses;
        
        switch (data.type) {
            case 'player_spawn':
                // Player spawn point - just store position, don't create player object
                this.playerSpawn = new Vector2(data.x, data.y);
                return null;
                
            case 'powerup':
                const powerType = data.properties?.powerType || 'double_jump';
                const powerUp = new PowerUp(data.x, data.y, { powerType });
                powerUp.id = data.id;
                return powerUp;
                
            case 'basic_enemy':
                const enemy = new Enemy(data.x, data.y, data.properties || {});
                enemy.id = data.id;
                return enemy;
                
            case 'flying_enemy':
                const flyingEnemy = new FlyingEnemy(data.x, data.y, data.properties || {});
                flyingEnemy.id = data.id;
                return flyingEnemy;
                
            case 'checkpoint':
                const checkpoint = new Checkpoint(data.x, data.y, data.properties || {});
                checkpoint.id = data.id;
                return checkpoint;
                
            case 'platform':
                const platform = new Platform(data.x, data.y, data.properties || {});
                platform.id = data.id;
                return platform;
                
            case 'health':
                const healthPickup = new PowerUp(data.x, data.y, { powerType: 'health' });
                healthPickup.id = data.id;
                return healthPickup;
                
            default:
                console.warn(`Unknown entity type: ${data.type}`);
                return null;
        }
    }
    
    loadAreas(areasData) {
        for (const areaData of areasData) {
            // Create area objects for special zones (water, wind, damage, etc.)
            const area = {
                id: areaData.id,
                type: areaData.type,
                bounds: {
                    x: areaData.x,
                    y: areaData.y,
                    width: areaData.width,
                    height: areaData.height
                },
                properties: areaData.properties || {},
                active: true
            };
            
            // Add to world areas collection
            if (!this.areas) this.areas = [];
            this.areas.push(area);
        }
    }
    
    loadTriggers(triggersData) {
        for (const triggerData of triggersData) {
            // Create trigger objects for events
            const trigger = {
                id: triggerData.id,
                type: triggerData.type,
                bounds: {
                    x: triggerData.x,
                    y: triggerData.y,
                    width: triggerData.width,
                    height: triggerData.height
                },
                action: triggerData.action,
                conditions: triggerData.conditions || {},
                properties: triggerData.properties || {},
                triggered: false
            };
            
            // Add to world triggers collection
            if (!this.triggers) this.triggers = [];
            this.triggers.push(trigger);
        }
    }

    // Object management
    addObject(obj) {
        this.toAdd.push(obj);
        return obj;
    }
    
    removeObject(obj) {
        if (!this.toRemove.includes(obj)) {
            this.toRemove.push(obj);
        }
    }
    
    addObjectToLayer(obj) {
        const layerName = obj.layer || 'entities';
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.objects.push(obj);
        }
    }
    
    removeObjectFromLayer(obj) {
        for (const layer of this.layers.values()) {
            const index = layer.objects.indexOf(obj);
            if (index !== -1) {
                layer.objects.splice(index, 1);
                break;
            }
        }
    }
    
    getObjectsForLayer(layerName) {
        const layer = this.layers.get(layerName);
        return layer ? layer.objects : [];
    }
    
    // Object queries
    getPlayer() {
        return this.gameObjects.find(obj => obj.hasTag('player'));
    }
    
    getObjectsWithTag(tag) {
        return this.gameObjects.filter(obj => obj.hasTag(tag));
    }
    
    getObjectsInRadius(center, radius, tag = null) {
        return this.gameObjects.filter(obj => {
            if (tag && !obj.hasTag(tag)) return false;
            return center.distance(obj.getCenter()) <= radius;
        });
    }
    
    getObjectsInArea(bounds, tag = null) {
        return this.gameObjects.filter(obj => {
            if (tag && !obj.hasTag(tag)) return false;
            const objBounds = obj.getBounds();
            return this.boundsOverlap(bounds, objBounds);
        });
    }
    
    boundsOverlap(a, b) {
        return !(a.x + a.width <= b.x ||
                b.x + b.width <= a.x ||
                a.y + a.height <= b.y ||
                b.y + b.height <= a.y);
    }
      // Level management
    loadLevel(levelData) {
        console.log('Loading level:', levelData.metadata?.name || 'Unknown');
        
        this.levelData = levelData;
        this.currentLevel = levelData.metadata?.name || 'Unknown';
        
        // Clear existing objects (except persistent ones)
        this.clearLevel();
        
        // Set world properties
        this.width = levelData.properties.width;
        this.height = levelData.properties.height;
        this.tileSize = levelData.properties.tileSize;
        
        // Set world bounds
        this.bounds = {
            x: 0,
            y: 0,
            width: levelData.properties.width * levelData.properties.tileSize,
            height: levelData.properties.height * levelData.properties.tileSize
        };
        
        // Set gravity
        if (levelData.properties.gravity) {
            this.gravity = new Vector2(0, levelData.properties.gravity);
        }
        
        // Set background color
        if (levelData.properties.backgroundColor) {
            this.backgroundColor = levelData.properties.backgroundColor;
        }
        
        // Load tile layers
        this.layers.set('background', levelData.layers.background || []);
        this.layers.set('collision', levelData.layers.collision || []);
        this.layers.set('foreground', levelData.layers.foreground || []);
        
        // Load entities
        this.loadLevelEntities(levelData.layers.entities || []);
        
        // Load checkpoints
        this.loadCheckpoints(levelData.checkpoints || []);
        
        // Load special areas
        this.loadAreas(levelData.areas || []);
        
        // Load triggers
        this.loadTriggers(levelData.triggers || []);
        
        // Set player spawn from entities
        const playerSpawn = levelData.layers.entities.find(e => e.type === 'player_spawn');
        if (playerSpawn) {
            this.playerSpawn = new Vector2(playerSpawn.x, playerSpawn.y);
        }
        
        // Trigger level loaded event
        this.triggerEvent('levelLoaded', { level: levelData });
        
        console.log('Level loaded successfully');
    }
    
    clearLevel() {
        // Remove all non-persistent objects
        this.gameObjects = this.gameObjects.filter(obj => obj.persistent);
        
        // Clear layers
        for (const layer of this.layers.values()) {
            layer.objects = layer.objects.filter(obj => obj.persistent);
        }
        
        // Clear particle systems
        this.particleSystems = [];
        
        // Reset checkpoints
        this.checkpoints = [];
        this.currentCheckpoint = null;
    }
    
    loadTilemap(tilemapData) {
        this.tilemap = new Tilemap(tilemapData);
        
        // Create solid tiles as collision objects
        this.createTileColliders();
    }
    
    createTileColliders() {
        if (!this.tilemap) return;
        
        const tileSize = this.tilemap.tileSize;
        const solidTiles = this.tilemap.getSolidTiles();
        
        for (const tile of solidTiles) {
            const collider = new GameObject(
                tile.x * tileSize,
                tile.y * tileSize,
                tileSize,
                tileSize
            );
            collider.solid = true;
            collider.addTag('solid');
            collider.addTag('tile');
            collider.layer = 'tiles';
            collider.visible = false; // Don't render, just collision
            
            this.addObject(collider);
        }
    }
    
    loadLevelObjects(objectsData) {
        for (const objData of objectsData) {
            const obj = this.createObjectFromData(objData);
            if (obj) {
                this.addObject(obj);
            }
        }
    }
    
    createObjectFromData(data) {
        switch (data.type) {
            case 'Player':
                const player = new Player(data.x, data.y);
                return player;
                
            case 'Enemy':
                const enemy = new Enemy(data.x, data.y, data.enemyType);
                return enemy;
                
            case 'PowerUp':
                const powerUp = new PowerUp(data.x, data.y, data.powerType);
                return powerUp;
                
            case 'Platform':
                const platform = new Platform(data.x, data.y, data.width, data.height, data.platformType);
                return platform;
                
            case 'Checkpoint':
                const checkpoint = new Checkpoint(data.x, data.y);
                return checkpoint;
                
            case 'Transition':
                const transition = new LevelTransition(data.x, data.y, data.targetLevel, data.targetSpawn);
                return transition;
                
            default:
                // Generic object
                const obj = GameObject.fromJSON(data);
                return obj;
        }
    }
    
    loadCheckpoints(checkpointsData) {
        for (const checkpointData of checkpointsData) {
            const checkpoint = new Checkpoint(checkpointData.x, checkpointData.y);
            checkpoint.id = checkpointData.id;
            this.checkpoints.push(checkpoint);
            this.addObject(checkpoint);
        }
    }
    
    loadAudioZones(audioZonesData) {
        for (const zoneData of audioZonesData) {
            const zone = {
                bounds: zoneData.bounds,
                musicTrack: zoneData.musicTrack,
                ambientSounds: zoneData.ambientSounds || [],
                active: false,
                onEnter: () => {
                    if (window.game.audioManager) {
                        window.game.audioManager.playMusic(zone.musicTrack);
                        for (const sound of zone.ambientSounds) {
                            window.game.audioManager.playAmbientSound(sound);
                        }
                    }
                },
                onExit: () => {
                    if (window.game.audioManager) {
                        window.game.audioManager.stopAmbientSounds();
                    }
                }
            };
            this.audioZones.push(zone);
        }
    }
    
    loadLevelEntities(entitiesData) {
        // Import entity classes
        import('../entities/Player.js').then(({ Player }) => {
            import('../entities/BasicEntities.js').then(({ PowerUp, Enemy, Platform }) => {
                import('../entities/AdvancedEntities.js').then(({ Checkpoint, FlyingEnemy }) => {
                    this.processEntities(entitiesData, { Player, PowerUp, Enemy, Platform, Checkpoint, FlyingEnemy });
                });
            });
        });
    }
    
    processEntities(entitiesData, entityClasses) {
        for (const entityData of entitiesData) {
            const entity = this.createEntityFromData(entityData, entityClasses);
            if (entity) {
                this.addObject(entity);
            }
        }
    }
    
    createEntityFromData(data, entityClasses) {
        const { Player, PowerUp, Enemy, Platform, Checkpoint, FlyingEnemy } = entityClasses;
        
        switch (data.type) {
            case 'player_spawn':
                // Player spawn point - just store position, don't create player object
                this.playerSpawn = new Vector2(data.x, data.y);
                return null;
                
            case 'powerup':
                const powerType = data.properties?.powerType || 'double_jump';
                const powerUp = new PowerUp(data.x, data.y, { powerType });
                powerUp.id = data.id;
                return powerUp;
                
            case 'basic_enemy':
                const enemy = new Enemy(data.x, data.y, data.properties || {});
                enemy.id = data.id;
                return enemy;
                
            case 'flying_enemy':
                const flyingEnemy = new FlyingEnemy(data.x, data.y, data.properties || {});
                flyingEnemy.id = data.id;
                return flyingEnemy;
                
            case 'checkpoint':
                const checkpoint = new Checkpoint(data.x, data.y, data.properties || {});
                checkpoint.id = data.id;
                return checkpoint;
                
            case 'platform':
                const platform = new Platform(data.x, data.y, data.properties || {});
                platform.id = data.id;
                return platform;
                
            case 'health':
                const healthPickup = new PowerUp(data.x, data.y, { powerType: 'health' });
                healthPickup.id = data.id;
                return healthPickup;
                
            default:
                console.warn(`Unknown entity type: ${data.type}`);
                return null;
        }
    }
    
    loadAreas(areasData) {
        for (const areaData of areasData) {
            // Create area objects for special zones (water, wind, damage, etc.)
            const area = {
                id: areaData.id,
                type: areaData.type,
                bounds: {
                    x: areaData.x,
                    y: areaData.y,
                    width: areaData.width,
                    height: areaData.height
                },
                properties: areaData.properties || {},
                active: true
            };
            
            // Add to world areas collection
            if (!this.areas) this.areas = [];
            this.areas.push(area);
        }
    }
    
    loadTriggers(triggersData) {
        for (const triggerData of triggersData) {
            // Create trigger objects for events
            const trigger = {
                id: triggerData.id,
                type: triggerData.type,
                bounds: {
                    x: triggerData.x,
                    y: triggerData.y,
                    width: triggerData.width,
                    height: triggerData.height
                },
                action: triggerData.action,
                conditions: triggerData.conditions || {},
                properties: triggerData.properties || {},
                triggered: false
            };
            
            // Add to world triggers collection
            if (!this.triggers) this.triggers = [];
            this.triggers.push(trigger);
        }
    }

    // Object management
    addObject(obj) {
        this.toAdd.push(obj);
        return obj;
    }
    
    removeObject(obj) {
        if (!this.toRemove.includes(obj)) {
            this.toRemove.push(obj);
        }
    }
    
    addObjectToLayer(obj) {
        const layerName = obj.layer || 'entities';
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.objects.push(obj);
        }
    }
    
    removeObjectFromLayer(obj) {
        for (const layer of this.layers.values()) {
            const index = layer.objects.indexOf(obj);
            if (index !== -1) {
                layer.objects.splice(index, 1);
                break;
            }
        }
    }
    
    getObjectsForLayer(layerName) {
        const layer = this.layers.get(layerName);
        return layer ? layer.objects : [];
    }
    
    // Object queries
    getPlayer() {
        return this.gameObjects.find(obj => obj.hasTag('player'));
    }
    
    getObjectsWithTag(tag) {
        return this.gameObjects.filter(obj => obj.hasTag(tag));
    }
    
    getObjectsInRadius(center, radius, tag = null) {
        return this.gameObjects.filter(obj => {
            if (tag && !obj.hasTag(tag)) return false;
            return center.distance(obj.getCenter()) <= radius;
        });
    }
    
    getObjectsInArea(bounds, tag = null) {
        return this.gameObjects.filter(obj => {
            if (tag && !obj.hasTag(tag)) return false;
            const objBounds = obj.getBounds();
            return this.boundsOverlap(bounds, objBounds);
        });
    }
    
    boundsOverlap(a, b) {
        return !(a.x + a.width <= b.x ||
                b.x + b.width <= a.x ||
                a.y + a.height <= b.y ||
                b.y + b.height <= a.y);
    }
      // Level management
    loadLevel(levelData) {
        console.log('Loading level:', levelData.metadata?.name || 'Unknown');
        
        this.levelData = levelData;
        this.currentLevel = levelData.metadata?.name || 'Unknown';
        
        // Clear existing objects (except persistent ones)
        this.clearLevel();
        
        // Set world properties
        this.width = levelData.properties.width;
        this.height = levelData.properties.height;
        this.tileSize = levelData.properties.tileSize;
        
        // Set world bounds
        this.bounds = {
            x: 0,
            y: 0,
            width: levelData.properties.width * levelData.properties.tileSize,
            height: levelData.properties.height * levelData.properties.tileSize
        };
        
        // Set gravity
        if (levelData.properties.gravity) {
            this.gravity = new Vector2(0, levelData.properties.gravity);
        }
        
        // Set background color
        if (levelData.properties.backgroundColor) {
            this.backgroundColor = levelData.properties.backgroundColor;
        }
        
        // Load tile layers
        this.layers.set('background', levelData.layers.background || []);
        this.layers.set('collision', levelData.layers.collision || []);
        this.layers.set('foreground', levelData.layers.foreground || []);
        
        // Load entities
        this.loadLevelEntities(levelData.layers.entities || []);
        
        // Load checkpoints
        this.loadCheckpoints(levelData.checkpoints || []);
        
        // Load special areas
        this.loadAreas(levelData.areas || []);
        
        // Load triggers
        this.loadTriggers(levelData.triggers || []);
        
        // Set player spawn from entities
        const playerSpawn = levelData.layers.entities.find(e => e.type === 'player_spawn');
        if (playerSpawn) {
            this.playerSpawn = new Vector2(playerSpawn.x, playerSpawn.y);
        }
        
        // Trigger level loaded event
        this.triggerEvent('levelLoaded', { level: levelData });
        
        console.log('Level loaded successfully');
    }
    
    clearLevel() {
        // Remove all non-persistent objects
        this.gameObjects = this.gameObjects.filter(obj => obj.persistent);
        
        // Clear layers
        for (const layer of this.layers.values()) {
            layer.objects = layer.objects.filter(obj => obj.persistent);
        }
        
        // Clear particle systems
        this.particleSystems = [];
        
        // Reset checkpoints
        this.checkpoints = [];
        this.currentCheckpoint = null;
    }
    
    loadTilemap(tilemapData) {
        this.tilemap = new Tilemap(tilemapData);
        
        // Create solid tiles as collision objects
        this.createTileColliders();
    }
    
    createTileColliders() {
        if (!this.tilemap) return;
        
        const tileSize = this.tilemap.tileSize;
        const solidTiles = this.tilemap.getSolidTiles();
        
        for (const tile of solidTiles) {
            const collider = new GameObject(
                tile.x * tileSize,
                tile.y * tileSize,
                tileSize,
                tileSize
            );
            collider.solid = true;
            collider.addTag('solid');
            collider.addTag('tile');
            collider.layer = 'tiles';
            collider.visible = false; // Don't render, just collision
            
            this.addObject(collider);
        }
    }
    
    loadLevelObjects(objectsData) {
        for (const objData of objectsData) {
            const obj = this.createObjectFromData(objData);
            if (obj) {
                this.addObject(obj);
            }
        }
    }
    
    createObjectFromData(data) {
        switch (data.type) {
            case 'Player':
                const player = new Player(data.x, data.y);
                return player;
                
            case 'Enemy':
                const enemy = new Enemy(data.x, data.y, data.enemyType);
                return enemy;
                
            case 'PowerUp':
                const powerUp = new PowerUp(data.x, data.y, data.powerType);
                return powerUp;
                
            case 'Platform':
                const platform = new Platform(data.x, data.y, data.width, data.height, data.platformType);
                return platform;
                
            case 'Checkpoint':
                const checkpoint = new Checkpoint(data.x, data.y);
                return checkpoint;
                
            case 'Transition':
                const transition = new LevelTransition(data.x, data.y, data.targetLevel, data.targetSpawn);
                return transition;
                
            default:
                // Generic object
                const obj = GameObject.fromJSON(data);
                return obj;
        }
    }
    
    loadCheckpoints(checkpointsData) {
        for (const checkpointData of checkpointsData) {
            const checkpoint = new Checkpoint(checkpointData.x, checkpointData.y);
            checkpoint.id = checkpointData.id;
            this.checkpoints.push(checkpoint);
            this.addObject(checkpoint);
        }
    }
    
    loadAudioZones(audioZonesData) {
        for (const zoneData of audioZonesData) {
            const zone = {
                bounds: zoneData.bounds,
                musicTrack: zoneData.musicTrack,
                ambientSounds: zoneData.ambientSounds || [],
                active: false,
                onEnter: () => {
                    if (window.game.audioManager) {
                        window.game.audioManager.playMusic(zone.musicTrack);
                        for (const sound of zone.ambientSounds) {
                            window.game.audioManager.playAmbientSound(sound);
                        }
                    }
                },
                onExit: () => {
                    if (window.game.audioManager) {
                        window.game.audioManager.stopAmbientSounds();
                    }
                }
            };
            this.audioZones.push(zone);
        }
    }
    
    loadLevelEntities(entitiesData) {
        // Import entity classes
        import('../entities/Player.js').then(({ Player }) => {
            import('../entities/BasicEntities.js').then(({ PowerUp, Enemy, Platform }) => {
                import('../entities/AdvancedEntities.js').then(({ Checkpoint, FlyingEnemy }) => {
                    this.processEntities(entitiesData, { Player, PowerUp, Enemy, Platform, Checkpoint, FlyingEnemy });
                });
            });
        });
    }
    
    processEntities(entitiesData, entityClasses) {
        for (const entityData of entitiesData) {
            const entity = this.createEntityFromData(entityData, entityClasses);
            if (entity) {
                this.addObject(entity);
            }
        }
    }
    
    createEntityFromData(data, entityClasses) {
        const { Player, PowerUp, Enemy, Platform, Checkpoint, FlyingEnemy } = entityClasses;
        
        switch (data.type) {
            case 'player_spawn':
                // Player spawn point - just store position, don't create player object
                this.playerSpawn = new Vector2(data.x, data.y);
                return null;
                
            case 'powerup':
                const powerType = data.properties?.powerType || 'double_jump';
                const powerUp = new PowerUp(data.x, data.y, { powerType });
                powerUp.id = data.id;
                return powerUp;
                
            case 'basic_enemy':
                const enemy = new Enemy(data.x, data.y, data.properties || {});
                enemy.id = data.id;
                return enemy;
                
            case 'flying_enemy':
                const flyingEnemy = new FlyingEnemy(data.x, data.y, data.properties || {});
                flyingEnemy.id = data.id;
                return flyingEnemy;
                
            case 'checkpoint':
                const checkpoint = new Checkpoint(data.x, data.y, data.properties || {});
                checkpoint.id = data.id;
                return checkpoint;
                
            case 'platform':
                const platform = new Platform(data.x, data.y, data.properties || {});
                platform.id = data.id;
                return platform;
                
            case 'health':
                const healthPickup = new PowerUp(data.x, data.y, { powerType: 'health' });
                healthPickup.id = data.id;
                return healthPickup;
                
            default:
                console.warn(`Unknown entity type: ${data.type}`);
                return null;
        }
    }
    
    loadAreas(areasData) {
        for (const areaData of areasData) {
            // Create area objects for special zones (water, wind, damage, etc.)
            const area = {
                id: areaData.id,
                type: areaData.type,
                bounds: {
                    x: areaData.x,
                    y: areaData.y,
                    width: areaData.width,
                    height: areaData.height
                },
                properties: areaData.properties || {},
                active: true
            };
            
            // Add to world areas collection
            if (!this.areas) this.areas = [];
            this.areas.push(area);
        }
    }
    
    loadTriggers(triggersData) {
        for (const triggerData of triggersData) {
            // Create trigger objects for events
            const trigger = {
                id: triggerData.id,
                type: triggerData.type,
                bounds: {
                    x: triggerData.x,
                    y: triggerData.y,
                    width: triggerData.width,
                    height: triggerData.height
                },
                action: triggerData.action,
                conditions: triggerData.conditions || {},
                properties: triggerData.properties || {},
                triggered: false
            };
            
            // Add to world triggers collection
            if (!this.triggers) this.triggers = [];
            this.triggers.push(trigger);
        }
    }

    // Main update loop
    update(deltaTime) {
        if (this.paused) return;
        
        // Apply time scale
        deltaTime *= this.timeScale;
        this.worldTime += deltaTime;
        
        // Process object additions and removals
        this.processObjectChanges();
        
        // Update all game objects
        this.updateGameObjects(deltaTime);
        
        // Update particle systems
        this.updateParticleSystems(deltaTime);
        
        // Update weather and environmental effects
        this.updateEnvironmentalEffects(deltaTime);
        
        // Check level transitions
        this.checkLevelTransitions();
        
        // Update audio zones
        this.updateAudioZones();
        
        // Process world events
        this.processWorldEvents();
    }
    
    processObjectChanges() {
        // Add new objects
        for (const obj of this.toAdd) {
            this.gameObjects.push(obj);
            this.addObjectToLayer(obj);
        }
        this.toAdd = [];
        
        // Remove destroyed objects
        for (const obj of this.toRemove) {
            const index = this.gameObjects.indexOf(obj);
            if (index !== -1) {
                this.gameObjects.splice(index, 1);
                this.removeObjectFromLayer(obj);
            }
        }
        this.toRemove = [];
        
        // Clean up destroyed objects
        this.gameObjects = this.gameObjects.filter(obj => !obj.destroyed);
    }
    
    updateGameObjects(deltaTime) {
        for (const obj of this.gameObjects) {
            if (obj.active && !obj.destroyed) {
                obj.update(deltaTime);
            }
        }
    }
    
    updateParticleSystems(deltaTime) {
        for (let i = this.particleSystems.length - 1; i >= 0; i--) {
            const system = this.particleSystems[i];
            system.update(deltaTime);
            
            if (system.shouldRemove()) {
                this.particleSystems.splice(i, 1);
            }
        }
    }
    
    updateEnvironmentalEffects(deltaTime) {
        if (this.weather) {
            this.weather.update(deltaTime);
        }
    }
    
    checkLevelTransitions() {
        if (!this.transitioning) {
            const player = this.getPlayer();
            if (player) {
                // Check if player is at level transition points
                const transitions = this.getObjectsWithTag('transition');
                for (const transition of transitions) {
                    if (player.overlaps(transition)) {
                        this.startLevelTransition(transition.targetLevel, transition.targetSpawn);
                        break;
                    }
                }
            }
        }
    }
    
    updateAudioZones() {
        const player = this.getPlayer();
        if (!player) return;
        
        for (const zone of this.audioZones) {
            const inZone = player.contains(zone.bounds);
            
            if (inZone && !zone.active) {
                zone.active = true;
                zone.onEnter();
            } else if (!inZone && zone.active) {
                zone.active = false;
                zone.onExit();
            }
        }
    }
    
    processWorldEvents() {
        // Process any pending world events
        for (const [eventType, callbacks] of this.eventListeners) {
            // Event processing logic would go here
        }
    }
    
    // Object management
    addObject(obj) {
        this.toAdd.push(obj);
        return obj;
    }
    
    removeObject(obj) {
        if (!this.toRemove.includes(obj)) {
            this.toRemove.push(obj);
        }
    }
    
    addObjectToLayer(obj) {
        const layerName = obj.layer || 'entities';
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.objects.push(obj);
        }
    }
    
    removeObjectFromLayer(obj) {
        for (const layer of this.layers.values()) {
            const index = layer.objects.indexOf(obj);
            if (index !== -1) {
                layer.objects.splice(index, 1);
                break;
            }
        }
    }
    
    getObjectsForLayer(layerName) {
        const layer = this.layers.get(layerName);
        return layer ? layer.objects : [];
    }
    
    // Object queries
    getPlayer() {
        return this.gameObjects.find(obj => obj.hasTag('player'));
    }
    
    getObjectsWithTag(tag) {
        return this.gameObjects.filter(obj => obj.hasTag(tag));
    }
    
    getObjectsInRadius(center, radius, tag = null) {
        return this.gameObjects.filter(obj => {
            if (tag && !obj.hasTag(tag)) return false;
            return center.distance(obj.getCenter()) <= radius;
        });
    }
    
    getObjectsInArea(bounds, tag = null) {
        return this.gameObjects.filter(obj => {
            if (tag && !obj.hasTag(tag)) return false;
            const objBounds = obj.getBounds();
            return this.boundsOverlap(bounds, objBounds);
        });
    }
    
    boundsOverlap(a, b) {
        return !(a.x + a.width <= b.x ||
                b.x + b.width <= a.x ||
                a.y + a.height <= b.y ||
                b.y + b.height <= a.y);
    }
      // Level management
    loadLevel(levelData) {
        console.log('Loading level:', levelData.metadata?.name || 'Unknown');
        
        this.levelData = levelData;
        this.currentLevel = levelData.metadata?.name || 'Unknown';
        
        // Clear existing objects (except persistent ones)
        this.clearLevel();
        
        // Set world properties
        this.width = levelData.properties.width;
        this.height = levelData.properties.height;
        this.tileSize = levelData.properties.tileSize;
        
        // Set world bounds
        this.bounds = {
            x: 0,
            y: 0,
            width: levelData.properties.width * levelData.properties.tileSize,
            height: levelData.properties.height * levelData.properties.tileSize
        };
        
        // Set gravity
        if (levelData.properties.gravity) {
            this.gravity = new Vector2(0, levelData.properties.gravity);
        }
        
        // Set background color
        if (levelData.properties.backgroundColor) {
            this.backgroundColor = levelData.properties.backgroundColor;
        }
        
        // Load tile layers
        this.layers.set('background', levelData.layers.background || []);
        this.layers.set('collision', levelData.layers.collision || []);
        this.layers.set('foreground', levelData.layers.foreground || []);
        
        // Load entities
        this.loadLevelEntities(levelData.layers.entities || []);
        
        // Load checkpoints
        this.loadCheckpoints(levelData.checkpoints || []);
        
        // Load special areas
        this.loadAreas(levelData.areas || []);
        
        // Load triggers
        this.loadTriggers(levelData.triggers || []);
        
        // Set player spawn from entities
        const playerSpawn = levelData.layers.entities.find(e => e.type === 'player_spawn');
        if (playerSpawn) {
            this.playerSpawn = new Vector2(playerSpawn.x, playerSpawn.y);
        }
        
        // Trigger level loaded event
        this.triggerEvent('levelLoaded', { level: levelData });
        
        console.log('Level loaded successfully');
    }
    
    clearLevel() {
        // Remove all non-persistent objects
        this.gameObjects = this.gameObjects.filter(obj => obj.persistent);
        
        // Clear layers
        for (const layer of this.layers.values()) {
            layer.objects = layer.objects.filter(obj => obj.persistent);
        }
        
        // Clear particle systems
        this.particleSystems = [];
        
        // Reset checkpoints
        this.checkpoints = [];
        this.currentCheckpoint = null;
    }
    
    loadTilemap(tilemapData) {
        this.tilemap = new Tilemap(tilemapData);
        
        // Create solid tiles as collision objects
        this.createTileColliders();
    }
    
    createTileColliders() {
        if (!this.tilemap) return;
        
        const tileSize = this.tilemap.tileSize;
        const solidTiles = this.tilemap.getSolidTiles();
        
        for (const tile of solidTiles) {
            const collider = new GameObject(
                tile.x * tileSize,
                tile.y * tileSize,
                tileSize,
                tileSize
            );
            collider.solid = true;
            collider.addTag('solid');
            collider.addTag('tile');
            collider.layer = 'tiles';
            collider.visible = false; // Don't render, just collision
            
            this.addObject(collider);
        }
    }
    
    loadLevelObjects(objectsData) {
        for (const objData of objectsData) {
            const obj = this.createObjectFromData(objData);
            if (obj) {
                this.addObject(obj);
            }
        }
    }
    
    createObjectFromData(data) {
        switch (data.type) {
            case 'Player':
                const player = new Player(data.x, data.y);
                return player;
                
            case 'Enemy':
                const enemy = new Enemy(data.x, data.y, data.enemyType);
                return enemy;
                
            case 'PowerUp':
                const powerUp = new PowerUp(data.x, data.y, data.powerType);
                return powerUp;
                
            case 'Platform':
                const platform = new Platform(data.x, data.y, data.width, data.height, data.platformType);
                return platform;
                
            case 'Checkpoint':
                const checkpoint = new Checkpoint(data.x, data.y);
                return checkpoint;
                
            case 'Transition':
                const transition = new LevelTransition(data.x, data.y, data.targetLevel, data.targetSpawn);
                return transition;
                
            default:
                // Generic object
                const obj = GameObject.fromJSON(data);
                return obj;
        }
    }
    
    loadCheckpoints(checkpointsData) {
        for (const checkpointData of checkpointsData) {
            const checkpoint = new Checkpoint(checkpointData.x, checkpointData.y);
            checkpoint.id = checkpointData.id;
            this.checkpoints.push(checkpoint);
            this.addObject(checkpoint);
        }
    }
    
    loadAudioZones(audioZonesData) {
        for (const zoneData of audioZonesData) {
            const zone = {
                bounds: zoneData.bounds,
                musicTrack: zoneData.musicTrack,
                ambientSounds: zoneData.ambientSounds || [],
                active: false,
                onEnter: () => {
                    if (window.game.audioManager) {
                        window.game.audioManager.playMusic(zone.musicTrack);
                        for (const sound of zone.ambientSounds) {
                            window.game.audioManager.playAmbientSound(sound);
                        }
                    }
                },
                onExit: () => {
                    if (window.game.audioManager) {
                        window.game.audioManager.stopAmbientSounds();
                    }
                }
            };
            this.audioZones.push(zone);
        }
    }
    
    loadLevelEntities(entitiesData) {
        // Import entity classes
        import('../entities/Player.js').then(({ Player }) => {
            import('../entities/BasicEntities.js').then(({ PowerUp, Enemy, Platform }) => {
                import('../entities/AdvancedEntities.js').then(({ Checkpoint, FlyingEnemy }) => {
                    this.processEntities(entitiesData, { Player, PowerUp, Enemy, Platform, Checkpoint, FlyingEnemy });
                });
            });
        });
    }
    
    processEntities(entitiesData, entityClasses) {
        for (const entityData of entitiesData) {
            const entity = this.createEntityFromData(entityData, entityClasses);
            if (entity) {
                this.addObject(entity);
            }
        }
    }
    
    createEntityFromData(data, entityClasses) {
        const { Player, PowerUp, Enemy, Platform, Checkpoint, FlyingEnemy } = entityClasses;
        
        switch (data.type) {
            case 'player_spawn':
                // Player spawn point - just store position, don't create player object
                this.playerSpawn = new Vector2(data.x, data.y);
                return null;
                
            case 'powerup':
                const powerType = data.properties?.powerType || 'double_jump';
                const powerUp = new PowerUp(data.x, data.y, { powerType });
                powerUp.id = data.id;
                return powerUp;
                
            case 'basic_enemy':
                const enemy = new Enemy(data.x, data.y, data.properties || {});
                enemy.id = data.id;
                return enemy;
                
            case 'flying_enemy':
                const flyingEnemy = new FlyingEnemy(data.x, data.y, data.properties || {});
                flyingEnemy.id = data.id;
                return flyingEnemy;
                
            case 'checkpoint':
                const checkpoint = new Checkpoint(data.x, data.y, data.properties || {});
                checkpoint.id = data.id;
                return checkpoint;
                
            case 'platform':
                const platform = new Platform(data.x, data.y, data.properties || {});
                platform.id = data.id;
                return platform;
                
            case 'health':
                const healthPickup = new PowerUp(data.x, data.y, { powerType: 'health' });
                healthPickup.id = data.id;
                return healthPickup;
                
            default:
                console.warn(`Unknown entity type: ${data.type}`);
                return null;
        }
    }
    
    loadAreas(areasData) {
        for (const areaData of areasData) {
            // Create area objects for special zones (water, wind, damage, etc.)
            const area = {
                id: areaData.id,
                type: areaData.type,
                bounds: {
                    x: areaData.x,
                    y: areaData.y,
                    width: areaData.width,
                    height: areaData.height
                },
                properties: areaData.properties || {},
                active: true
            };
            
            // Add to world areas collection
            if (!this.areas) this.areas = [];
            this.areas.push(area);
        }
    }
    
    loadTriggers(triggersData) {
        for (const triggerData of triggersData) {
            // Create trigger objects for events
            const trigger = {
                id: triggerData.id,
                type: triggerData.type,
                bounds: {
                    x: triggerData.x,
                    y: triggerData.y,
                    width: triggerData.width,
                    height: triggerData.height
                },
                action: triggerData.action,
                conditions: triggerData.conditions || {},
                properties: triggerData.properties || {},
                triggered: false
            };
            
            // Add to world triggers collection
            if (!this.triggers) this.triggers = [];
            this.triggers.push(trigger);
        }
    }

    // Checkpoint system
    activateCheckpoint(checkpoint) {
        this.currentCheckpoint = checkpoint;
        checkpoint.activated = true;
        
        // Save game state
        this.saveGameState();
        
        this.triggerEvent('checkpointActivated', { checkpoint: checkpoint });
    }
    
    getCurrentCheckpoint() {
        return this.currentCheckpoint;
    }
    
    // World state management
    saveGameState() {
        const gameState = {
            level: this.currentLevel,
            checkpoint: this.currentCheckpoint ? this.currentCheckpoint.id : null,
            player: this.getPlayer()?.toJSON(),
            worldFlags: Object.fromEntries(this.worldFlags),
            collectibles: Object.fromEntries(this.collectibles),
            worldTime: this.worldTime
        };
        
        return gameState;
    }
    
    loadGameState(gameState) {
        // Load level
        if (gameState.level) {
            this.loadLevel(gameState.level);
        }
        
        // Restore player
        if (gameState.player) {
            const player = Player.fromJSON(gameState.player);
            this.addObject(player);
        }
        
        // Restore world flags
        this.worldFlags = new Map(Object.entries(gameState.worldFlags || {}));
        
        // Restore collectibles
        this.collectibles = new Map(Object.entries(gameState.collectibles || {}));
        
        // Restore world time
        this.worldTime = gameState.worldTime || 0;
        
        // Activate checkpoint
        if (gameState.checkpoint) {
            const checkpoint = this.checkpoints.find(cp => cp.id === gameState.checkpoint);
            if (checkpoint) {
                this.activateCheckpoint(checkpoint);
            }
        }
    }
    
    // World flags (for progression tracking)
    setFlag(name, value) {
        this.worldFlags.set(name, value);
    }
    
    getFlag(name) {
        return this.worldFlags.get(name);
    }
    
    hasFlag(name) {
        return this.worldFlags.has(name);
    }
    
    // Collectibles tracking
    collectItem(id, type) {
        this.collectibles.set(id, { type: type, collected: true, time: this.worldTime });
    }
    
    isItemCollected(id) {
        return this.collectibles.has(id);
    }
    
    getCollectionCount(type) {
        let count = 0;
        for (const [id, item] of this.collectibles) {
            if (item.type === type) count++;
        }
        return count;
    }
    
    // Particle systems
    addParticleSystem(system) {
        this.particleSystems.push(system);
    }
    
    createExplosion(position, size = 'medium') {
        const explosion = new ParticleSystem(position, {
            type: 'explosion',
            size: size,
            duration: 2.0,
            particleCount: size === 'small' ? 10 : size === 'large' ? 50 : 25
        });
        this.addParticleSystem(explosion);
    }
    
    // Weather system
    setWeather(weatherType, intensity = 1.0) {
        switch (weatherType) {
            case 'rain':
                this.weather = new RainWeather(intensity);
                break;
            case 'snow':
                this.weather = new SnowWeather(intensity);
                break;
            case 'wind':
                this.weather = new WindWeather(intensity);
                break;
            default:
                this.weather = null;
        }
    }
    
    // Event system
    addEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }
    
    removeEventListener(eventType, callback) {
        if (this.eventListeners.has(eventType)) {
            const callbacks = this.eventListeners.get(eventType);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    triggerEvent(eventType, data = null) {
        if (this.eventListeners.has(eventType)) {
            const callbacks = this.eventListeners.get(eventType);
            for (const callback of callbacks) {
                callback(data);
            }
        }
    }
    
    // World control
    pause() {
        this.paused = true;
    }
    
    resume() {
        this.paused = false;
    }
    
    setTimeScale(scale) {
        this.timeScale = Math.max(0, scale);
    }
    
    // Rendering support
    render(renderer) {
        // Render tilemap
        if (this.tilemap && this.tileset) {
            renderer.renderTiles(this.tilemap, this.tileset);
        }
        
        // Render particle systems
        for (const system of this.particleSystems) {
            system.render(renderer);
        }
        
        // Render weather
        if (this.weather) {
            this.weather.render(renderer);
        }
    }
    
    // Debug methods
    getDebugInfo() {
        return {
            objectCount: this.gameObjects.length,
            activeObjects: this.gameObjects.filter(obj => obj.active).length,
            particleSystems: this.particleSystems.length,
            currentLevel: this.currentLevel,
            worldTime: this.worldTime,
            paused: this.paused,
            timeScale: this.timeScale
        };
    }
    
    // Cleanup
    destroy() {
        this.gameObjects = [];
        this.toAdd = [];
        this.toRemove = [];
        this.layers.clear();
        this.particleSystems = [];
        this.eventListeners.clear();
        this.audioZones = [];
        this.checkpoints = [];
        this.weather = null;
    }
}

// Tilemap class for handling tile-based levels
class Tilemap {
    constructor(data) {
        this.width = data.width;
        this.height = data.height;
        this.tileSize = data.tileSize || 32;
        this.tiles = data.tiles || [];
        this.tileProperties = data.tileProperties || {};
    }
    
    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 0;
        }
        return this.tiles[y * this.width + x] || 0;
    }
    
    setTile(x, y, tileId) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return;
        }
        this.tiles[y * this.width + x] = tileId;
    }
    
    getSolidTiles() {
        const solidTiles = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tileId = this.getTile(x, y);
                if (this.isTileSolid(tileId)) {
                    solidTiles.push({ x, y, id: tileId });
                }
            }
        }
        return solidTiles;
    }
    
    isTileSolid(tileId) {
        const properties = this.tileProperties[tileId];
        return properties && properties.solid;
    }
    
    toJSON() {
        return {
            width: this.width,
            height: this.height,
            tileSize: this.tileSize,
            tiles: this.tiles,
            tileProperties: this.tileProperties
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { World, Tilemap };
}
