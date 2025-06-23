/**
 * Game - Main game class that orchestrates all systems for Echo Genesis
 * Handles initialization, game loop, state management, and system coordination
 */

import { LevelLoader } from '../utils/LevelLoader.js';
import { SaveSystem } from '../utils/SaveSystem.js';
import { getSampleLevel } from '../levels/SampleLevels.js';

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.running = false;
        this.paused = false;
        
        // Core systems
        this.renderer = new Renderer(canvas);
        this.inputManager = new InputManager();
        this.world = new World();
        this.camera = new Camera(0, 0, canvas.width, canvas.height);
        this.physics = new Physics();
        this.audioManager = new AudioManager();
        
        // Game state
        this.gameState = 'menu'; // menu, playing, paused, gameOver, levelEditor
        this.previousState = 'menu';
        
        // Timing
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.targetFPS = 60;
        this.frameCount = 0;
        this.gameTime = 0;
          // Level management
        this.currentLevelIndex = 0;
        this.levels = [];
        this.customLevel = null;
        this.levelLoader = new LevelLoader();
        this.saveSystem = new SaveSystem();
        
        // Player reference
        this.player = null;
        
        // Game settings
        this.settings = {
            volume: 1.0,
            musicVolume: 0.7,
            sfxVolume: 0.8,
            showFPS: false,
            debugMode: false,
            pixelArt: true,
            fullscreen: false
        };
        
        // UI system
        this.ui = {
            elements: [],
            notifications: [],
            menus: new Map()
        };
        
        // Save system
        this.saveData = {
            progress: {},
            settings: {},
            stats: {}
        };
        
        // Performance monitoring
        this.performance = {
            fps: 60,
            frameTime: 16.67,
            drawCalls: 0,
            objectCount: 0
        };
        
        // Initialize systems
        this.initialize();
    }
    
    async initialize() {
        console.log('Initializing Echo Genesis...');
        
        // Setup renderer
        this.renderer.setCamera(this.camera);
        this.renderer.setPixelArt(this.settings.pixelArt);
        this.renderer.setDebugMode(this.settings.debugMode);
        
        // Setup physics
        this.physics.setGravity(0, 980);
        
        // Load assets
        await this.loadAssets();
        
        // Load levels
        await this.loadLevels();
        
        // Load save data
        this.loadSaveData();
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Setup UI
        this.setupUI();
        
        // Initialize default level or menu
        if (this.gameState === 'playing') {
            this.startLevel(this.currentLevelIndex);
        }
        
        console.log('Echo Genesis initialized successfully!');
    }
    
    async loadAssets() {
        console.log('Loading assets...');
        
        // Load sprites
        const spritePromises = [
            this.renderer.loadSprite('player', 'assets/images/player.png'),
            this.renderer.loadSprite('enemies', 'assets/images/enemies.png'),
            this.renderer.loadSprite('tiles', 'assets/images/tileset.png'),
            this.renderer.loadSprite('powerups', 'assets/images/powerups.png'),
            this.renderer.loadSprite('effects', 'assets/images/effects.png')
        ];
        
        // Load audio
        const audioPromises = [
            this.audioManager.loadSound('jump', 'assets/sounds/jump.wav'),
            this.audioManager.loadSound('attack', 'assets/sounds/attack.wav'),
            this.audioManager.loadSound('powerUp', 'assets/sounds/powerup.wav'),
            this.audioManager.loadSound('hurt', 'assets/sounds/hurt.wav'),
            this.audioManager.loadMusic('level1', 'assets/sounds/music/level1.mp3'),
            this.audioManager.loadMusic('menu', 'assets/sounds/music/menu.mp3')
        ];
        
        try {
            await Promise.all([...spritePromises, ...audioPromises]);
            console.log('Assets loaded successfully!');
        } catch (error) {
            console.warn('Some assets failed to load:', error);
            // Continue without missing assets
        }
    }
      async loadLevels() {
        console.log('Loading levels...');
        
        // Check for custom level in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const customLevelParam = urlParams.get('level');
        
        if (customLevelParam) {
            try {
                if (customLevelParam === 'temp_level') {
                    // Load from temporary storage (level editor playtest)
                    const tempLevel = localStorage.getItem('temp_level');
                    if (tempLevel) {
                        this.customLevel = await this.levelLoader.loadLevel(`data:${btoa(tempLevel)}`);
                        console.log('Loaded temporary level for playtesting');
                        return;
                    }
                } else {
                    // Load custom level
                    this.customLevel = await this.levelLoader.loadLevel(customLevelParam);
                    console.log('Loaded custom level:', customLevelParam);
                    return;
                }
            } catch (error) {
                console.error('Failed to load custom level:', error);
            }
        }
        
        // Load sample levels as fallback
        try {
            this.levels = [
                {
                    name: 'Tutorial',
                    id: 'tutorial',
                    data: getSampleLevel('tutorial')
                },
                {
                    name: 'Mystic Forest',
                    id: 'forest', 
                    data: getSampleLevel('forest')
                }
            ];
            console.log('Sample levels loaded successfully');
        } catch (error) {
            console.error('Failed to load sample levels:', error);
            // Create a minimal test level
            this.createFallbackLevel();
        }
    }
    
    createFallbackLevel() {
        console.log('Creating fallback test level...');
        
        this.levels = [{
            name: 'Test Level',
            id: 'test',
            data: {
                metadata: { name: 'Test Level', author: 'System' },
                properties: { width: 50, height: 30, tileSize: 32, gravity: 800, backgroundColor: '#1a1a2e' },
                layers: {
                    background: new Array(50 * 30).fill(0),
                    collision: new Array(50 * 30).fill(0),
                    foreground: new Array(50 * 30).fill(0),
                    entities: [
                        { id: 'spawn', type: 'player_spawn', x: 100, y: 700, properties: {} }
                    ]
                }
            }
        }];
          // Add basic ground
        for (let x = 0; x < 50; x++) {
            const index = (30 - 3) * 50 + x;
            this.levels[0].data.layers.collision[index] = 1;
        }
    }
    
    loadSaveData() {
        // Load game settings and progress
        const savedData = this.saveSystem.load();
        
        if (savedData.settings) {
            Object.assign(this.settings, savedData.settings);
        }
        
        // Apply loaded settings
        this.audioManager.setVolume(this.settings.volume);
        this.audioManager.setMusicVolume(this.settings.musicVolume);
        this.audioManager.setSFXVolume(this.settings.sfxVolume);
        
        console.log('Save data loaded');
    }
                {
                    type: 'Platform',
                    x: 0,
                    y: 500,
                    width: 2048,
                    height: 64,
                    platformType: 'solid'
                },
                // Some basic platforms
                {
                    type: 'Platform',
                    x: 300,
                    y: 400,
                    width: 128,
                    height: 32,
                    platformType: 'jumpthrough'
                },
                {
                    type: 'Platform',
                    x: 600,
                    y: 300,
                    width: 128,
                    height: 32,
                    platformType: 'jumpthrough'
                },
                // Power-up
                {
                    type: 'PowerUp',
                    x: 500,
                    y: 450,
                    powerType: 'doubleJump'
                }
            ],
            checkpoints: [
                { id: 'start', x: 100, y: 450 }
            ]
        };
    }
    
    setupEventHandlers() {
        // Window events
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('blur', () => this.handleFocusLost());
        window.addEventListener('focus', () => this.handleFocusGained());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'F11':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 'F1':
                    e.preventDefault();
                    this.toggleDebugMode();
                    break;
                case 'F2':
                    e.preventDefault();
                    this.toggleFPSDisplay();
                    break;
            }
        });
    }
    
    setupUI() {
        // Create main menu
        this.ui.menus.set('main', {
            visible: this.gameState === 'menu',
            elements: []
        });
        
        // Create pause menu
        this.ui.menus.set('pause', {
            visible: false,
            elements: []
        });
        
        // Create game over screen
        this.ui.menus.set('gameOver', {
            visible: false,
            elements: []
        });
    }
    
    // Game loop
    start() {
        if (this.running) return;
        
        this.running = true;
        this.lastFrameTime = performance.now();
        this.gameLoop();
        
        console.log('Game started!');
    }
    
    stop() {
        this.running = false;
        console.log('Game stopped!');
    }
    
    gameLoop() {
        if (!this.running) return;
        
        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;
        
        // Cap delta time to prevent large jumps
        this.deltaTime = Math.min(this.deltaTime, 1/30); // Max 30 FPS
        
        this.update();
        this.render();
        
        this.frameCount++;
        this.gameTime += this.deltaTime;
        
        // Update performance stats
        this.updatePerformanceStats();
        
        // Continue game loop
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        if (this.paused || this.gameState === 'menu') {
            this.inputManager.update();
            return;
        }
        
        // Update input
        this.inputManager.update();
        
        // Update world
        this.world.update(this.deltaTime);
        
        // Update physics
        this.physics.update(this.world, this.deltaTime);
        
        // Update camera
        if (this.player) {
            this.camera.follow(this.player);
        }
        this.camera.update(this.deltaTime);
        
        // Update audio
        this.audioManager.update(this.deltaTime);
        
        // Update UI
        this.updateUI(this.deltaTime);
        
        // Check game state changes
        this.checkGameStateChanges();
    }
      render() {
        // Clear and setup renderer
        this.renderer.clear();
        
        // Render world
        this.renderer.render(this.world);
        
        // Render debug information if enabled
        if (this.settings.debugMode) {
            this.renderEntityDebugInfo();
        }
        
        // Render UI
        this.renderUI();
        
        // Update renderer stats
        this.performance.drawCalls = this.renderer.stats.drawCalls;
        this.performance.objectCount = this.renderer.stats.objectsRendered;
    }
    
    updateUI(deltaTime) {
        // Update notifications
        for (let i = this.ui.notifications.length - 1; i >= 0; i--) {
            const notification = this.ui.notifications[i];
            notification.timeLeft -= deltaTime;
            
            if (notification.timeLeft <= 0) {
                this.ui.notifications.splice(i, 1);
            }
        }
        
        // Update UI elements
        for (const element of this.ui.elements) {
            if (element.update) {
                element.update(deltaTime);
            }
        }
    }
    
    renderUI() {
        const ctx = this.renderer.context;
        
        // Render game UI
        if (this.gameState === 'playing') {
            this.renderGameUI(ctx);
        }
        
        // Render menus
        for (const [name, menu] of this.ui.menus) {
            if (menu.visible) {
                this.renderMenu(ctx, menu);
            }
        }
        
        // Render notifications
        this.renderNotifications(ctx);
        
        // Render FPS if enabled
        if (this.settings.showFPS) {
            this.renderFPS(ctx);
        }
        
        // Render debug info if enabled
        if (this.settings.debugMode) {
            this.renderDebugInfo(ctx);
            this.renderEntityDebugInfo(ctx);
        }
    }
    
    renderGameUI(ctx) {
        if (!this.player) return;
        
        // Health bar
        const healthWidth = 200;
        const healthHeight = 20;
        const healthX = 20;
        const healthY = 20;
        
        ctx.save();
        ctx.fillStyle = '#333333';
        ctx.fillRect(healthX, healthY, healthWidth, healthHeight);
        
        const healthPercent = this.player.health / this.player.maxHealth;
        ctx.fillStyle = healthPercent > 0.3 ? '#4CAF50' : '#F44336';
        ctx.fillRect(healthX, healthY, healthWidth * healthPercent, healthHeight);
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(healthX, healthY, healthWidth, healthHeight);
        
        // Health text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px Arial';
        ctx.fillText(`Health: ${this.player.health}/${this.player.maxHealth}`, healthX, healthY + 35);
        
        // Score
        ctx.fillText(`Score: ${this.player.score}`, healthX, healthY + 55);
        
        // Lives
        ctx.fillText(`Lives: ${this.player.lives}`, healthX, healthY + 75);
        
        ctx.restore();
        
        // Ability icons
        this.renderAbilityIcons(ctx);
    }
    
    renderAbilityIcons(ctx) {
        if (!this.player) return;
        
        const iconSize = 32;
        const iconSpacing = 40;
        const startX = this.canvas.width - 250;
        const startY = 20;
        
        let iconIndex = 0;
        
        for (const [name, ability] of this.player.abilities) {
            if (ability.enabled) {
                const x = startX + (iconIndex % 5) * iconSpacing;
                const y = startY + Math.floor(iconIndex / 5) * iconSpacing;
                
                ctx.save();
                
                // Icon background
                ctx.fillStyle = ability.level > 0 ? '#4CAF50' : '#666666';
                ctx.fillRect(x, y, iconSize, iconSize);
                
                // Icon border
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, iconSize, iconSize);
                
                // Cooldown overlay
                if (ability.cooldown > 0) {
                    const cooldownPercent = ability.cooldown / ability.maxCooldown;
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                    ctx.fillRect(x, y, iconSize, iconSize * cooldownPercent);
                }
                
                // Icon text (simplified)
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(name.substring(0, 4), x + iconSize/2, y + iconSize/2 + 3);
                
                ctx.restore();
                iconIndex++;
            }
        }
    }
    
    renderMenu(ctx, menu) {
        // Basic menu rendering - would be more sophisticated in practice
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();
    }
    
    renderNotifications(ctx) {
        let y = this.canvas.height - 100;
        
        for (const notification of this.ui.notifications) {
            ctx.save();
            
            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(20, y, 300, 30);
            
            // Text
            ctx.fillStyle = notification.color || '#FFFFFF';
            ctx.font = '16px Arial';
            ctx.fillText(notification.text, 30, y + 20);
            
            ctx.restore();
            y -= 40;
        }
    }
    
    renderFPS(ctx) {
        ctx.save();
        ctx.fillStyle = '#00FF00';
        ctx.font = '16px monospace';
        ctx.fillText(`FPS: ${Math.round(this.performance.fps)}`, 10, this.canvas.height - 10);
        ctx.restore();
    }
    
    renderDebugInfo(ctx) {
        const debugInfo = [
            `Objects: ${this.performance.objectCount}`,
            `Draw Calls: ${this.performance.drawCalls}`,
            `Frame Time: ${this.performance.frameTime.toFixed(2)}ms`,
            `Game Time: ${this.gameTime.toFixed(1)}s`,
            `State: ${this.gameState}`,
            `Level: ${this.world.currentLevel || 'None'}`
        ];
        
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.canvas.width - 200, 10, 190, debugInfo.length * 20 + 10);
        
        ctx.fillStyle = '#00FF00';
        ctx.font = '12px monospace';
        
        for (let i = 0; i < debugInfo.length; i++) {
            ctx.fillText(debugInfo[i], this.canvas.width - 195, 25 + i * 20);
        }
        
        ctx.restore();
    }
      renderEntityDebugInfo() {
        if (!this.world || !this.world.gameObjects) return;
        
        // Enable debug mode on renderer
        this.renderer.setDebugMode(true);
        
        // Render debug info for all game objects
        for (const obj of this.world.gameObjects) {
            if (obj.visible && !obj.destroyed) {
                // Check if object is in camera view
                if (this.camera && this.camera.isInView && !this.camera.isInView(obj.getBounds())) {
                    continue;
                }
                
                this.renderer.renderObjectDebugInfo(obj, true, true);
            }
        }
    }
    
    updatePerformanceStats() {
        // Update FPS (smoothed over several frames)
        this.performance.fps = this.performance.fps * 0.95 + (1 / this.deltaTime) * 0.05;
        this.performance.frameTime = this.deltaTime * 1000;
    }
    
    checkGameStateChanges() {
        // Check for game over conditions
        if (this.player && this.player.lives <= 0 && this.gameState === 'playing') {
            this.gameOver();
        }
        
        // Check for level completion
        // Implementation would depend on level design
    }
    
    // Game state management
    startGame() {
        this.gameState = 'playing';
        this.paused = false;
        this.startLevel(0);
        this.audioManager.playMusic('level1');
    }
      startLevel(levelIndex) {
        // Use custom level if available, otherwise use level from array
        let levelData;
        
        if (this.customLevel) {
            levelData = this.customLevel;
            console.log(`Starting custom level: ${levelData.metadata.name}`);
        } else {
            if (levelIndex < 0 || levelIndex >= this.levels.length) return;
            
            this.currentLevelIndex = levelIndex;
            const level = this.levels[levelIndex];
            levelData = level.data;
            console.log(`Starting level: ${level.name}`);
        }
        
        // Load level into world
        this.world.loadLevel(levelData);
        
        // Create player at spawn point
        this.createPlayer();
        
        // Set camera bounds based on level size
        const pixelWidth = levelData.properties.width * levelData.properties.tileSize;
        const pixelHeight = levelData.properties.height * levelData.properties.tileSize;
        
        this.camera.setBounds(0, 0, pixelWidth, pixelHeight);
        
        // Set background color
        if (levelData.properties.backgroundColor) {
            this.renderer.setBackgroundColor(levelData.properties.backgroundColor);
        }
        
        // Set physics gravity
        if (levelData.properties.gravity) {
            this.physics.setGravity(0, levelData.properties.gravity);
        }
        
        // Play level music if specified
        if (levelData.properties.music) {
            this.audioManager.playMusic(levelData.properties.music);
        }
        
        this.gameState = 'playing';
    }
    
    loadCustomLevel(levelData) {
        this.customLevel = levelData;
        this.world.loadLevel(levelData);
        this.createPlayer();
        this.gameState = 'playing';
    }
    
    createPlayer() {
        // Remove existing player
        if (this.player) {
            this.world.removeObject(this.player);
        }
        
        // Create new player at spawn point
        const spawn = this.world.playerSpawn;
        this.player = new Player(spawn.x, spawn.y);
        this.world.addObject(this.player);
        
        // Set camera target
        this.camera.follow(this.player, true);
    }
    
    restartLevel() {
        this.startLevel(this.currentLevelIndex);
    }
    
    nextLevel() {
        if (this.currentLevelIndex < this.levels.length - 1) {
            this.startLevel(this.currentLevelIndex + 1);
        } else {
            // Game completed
            this.gameCompleted();
        }
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.paused = true;
            this.gameState = 'paused';
            this.ui.menus.get('pause').visible = true;
            this.audioManager.pauseAll();
        }
    }
    
    resumeGame() {
        if (this.gameState === 'paused') {
            this.paused = false;
            this.gameState = 'playing';
            this.ui.menus.get('pause').visible = false;
            this.audioManager.resumeAll();
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.ui.menus.get('gameOver').visible = true;
        this.audioManager.stopMusic();
        this.audioManager.playSound('gameOver');
    }
    
    gameCompleted() {
        console.log('Congratulations! Game completed!');
        // Show completion screen, save progress, etc.
    }
    
    // Save system
    saveGame() {
        const saveData = {
            progress: {
                currentLevel: this.currentLevelIndex,
                completedLevels: [],
                gameTime: this.gameTime
            },
            player: this.player ? this.player.toJSON() : null,
            world: this.world.saveGameState(),
            settings: this.settings,
            timestamp: Date.now()
        };
        
        localStorage.setItem('echoGenesisSave', JSON.stringify(saveData));
        this.showNotification('Game saved!');
    }
    
    loadGame() {
        try {
            const saveData = JSON.parse(localStorage.getItem('echoGenesisSave'));
            if (saveData) {
                // Load progress
                this.currentLevelIndex = saveData.progress.currentLevel;
                this.gameTime = saveData.progress.gameTime;
                
                // Load settings
                Object.assign(this.settings, saveData.settings);
                
                // Load world state
                this.world.loadGameState(saveData.world);
                
                // Load player
                if (saveData.player) {
                    this.player = Player.fromJSON(saveData.player);
                    this.world.addObject(this.player);
                    this.camera.follow(this.player, true);
                }
                
                this.gameState = 'playing';
                this.showNotification('Game loaded!');
                return true;
            }
        } catch (error) {
            console.error('Failed to load game:', error);
            this.showNotification('Failed to load game!');
        }
        return false;
    }
    
    loadSaveData() {
        try {
            const saveData = JSON.parse(localStorage.getItem('echoGenesisSave'));
            if (saveData && saveData.settings) {
                Object.assign(this.settings, saveData.settings);
            }
        } catch (error) {
            console.warn('No save data found');
        }
    }
    
    // Utility methods
    showNotification(text, duration = 3000, color = '#FFFFFF') {
        this.ui.notifications.push({
            text: text,
            timeLeft: duration / 1000,
            color: color
        });
    }
    
    handleResize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.camera.width = rect.width;
        this.camera.height = rect.height;
        this.renderer.resize(rect.width, rect.height);
    }
    
    handleFocusLost() {
        if (this.gameState === 'playing') {
            this.pauseGame();
        }
    }
    
    handleFocusGained() {
        // Could auto-resume or show resume prompt
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.canvas.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    toggleDebugMode() {
        this.settings.debugMode = !this.settings.debugMode;
        this.renderer.setDebugMode(this.settings.debugMode);
        this.physics.setDebugDraw(this.settings.debugMode);
    }
    
    toggleFPSDisplay() {
        this.settings.showFPS = !this.settings.showFPS;
    }
    
    // Cleanup
    destroy() {
        this.stop();
        this.inputManager.destroy();
        this.renderer.destroy();
        this.world.destroy();
        this.audioManager.destroy();
    }
}

// Make Game available globally
window.Game = Game;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
}
