/**
 * Player - Main player character with comprehensive power-up system for Echo Genesis
 * Handles all player abilities, movement, and interactions
 */
class Player extends GameObject {
    constructor(x, y) {
        super(x, y, 24, 32);
        
        // Player properties
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.lives = 3;
        this.score = 0;
        
        // Movement properties
        this.baseSpeed = 200;
        this.currentSpeed = this.baseSpeed;
        this.jumpForce = 400;
        this.coyoteTime = 0.1; // seconds
        this.jumpBufferTime = 0.1; // seconds
        
        // State tracking
        this.isGrounded = false;
        this.isOnWall = false;
        this.isCrouching = false;
        this.facingDirection = 1; // 1 = right, -1 = left
        this.lastGroundedTime = 0;
        this.jumpBufferTimer = 0;
        
        // Power-up system
        this.abilities = new Map();
        this.setupDefaultAbilities();
        
        // Input handling
        this.inputBuffer = [];
        this.inputBufferSize = 10;
        
        // Animation states
        this.currentState = 'idle';
        this.previousState = 'idle';
        this.stateTime = 0;
        
        // Effects and timers
        this.invulnerabilityTime = 0;
        this.invulnerabilityDuration = 1.0;
        this.flashTimer = 0;
        
        // Sound effects
        this.sounds = new Map();
        
        // Player color and visual effects
        this.color = '#4a90e2';
        this.baseColor = this.color;
        
        // Tags
        this.addTag('player');
        this.collisionLayers = ['player'];
        this.collisionMask = ['solid', 'platform', 'enemy', 'pickup', 'hazard'];
        
        // Setup animations
        this.setupAnimations();
        
        // Physics properties
        this.mass = 1;
        this.friction = 0.15;
        this.bounciness = 0;
        this.gravityScale = 1;
    }
    
    setupDefaultAbilities() {
        // Basic movement abilities
        this.addAbility('move', { enabled: true, level: 1 });
        this.addAbility('jump', { enabled: true, level: 1, cooldown: 0 });
        
        // Advanced movement abilities (locked by default)
        this.addAbility('doubleJump', { enabled: false, level: 0, maxJumps: 2, currentJumps: 0 });
        this.addAbility('tripleJump', { enabled: false, level: 0, maxJumps: 3, currentJumps: 0 });
        this.addAbility('dash', { enabled: false, level: 0, cooldown: 0, distance: 150, duration: 0.2 });
        this.addAbility('wallSlide', { enabled: false, level: 0, slideSpeed: 100 });
        this.addAbility('wallJump', { enabled: false, level: 0, force: 350, angle: Math.PI / 4 });
        this.addAbility('wallClimb', { enabled: false, level: 0, speed: 100 });
        this.addAbility('glide', { enabled: false, level: 0, fallSpeed: 50, active: false });
        
        // Combat abilities
        this.addAbility('attack', { enabled: false, level: 0, damage: 25, range: 40, cooldown: 0 });
        this.addAbility('rangedAttack', { enabled: false, level: 0, damage: 15, cooldown: 0 });
        
        // Special abilities
        this.addAbility('noFallDamage', { enabled: false, level: 0 });
        this.addAbility('swim', { enabled: false, level: 0, speed: 120 });
        this.addAbility('phaseThrough', { enabled: false, level: 0, duration: 2.0, cooldown: 0 });
        this.addAbility('magnetism', { enabled: false, level: 0, range: 100 });
        this.addAbility('timeFreeze', { enabled: false, level: 0, duration: 3.0, cooldown: 0 });
        this.addAbility('invisibility', { enabled: false, level: 0, duration: 5.0, cooldown: 0 });
        this.addAbility('shield', { enabled: false, level: 0, duration: 10.0, cooldown: 0 });
        this.addAbility('speedBoost', { enabled: false, level: 0, multiplier: 2.0, duration: 5.0, cooldown: 0 });
        this.addAbility('highJump', { enabled: false, level: 0, multiplier: 1.5 });
        this.addAbility('lightSource', { enabled: false, level: 0, radius: 150 });
    }
    
    addAbility(name, properties) {
        this.abilities.set(name, {
            name: name,
            enabled: properties.enabled || false,
            level: properties.level || 0,
            cooldown: 0,
            maxCooldown: properties.cooldown || 0,
            ...properties
        });
    }
    
    unlockAbility(name, level = 1) {
        const ability = this.abilities.get(name);
        if (ability) {
            ability.enabled = true;
            ability.level = level;
            
            // Show unlock notification
            this.showAbilityUnlocked(name);
            
            // Play unlock sound
            this.playSound('abilityUnlock');
        }
    }
    
    upgradeAbility(name, level) {
        const ability = this.abilities.get(name);
        if (ability && ability.enabled) {
            ability.level = level;
            this.showAbilityUpgraded(name, level);
        }
    }
    
    hasAbility(name) {
        const ability = this.abilities.get(name);
        return ability && ability.enabled;
    }
    
    getAbilityLevel(name) {
        const ability = this.abilities.get(name);
        return ability ? ability.level : 0;
    }
    
    isAbilityCoolingDown(name) {
        const ability = this.abilities.get(name);
        return ability && ability.cooldown > 0;
    }
    
    startAbilityCooldown(name) {
        const ability = this.abilities.get(name);
        if (ability) {
            ability.cooldown = ability.maxCooldown;
        }
    }
    
    setupAnimations() {
        // Define animation frames (would be loaded from sprite sheet)
        this.addAnimation('idle', [
            { x: 0, y: 0, width: 24, height: 32 }
        ], true);
        
        this.addAnimation('walk', [
            { x: 24, y: 0, width: 24, height: 32 },
            { x: 48, y: 0, width: 24, height: 32 },
            { x: 72, y: 0, width: 24, height: 32 },
            { x: 96, y: 0, width: 24, height: 32 }
        ], true);
        
        this.addAnimation('jump', [
            { x: 120, y: 0, width: 24, height: 32 }
        ], false);
        
        this.addAnimation('fall', [
            { x: 144, y: 0, width: 24, height: 32 }
        ], false);
        
        this.addAnimation('wallSlide', [
            { x: 168, y: 0, width: 24, height: 32 }
        ], false);
        
        this.addAnimation('attack', [
            { x: 192, y: 0, width: 24, height: 32 },
            { x: 216, y: 0, width: 24, height: 32 },
            { x: 240, y: 0, width: 24, height: 32 }
        ], false);
        
        this.addAnimation('dash', [
            { x: 264, y: 0, width: 24, height: 32 }
        ], false);
        
        this.addAnimation('crouch', [
            { x: 288, y: 0, width: 24, height: 24 }
        ], false);
        
        this.playAnimation('idle');
    }
    
    onUpdate(deltaTime) {
        // Update ability cooldowns
        this.updateAbilityCooldowns(deltaTime);
        
        // Update timers
        this.updateTimers(deltaTime);
        
        // Handle input
        this.handleInput(deltaTime);
        
        // Update physics state
        this.updatePhysicsState();
        
        // Update animation state
        this.updateAnimationState(deltaTime);
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Check for hazards and damage
        this.checkHazards();
    }
    
    updateAbilityCooldowns(deltaTime) {
        for (const ability of this.abilities.values()) {
            if (ability.cooldown > 0) {
                ability.cooldown -= deltaTime;
                if (ability.cooldown <= 0) {
                    ability.cooldown = 0;
                }
            }
        }
    }
    
    updateTimers(deltaTime) {
        // Invulnerability timer
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime -= deltaTime;
            this.flashTimer += deltaTime;
        }
        
        // Coyote time
        if (!this.isGrounded) {
            this.lastGroundedTime += deltaTime;
        }
        
        // Jump buffer
        if (this.jumpBufferTimer > 0) {
            this.jumpBufferTimer -= deltaTime;
        }
        
        // State time
        this.stateTime += deltaTime;
    }
    
    handleInput(deltaTime) {
        if (!window.game || !window.game.inputManager) return;
        
        const input = window.game.inputManager;
        
        // Movement
        this.handleMovementInput(input, deltaTime);
        
        // Jumping
        this.handleJumpInput(input, deltaTime);
        
        // Special abilities
        this.handleAbilityInput(input, deltaTime);
    }
    
    handleMovementInput(input, deltaTime) {
        const moveInput = input.getMovementAxis('horizontal');
        
        // Handle crouching
        if (input.isActionPressed('moveDown') && this.isGrounded) {
            this.isCrouching = true;
            this.size.y = 24; // Make player shorter
        } else {
            this.isCrouching = false;
            this.size.y = 32; // Normal height
        }
        
        // Handle horizontal movement
        if (Math.abs(moveInput) > 0.1) {
            this.facingDirection = Math.sign(moveInput);
            
            // Calculate movement speed with abilities
            let speed = this.baseSpeed;
            
            // Speed boost ability
            if (this.hasAbility('speedBoost') && this.abilities.get('speedBoost').active) {
                speed *= this.abilities.get('speedBoost').multiplier;
            }
            
            // Apply movement
            if (!this.isCrouching) {
                this.velocity.x = moveInput * speed;
            } else {
                this.velocity.x = moveInput * speed * 0.5; // Slower when crouching
            }
            
            this.scale.x = this.facingDirection; // Flip sprite
        } else {
            // Apply friction when not moving
            this.velocity.x *= this.friction;
        }
        
        // Wall slide
        if (this.hasAbility('wallSlide') && this.isOnWall && !this.isGrounded && this.velocity.y > 0) {
            const slideSpeed = this.abilities.get('wallSlide').slideSpeed;
            this.velocity.y = Math.min(this.velocity.y, slideSpeed);
        }
        
        // Wall climb
        if (this.hasAbility('wallClimb') && this.isOnWall && input.isActionPressed('moveUp')) {
            const climbSpeed = this.abilities.get('wallClimb').speed;
            this.velocity.y = -climbSpeed;
        }
        
        // Glide
        if (this.hasAbility('glide') && input.isActionPressed('jump') && !this.isGrounded && this.velocity.y > 0) {
            const glideAbility = this.abilities.get('glide');
            glideAbility.active = true;
            this.velocity.y = glideAbility.fallSpeed;
            this.gravityScale = 0.2; // Reduced gravity while gliding
        } else if (this.hasAbility('glide')) {
            this.abilities.get('glide').active = false;
            this.gravityScale = 1; // Normal gravity
        }
    }
    
    handleJumpInput(input, deltaTime) {
        const jumpPressed = input.isActionDown('jump');
        const jumpHeld = input.isActionPressed('jump');
        
        // Jump buffer
        if (jumpPressed) {
            this.jumpBufferTimer = this.jumpBufferTime;
        }
        
        // Ground jump
        if (this.jumpBufferTimer > 0 && (this.isGrounded || this.lastGroundedTime < this.coyoteTime)) {
            this.performJump();
            this.jumpBufferTimer = 0;
            this.lastGroundedTime = this.coyoteTime;
        }
        // Wall jump
        else if (jumpPressed && this.hasAbility('wallJump') && this.isOnWall && !this.isGrounded) {
            this.performWallJump();
        }
        // Multi-jump (double/triple jump)
        else if (jumpPressed && !this.isGrounded && this.canMultiJump()) {
            this.performMultiJump();
        }
        
        // Variable jump height
        if (!jumpHeld && this.velocity.y < 0) {
            this.velocity.y *= 0.6; // Cut jump short
        }
    }
    
    handleAbilityInput(input, deltaTime) {
        // Dash
        if (input.isActionDown('dash') && this.hasAbility('dash') && !this.isAbilityCoolingDown('dash')) {
            this.performDash();
        }
        
        // Attack
        if (input.isActionDown('attack') && this.hasAbility('attack') && !this.isAbilityCoolingDown('attack')) {
            this.performAttack();
        }
        
        // Special action (context-sensitive)
        if (input.isActionDown('special')) {
            this.performSpecialAction();
        }
    }
    
    performJump() {
        let jumpForce = this.jumpForce;
        
        // High jump ability
        if (this.hasAbility('highJump')) {
            jumpForce *= this.abilities.get('highJump').multiplier;
        }
        
        this.velocity.y = -jumpForce;
        this.isGrounded = false;
        
        // Reset multi-jump counter
        if (this.hasAbility('doubleJump')) {
            this.abilities.get('doubleJump').currentJumps = 1;
        }
        if (this.hasAbility('tripleJump')) {
            this.abilities.get('tripleJump').currentJumps = 1;
        }
        
        this.playSound('jump');
    }
    
    performWallJump() {
        const wallJumpAbility = this.abilities.get('wallJump');
        const force = wallJumpAbility.force;
        const angle = wallJumpAbility.angle;
        
        // Jump away from wall
        this.velocity.x = -this.facingDirection * force * Math.cos(angle);
        this.velocity.y = -force * Math.sin(angle);
        
        this.playSound('wallJump');
    }
    
    canMultiJump() {
        if (this.hasAbility('tripleJump')) {
            const ability = this.abilities.get('tripleJump');
            return ability.currentJumps < ability.maxJumps;
        } else if (this.hasAbility('doubleJump')) {
            const ability = this.abilities.get('doubleJump');
            return ability.currentJumps < ability.maxJumps;
        }
        return false;
    }
    
    performMultiJump() {
        let jumpForce = this.jumpForce * 0.8; // Slightly weaker than ground jump
        
        // High jump ability
        if (this.hasAbility('highJump')) {
            jumpForce *= this.abilities.get('highJump').multiplier;
        }
        
        this.velocity.y = -jumpForce;
        
        // Increment jump counter
        if (this.hasAbility('tripleJump')) {
            this.abilities.get('tripleJump').currentJumps++;
        } else if (this.hasAbility('doubleJump')) {
            this.abilities.get('doubleJump').currentJumps++;
        }
        
        this.playSound('doubleJump');
    }
    
    performDash() {
        const dashAbility = this.abilities.get('dash');
        const dashDirection = new Vector2(this.facingDirection, 0);
        const dashVelocity = dashDirection.multiply(dashAbility.distance / dashAbility.duration);
        
        this.velocity.setFromVector(dashVelocity);
        this.gravityScale = 0; // Ignore gravity during dash
        
        // Set dash timer
        setTimeout(() => {
            this.gravityScale = 1; // Restore gravity
        }, dashAbility.duration * 1000);
        
        this.startAbilityCooldown('dash');
        this.playSound('dash');
    }
    
    performAttack() {
        const attackAbility = this.abilities.get('attack');
        
        // Create attack hitbox
        const attackPos = new Vector2(
            this.position.x + this.facingDirection * this.size.x,
            this.position.y
        );
        
        // Check for enemies in range
        if (window.game && window.game.world) {
            const enemies = window.game.world.getObjectsWithTag('enemy');
            for (const enemy of enemies) {
                const distance = attackPos.distance(enemy.getCenter());
                if (distance <= attackAbility.range) {
                    this.dealDamage(enemy, attackAbility.damage);
                }
            }
        }
        
        this.startAbilityCooldown('attack');
        this.currentState = 'attack';
        this.stateTime = 0;
        this.playSound('attack');
    }
    
    performSpecialAction() {
        // Context-sensitive actions
        // This could be interacting with objects, using power-ups, etc.
    }
    
    updatePhysicsState() {
        // Check if grounded (would be set by physics system)
        // This is a simplified check
        this.isGrounded = Math.abs(this.velocity.y) < 1;
        
        if (this.isGrounded) {
            this.lastGroundedTime = 0;
            
            // Reset multi-jump
            if (this.hasAbility('doubleJump')) {
                this.abilities.get('doubleJump').currentJumps = 0;
            }
            if (this.hasAbility('tripleJump')) {
                this.abilities.get('tripleJump').currentJumps = 0;
            }
        }
        
        // Check if on wall (would be set by physics system)
        this.isOnWall = false; // Simplified
    }
    
    updateAnimationState(deltaTime) {
        this.previousState = this.currentState;
        
        // Determine current state
        if (this.currentState === 'attack' && this.stateTime < 0.3) {
            // Stay in attack state
        } else if (!this.isGrounded) {
            if (this.velocity.y < 0) {
                this.currentState = 'jump';
            } else if (this.hasAbility('wallSlide') && this.isOnWall) {
                this.currentState = 'wallSlide';
            } else {
                this.currentState = 'fall';
            }
        } else if (this.isCrouching) {
            this.currentState = 'crouch';
        } else if (Math.abs(this.velocity.x) > 10) {
            this.currentState = 'walk';
        } else {
            this.currentState = 'idle';
        }
        
        // Change animation if state changed
        if (this.currentState !== this.previousState) {
            this.playAnimation(this.currentState);
            this.stateTime = 0;
        }
    }
    
    updateVisualEffects(deltaTime) {
        // Invulnerability flashing
        if (this.invulnerabilityTime > 0) {
            this.opacity = Math.sin(this.flashTimer * 20) > 0 ? 1 : 0.3;
        } else {
            this.opacity = 1;
        }
        
        // Ability visual effects
        if (this.hasAbility('invisibility') && this.abilities.get('invisibility').active) {
            this.opacity = 0.3;
        }
        
        if (this.hasAbility('shield') && this.abilities.get('shield').active) {
            // Shield effect would be rendered separately
        }
    }
    
    checkHazards() {
        // Check for hazards (spikes, lava, etc.)
        // This would be handled by collision system
    }
    
    // Damage and health system
    takeDamage(amount, source = null) {
        if (this.invulnerabilityTime > 0) return false;
        
        // Shield ability
        if (this.hasAbility('shield') && this.abilities.get('shield').active) {
            return false; // Block damage
        }
        
        this.health -= amount;
        this.invulnerabilityTime = this.invulnerabilityDuration;
        
        // Knockback
        if (source) {
            const knockbackDirection = this.getCenter().subtract(source.getCenter()).normalized();
            this.addImpulse(knockbackDirection.multiply(200));
        }
        
        // Check for death
        if (this.health <= 0) {
            this.die();
        }
        
        this.playSound('hurt');
        return true;
    }
    
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.playSound('heal');
    }
    
    dealDamage(target, amount) {
        if (target.takeDamage) {
            const damaged = target.takeDamage(amount, this);
            if (damaged) {
                this.score += 10; // Award points for damage
            }
        }
    }
    
    die() {
        this.lives--;
        
        if (this.lives > 0) {
            this.respawn();
        } else {
            this.gameOver();
        }
        
        this.playSound('death');
    }
    
    respawn() {
        this.health = this.maxHealth;
        this.invulnerabilityTime = this.invulnerabilityDuration * 2;
        
        // Reset position to checkpoint
        if (window.game && window.game.world) {
            const checkpoint = window.game.world.getCurrentCheckpoint();
            if (checkpoint) {
                this.position.setFromVector(checkpoint.position);
            }
        }
        
        // Reset velocity
        this.velocity.set(0, 0);
    }
    
    gameOver() {
        // Trigger game over screen
        if (window.game) {
            window.game.gameOver();
        }
    }
    
    // Power-up collection
    collectPowerUp(powerUp) {
        switch (powerUp.type) {
            case 'health':
                this.heal(powerUp.value);
                break;
            case 'ability':
                this.unlockAbility(powerUp.abilityName, powerUp.level);
                break;
            case 'upgrade':
                this.upgradeAbility(powerUp.abilityName, powerUp.level);
                break;
            case 'score':
                this.score += powerUp.value;
                break;
        }
        
        this.playSound('powerUp');
    }
    
    // Sound system
    playSound(soundName) {
        if (window.game && window.game.audioManager) {
            window.game.audioManager.playSound(soundName);
        }
    }
    
    // UI notifications
    showAbilityUnlocked(abilityName) {
        if (window.game && window.game.ui) {
            window.game.ui.showNotification(`New Ability: ${abilityName}!`);
        }
    }
    
    showAbilityUpgraded(abilityName, level) {
        if (window.game && window.game.ui) {
            window.game.ui.showNotification(`${abilityName} upgraded to level ${level}!`);
        }
    }
    
    // Collision handling
    onCollision(other, collision) {
        if (other.hasTag('enemy') && !other.hasTag('friendly')) {
            this.takeDamage(other.damage || 10, other);
        } else if (other.hasTag('powerup')) {
            this.collectPowerUp(other);
            other.destroy();
        } else if (other.hasTag('checkpoint')) {
            other.activate();
        }
    }
    
    // Serialization for save system
    toJSON() {
        const data = super.toJSON();
        data.health = this.health;
        data.maxHealth = this.maxHealth;
        data.lives = this.lives;
        data.score = this.score;
        data.abilities = {};
        
        for (const [name, ability] of this.abilities) {
            data.abilities[name] = {
                enabled: ability.enabled,
                level: ability.level
            };
        }
        
        return data;
    }
    
    static fromJSON(data) {
        const player = new Player(data.position.x, data.position.y);
        player.health = data.health;
        player.maxHealth = data.maxHealth;
        player.lives = data.lives;
        player.score = data.score;
        
        // Restore abilities
        for (const [name, abilityData] of Object.entries(data.abilities)) {
            if (player.abilities.has(name)) {
                const ability = player.abilities.get(name);
                ability.enabled = abilityData.enabled;
                ability.level = abilityData.level;
            }
        }
        
        return player;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Player;
}
