/**
 * Save System for Game Progress
 * Handles saving and loading game state, progress, and settings
 */

export class SaveSystem {
    constructor() {
        this.saveKey = 'echo_genesis_save';
        this.settingsKey = 'echo_genesis_settings';
        this.version = '1.0';
        
        this.defaultSaveData = {
            version: this.version,
            created: null,
            lastPlayed: null,
            playtime: 0,
            
            // Progress tracking
            currentLevel: null,
            checkpoints: {},
            completedLevels: [],
            unlockedLevels: [],
            
            // Player abilities
            abilities: {
                doubleJump: false,
                tripleJump: false,
                dash: false,
                wallSlide: false,
                wallJump: false,
                wallClimb: false,
                glide: false,
                attack: false,
                noFallDamage: false,
                // Special abilities
                speedBoost: false,
                jumpBoost: false,
                strengthBoost: false,
                invisibility: false,
                timeSlowdown: false,
                magnetism: false,
                phasing: false,
                hover: false,
                grappling: false,
                swimming: false
            },
            
            // Statistics
            stats: {
                deaths: 0,
                totalJumps: 0,
                totalDashes: 0,
                enemiesDefeated: 0,
                powerUpsCollected: 0,
                secretsFound: 0,
                totalDistance: 0,
                bestTimes: {},
                achievements: []
            },
            
            // Settings
            settings: {
                masterVolume: 1.0,
                musicVolume: 0.8,
                sfxVolume: 0.9,
                fullscreen: false,
                showFPS: false,
                particleEffects: true,
                screenShake: true,
                autoSave: true,
                difficulty: 'normal'
            }
        };
    }

    /**
     * Save current game state
     * @param {Object} gameData - Current game state
     * @returns {boolean} Success status
     */
    save(gameData = {}) {
        try {
            const existingSave = this.load();
            const saveData = {
                ...existingSave,
                ...gameData,
                lastPlayed: new Date().toISOString(),
                version: this.version
            };

            // Update playtime
            if (gameData.sessionTime) {
                saveData.playtime = (saveData.playtime || 0) + gameData.sessionTime;
            }

            localStorage.setItem(this.saveKey, JSON.stringify(saveData));
            
            // Also save settings separately for quick access
            if (saveData.settings) {
                this.saveSettings(saveData.settings);
            }

            console.log('Game saved successfully');
            return true;
        } catch (error) {
            console.error('Failed to save game:', error);
            return false;
        }
    }

    /**
     * Load saved game data
     * @returns {Object} Loaded save data
     */
    load() {
        try {
            const savedData = localStorage.getItem(this.saveKey);
            if (!savedData) {
                return this.createNewSave();
            }

            const saveData = JSON.parse(savedData);
            
            // Migrate old save data if needed
            if (saveData.version !== this.version) {
                return this.migrateSave(saveData);
            }

            // Merge with defaults to ensure all properties exist
            return this.mergeSaveData(saveData);
        } catch (error) {
            console.error('Failed to load save data:', error);
            return this.createNewSave();
        }
    }

    /**
     * Create a new save file
     * @returns {Object} New save data
     */
    createNewSave() {
        const newSave = {
            ...this.defaultSaveData,
            created: new Date().toISOString(),
            lastPlayed: new Date().toISOString()
        };

        // Start with first level unlocked
        newSave.unlockedLevels = ['level_01'];
        newSave.currentLevel = 'level_01';

        return newSave;
    }

    /**
     * Migrate old save data to current version
     * @param {Object} oldSave - Old save data
     * @returns {Object} Migrated save data
     */
    migrateSave(oldSave) {
        console.log(`Migrating save data from version ${oldSave.version} to ${this.version}`);
        
        // For now, just merge with defaults
        const migratedSave = this.mergeSaveData(oldSave);
        migratedSave.version = this.version;
        
        return migratedSave;
    }

    /**
     * Merge save data with defaults
     * @param {Object} saveData - Save data to merge
     * @returns {Object} Merged save data
     */
    mergeSaveData(saveData) {
        const merged = JSON.parse(JSON.stringify(this.defaultSaveData));
        
        // Deep merge function
        const deepMerge = (target, source) => {
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        };

        deepMerge(merged, saveData);
        return merged;
    }

    /**
     * Save settings only
     * @param {Object} settings - Settings to save
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(this.settingsKey, JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    /**
     * Load settings only
     * @returns {Object} Loaded settings
     */
    loadSettings() {
        try {
            const settings = localStorage.getItem(this.settingsKey);
            if (settings) {
                return { ...this.defaultSaveData.settings, ...JSON.parse(settings) };
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
        return { ...this.defaultSaveData.settings };
    }

    /**
     * Delete save data
     * @returns {boolean} Success status
     */
    deleteSave() {
        try {
            localStorage.removeItem(this.saveKey);
            console.log('Save data deleted');
            return true;
        } catch (error) {
            console.error('Failed to delete save data:', error);
            return false;
        }
    }

    /**
     * Check if save data exists
     * @returns {boolean} True if save exists
     */
    hasSave() {
        return localStorage.getItem(this.saveKey) !== null;
    }

    /**
     * Unlock a new ability
     * @param {string} abilityName - Name of ability to unlock
     */
    unlockAbility(abilityName) {
        if (this.defaultSaveData.abilities.hasOwnProperty(abilityName)) {
            const saveData = this.load();
            saveData.abilities[abilityName] = true;
            this.save(saveData);
            console.log(`Ability unlocked: ${abilityName}`);
        }
    }

    /**
     * Complete a level
     * @param {string} levelId - ID of completed level
     * @param {number} time - Completion time in seconds
     */
    completeLevel(levelId, time = null) {
        const saveData = this.load();
        
        if (!saveData.completedLevels.includes(levelId)) {
            saveData.completedLevels.push(levelId);
        }

        if (time !== null) {
            if (!saveData.stats.bestTimes[levelId] || time < saveData.stats.bestTimes[levelId]) {
                saveData.stats.bestTimes[levelId] = time;
            }
        }

        this.save(saveData);
        console.log(`Level completed: ${levelId}`);
    }

    /**
     * Unlock a level
     * @param {string} levelId - ID of level to unlock
     */
    unlockLevel(levelId) {
        const saveData = this.load();
        
        if (!saveData.unlockedLevels.includes(levelId)) {
            saveData.unlockedLevels.push(levelId);
            this.save(saveData);
            console.log(`Level unlocked: ${levelId}`);
        }
    }

    /**
     * Set checkpoint
     * @param {string} levelId - Level ID
     * @param {Object} checkpoint - Checkpoint data
     */
    setCheckpoint(levelId, checkpoint) {
        const saveData = this.load();
        saveData.checkpoints[levelId] = checkpoint;
        this.save(saveData);
    }

    /**
     * Get checkpoint for level
     * @param {string} levelId - Level ID
     * @returns {Object|null} Checkpoint data or null
     */
    getCheckpoint(levelId) {
        const saveData = this.load();
        return saveData.checkpoints[levelId] || null;
    }

    /**
     * Update statistics
     * @param {Object} stats - Stats to update
     */
    updateStats(stats) {
        const saveData = this.load();
        
        Object.keys(stats).forEach(key => {
            if (typeof stats[key] === 'number') {
                saveData.stats[key] = (saveData.stats[key] || 0) + stats[key];
            } else if (Array.isArray(stats[key])) {
                saveData.stats[key] = [...(saveData.stats[key] || []), ...stats[key]];
            } else {
                saveData.stats[key] = stats[key];
            }
        });

        this.save(saveData);
    }

    /**
     * Unlock achievement
     * @param {string} achievementId - Achievement ID
     */
    unlockAchievement(achievementId) {
        const saveData = this.load();
        
        if (!saveData.stats.achievements.includes(achievementId)) {
            saveData.stats.achievements.push(achievementId);
            this.save(saveData);
            console.log(`Achievement unlocked: ${achievementId}`);
            
            // Trigger achievement notification
            this.triggerAchievementNotification(achievementId);
        }
    }

    /**
     * Trigger achievement notification
     * @param {string} achievementId - Achievement ID
     */
    triggerAchievementNotification(achievementId) {
        // This would integrate with the game's notification system
        const event = new CustomEvent('achievementUnlocked', {
            detail: { achievementId }
        });
        window.dispatchEvent(event);
    }

    /**
     * Export save data
     * @returns {string} Base64 encoded save data
     */
    exportSave() {
        const saveData = this.load();
        const jsonString = JSON.stringify(saveData);
        return btoa(jsonString);
    }

    /**
     * Import save data
     * @param {string} encodedData - Base64 encoded save data
     * @returns {boolean} Success status
     */
    importSave(encodedData) {
        try {
            const jsonString = atob(encodedData);
            const saveData = JSON.parse(jsonString);
            
            // Validate the imported data
            if (!saveData.version || !saveData.abilities) {
                throw new Error('Invalid save data format');
            }

            // Merge with current save to preserve any new fields
            const mergedData = this.mergeSaveData(saveData);
            localStorage.setItem(this.saveKey, JSON.stringify(mergedData));
            
            console.log('Save data imported successfully');
            return true;
        } catch (error) {
            console.error('Failed to import save data:', error);
            return false;
        }
    }

    /**
     * Get save data summary
     * @returns {Object} Save data summary
     */
    getSummary() {
        const saveData = this.load();
        
        return {
            playtime: saveData.playtime,
            currentLevel: saveData.currentLevel,
            completedLevels: saveData.completedLevels.length,
            unlockedLevels: saveData.unlockedLevels.length,
            abilities: Object.values(saveData.abilities).filter(Boolean).length,
            achievements: saveData.stats.achievements.length,
            lastPlayed: saveData.lastPlayed
        };
    }

    /**
     * Auto-save current game state
     * @param {Object} gameState - Current game state
     */
    autoSave(gameState) {
        const settings = this.loadSettings();
        if (settings.autoSave) {
            this.save(gameState);
        }
    }

    /**
     * Get storage usage info
     * @returns {Object} Storage usage information
     */
    getStorageInfo() {
        const saveData = localStorage.getItem(this.saveKey);
        const settingsData = localStorage.getItem(this.settingsKey);
        
        return {
            saveSize: saveData ? saveData.length : 0,
            settingsSize: settingsData ? settingsData.length : 0,
            totalSize: (saveData?.length || 0) + (settingsData?.length || 0),
            storageAvailable: this.checkStorageAvailable()
        };
    }

    /**
     * Check if localStorage is available and working
     * @returns {boolean} True if storage is available
     */
    checkStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
}
