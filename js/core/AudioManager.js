/**
 * AudioManager - Handles all audio playback for Echo Genesis
 * Manages music, sound effects, and audio settings
 */
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        
        // Audio storage
        this.sounds = new Map();
        this.music = new Map();
        this.ambientSounds = new Map();
        
        // Playback state
        this.currentMusic = null;
        this.currentMusicSource = null;
        this.ambientSources = new Map();
        
        // Settings
        this.masterVolume = 1.0;
        this.musicVolume = 0.7;
        this.sfxVolume = 0.8;
        this.muted = false;
        
        // Initialize Web Audio API
        this.initializeAudio();
    }
    
    async initializeAudio() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create gain nodes
            this.masterGain = this.audioContext.createGain();
            this.musicGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();
            
            // Connect gain nodes
            this.masterGain.connect(this.audioContext.destination);
            this.musicGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);
            
            // Set initial volumes
            this.updateVolumes();
            
            console.log('Audio system initialized');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            // Fallback to HTML5 audio
            this.fallbackToHTML5Audio();
        }
    }
    
    fallbackToHTML5Audio() {
        console.log('Using HTML5 Audio fallback');
        this.audioContext = null;
        // HTML5 Audio implementation would go here
    }
    
    // Asset loading
    async loadSound(name, url) {
        try {
            if (this.audioContext) {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.sounds.set(name, audioBuffer);
            } else {
                // HTML5 Audio fallback
                const audio = new Audio(url);
                audio.preload = 'auto';
                this.sounds.set(name, audio);
            }
            console.log(`Sound loaded: ${name}`);
        } catch (error) {
            console.error(`Failed to load sound ${name}:`, error);
        }
    }
    
    async loadMusic(name, url) {
        try {
            if (this.audioContext) {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.music.set(name, audioBuffer);
            } else {
                // HTML5 Audio fallback
                const audio = new Audio(url);
                audio.preload = 'auto';
                audio.loop = true;
                this.music.set(name, audio);
            }
            console.log(`Music loaded: ${name}`);
        } catch (error) {
            console.error(`Failed to load music ${name}:`, error);
        }
    }
    
    async loadAmbientSound(name, url) {
        try {
            if (this.audioContext) {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.ambientSounds.set(name, audioBuffer);
            } else {
                // HTML5 Audio fallback
                const audio = new Audio(url);
                audio.preload = 'auto';
                audio.loop = true;
                this.ambientSounds.set(name, audio);
            }
            console.log(`Ambient sound loaded: ${name}`);
        } catch (error) {
            console.error(`Failed to load ambient sound ${name}:`, error);
        }
    }
    
    // Sound playback
    playSound(name, volume = 1.0, pitch = 1.0, pan = 0) {
        if (this.muted) return null;
        
        const sound = this.sounds.get(name);
        if (!sound) {
            console.warn(`Sound not found: ${name}`);
            return null;
        }
        
        if (this.audioContext) {
            return this.playWebAudioSound(sound, volume, pitch, pan);
        } else {
            return this.playHTML5Sound(sound, volume);
        }
    }
    
    playWebAudioSound(audioBuffer, volume, pitch, pan) {
        try {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            const panNode = this.audioContext.createStereoPanner();
            
            source.buffer = audioBuffer;
            source.playbackRate.value = pitch;
            
            gainNode.gain.value = volume;
            panNode.pan.value = Math.max(-1, Math.min(1, pan));
            
            source.connect(gainNode);
            gainNode.connect(panNode);
            panNode.connect(this.sfxGain);
            
            source.start();
            return source;
        } catch (error) {
            console.error('Error playing sound:', error);
            return null;
        }
    }
    
    playHTML5Sound(audio, volume) {
        try {
            const audioClone = audio.cloneNode();
            audioClone.volume = volume * this.sfxVolume * this.masterVolume;
            audioClone.play();
            return audioClone;
        } catch (error) {
            console.error('Error playing HTML5 sound:', error);
            return null;
        }
    }
    
    // Music playback
    playMusic(name, fadeIn = true, fadeTime = 1000) {
        if (this.currentMusic === name) return;
        
        const music = this.music.get(name);
        if (!music) {
            console.warn(`Music not found: ${name}`);
            return;
        }
        
        // Stop current music
        this.stopMusic(fadeIn, fadeTime / 2);
        
        // Start new music
        setTimeout(() => {
            this.currentMusic = name;
            
            if (this.audioContext) {
                this.playWebAudioMusic(music, fadeIn, fadeTime);
            } else {
                this.playHTML5Music(music, fadeIn, fadeTime);
            }
        }, fadeIn ? fadeTime / 2 : 0);
    }
    
    playWebAudioMusic(audioBuffer, fadeIn, fadeTime) {
        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.loop = true;
            
            source.connect(this.musicGain);
            
            if (fadeIn) {
                this.musicGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                this.musicGain.gain.linearRampToValueAtTime(
                    this.musicVolume, 
                    this.audioContext.currentTime + fadeTime / 1000
                );
            }
            
            source.start();
            this.currentMusicSource = source;
        } catch (error) {
            console.error('Error playing music:', error);
        }
    }
    
    playHTML5Music(audio, fadeIn, fadeTime) {
        try {
            audio.volume = fadeIn ? 0 : this.musicVolume * this.masterVolume;
            audio.play();
            
            if (fadeIn) {
                this.fadeHTML5Audio(audio, this.musicVolume * this.masterVolume, fadeTime);
            }
            
            this.currentMusicSource = audio;
        } catch (error) {
            console.error('Error playing HTML5 music:', error);
        }
    }
    
    stopMusic(fadeOut = true, fadeTime = 1000) {
        if (!this.currentMusicSource) return;
        
        if (fadeOut) {
            if (this.audioContext) {
                this.musicGain.gain.linearRampToValueAtTime(
                    0, 
                    this.audioContext.currentTime + fadeTime / 1000
                );
                setTimeout(() => {
                    if (this.currentMusicSource) {
                        this.currentMusicSource.stop();
                        this.currentMusicSource = null;
                        this.currentMusic = null;
                    }
                }, fadeTime);
            } else {
                this.fadeHTML5Audio(this.currentMusicSource, 0, fadeTime, () => {
                    this.currentMusicSource.pause();
                    this.currentMusicSource = null;
                    this.currentMusic = null;
                });
            }
        } else {
            if (this.audioContext) {
                this.currentMusicSource.stop();
            } else {
                this.currentMusicSource.pause();
            }
            this.currentMusicSource = null;
            this.currentMusic = null;
        }
    }
    
    // Ambient sound playback
    playAmbientSound(name, volume = 1.0, fadeIn = true, fadeTime = 2000) {
        const sound = this.ambientSounds.get(name);
        if (!sound) {
            console.warn(`Ambient sound not found: ${name}`);
            return;
        }
        
        // Stop if already playing
        this.stopAmbientSound(name);
        
        if (this.audioContext) {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = sound;
            source.loop = true;
            
            gainNode.gain.value = fadeIn ? 0 : volume;
            
            source.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            if (fadeIn) {
                gainNode.gain.linearRampToValueAtTime(
                    volume,
                    this.audioContext.currentTime + fadeTime / 1000
                );
            }
            
            source.start();
            this.ambientSources.set(name, { source, gainNode });
        } else {
            const audio = sound.cloneNode();
            audio.volume = fadeIn ? 0 : volume * this.sfxVolume * this.masterVolume;
            audio.play();
            
            if (fadeIn) {
                this.fadeHTML5Audio(audio, volume * this.sfxVolume * this.masterVolume, fadeTime);
            }
            
            this.ambientSources.set(name, audio);
        }
    }
    
    stopAmbientSound(name, fadeOut = true, fadeTime = 2000) {
        const ambientSource = this.ambientSources.get(name);
        if (!ambientSource) return;
        
        if (this.audioContext) {
            const { source, gainNode } = ambientSource;
            
            if (fadeOut) {
                gainNode.gain.linearRampToValueAtTime(
                    0,
                    this.audioContext.currentTime + fadeTime / 1000
                );
                setTimeout(() => {
                    source.stop();
                    this.ambientSources.delete(name);
                }, fadeTime);
            } else {
                source.stop();
                this.ambientSources.delete(name);
            }
        } else {
            if (fadeOut) {
                this.fadeHTML5Audio(ambientSource, 0, fadeTime, () => {
                    ambientSource.pause();
                    this.ambientSources.delete(name);
                });
            } else {
                ambientSource.pause();
                this.ambientSources.delete(name);
            }
        }
    }
    
    stopAmbientSounds() {
        for (const name of this.ambientSources.keys()) {
            this.stopAmbientSound(name);
        }
    }
    
    // HTML5 Audio fade utility
    fadeHTML5Audio(audio, targetVolume, duration, callback = null) {
        const startVolume = audio.volume;
        const volumeChange = targetVolume - startVolume;
        const steps = 60; // 60 steps for smooth fade
        const stepTime = duration / steps;
        const stepVolume = volumeChange / steps;
        
        let currentStep = 0;
        const fadeInterval = setInterval(() => {
            currentStep++;
            audio.volume = startVolume + (stepVolume * currentStep);
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                audio.volume = targetVolume;
                if (callback) callback();
            }
        }, stepTime);
    }
    
    // Volume control
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }
    
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }
    
    updateVolumes() {
        if (this.audioContext) {
            this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
            this.musicGain.gain.value = this.musicVolume;
            this.sfxGain.gain.value = this.sfxVolume;
        }
        
        // Update HTML5 audio volumes
        if (this.currentMusicSource && !this.audioContext) {
            this.currentMusicSource.volume = this.musicVolume * this.masterVolume;
        }
        
        for (const [name, source] of this.ambientSources) {
            if (!this.audioContext) {
                source.volume = this.sfxVolume * this.masterVolume;
            }
        }
    }
    
    // Mute control
    setMuted(muted) {
        this.muted = muted;
        this.updateVolumes();
    }
    
    toggleMute() {
        this.setMuted(!this.muted);
    }
    
    // Pause/Resume (for game pause)
    pauseAll() {
        if (this.audioContext) {
            this.audioContext.suspend();
        } else {
            if (this.currentMusicSource) {
                this.currentMusicSource.pause();
            }
            for (const source of this.ambientSources.values()) {
                source.pause();
            }
        }
    }
    
    resumeAll() {
        if (this.audioContext) {
            this.audioContext.resume();
        } else {
            if (this.currentMusicSource) {
                this.currentMusicSource.play();
            }
            for (const source of this.ambientSources.values()) {
                source.play();
            }
        }
    }
    
    // Update method (called each frame)
    update(deltaTime) {
        // Update any time-based audio effects
        // Could be used for audio scheduling, 3D audio positioning, etc.
    }
    
    // 3D Audio positioning (for future use)
    setListenerPosition(x, y, z = 0) {
        if (this.audioContext && this.audioContext.listener) {
            this.audioContext.listener.setPosition(x, y, z);
        }
    }
    
    // Utility methods
    isPlaying(name) {
        return this.ambientSources.has(name) || this.currentMusic === name;
    }
    
    getCurrentMusic() {
        return this.currentMusic;
    }
    
    getVolume() {
        return {
            master: this.masterVolume,
            music: this.musicVolume,
            sfx: this.sfxVolume
        };
    }
    
    // Cleanup
    destroy() {
        this.stopMusic(false);
        this.stopAmbientSounds();
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.sounds.clear();
        this.music.clear();
        this.ambientSounds.clear();
        this.ambientSources.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
}
