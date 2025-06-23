/**
 * PowerUp - Collectible power-ups that grant abilities to the player
 */
class PowerUp extends GameObject {
    constructor(x, y, powerType) {
        super(x, y, 24, 24);
        
        this.powerType = powerType;
        this.collected = false;
        this.value = 1;
        this.level = 1;
        
        // Visual properties
        this.color = this.getPowerColor();
        this.pulseTimer = 0;
        this.originalScale = this.scale.copy();
        
        // Physics
        this.solid = false;
        this.isTrigger = true;
        this.gravityScale = 0;
        
        // Tags
        this.addTag('powerup');
        this.addTag('collectible');
        
        // Collision
        this.collisionLayers = ['pickup'];
        this.collisionMask = ['player'];
        
        // Sound
        this.collectSound = 'powerUp';
        
        // Animation
        this.setupPowerUpProperties();
    }
    
    setupPowerUpProperties() {
        switch (this.powerType) {
            case 'health':
                this.color = '#ff4444';
                this.value = 25;
                break;
            case 'doubleJump':
                this.color = '#44ff44';
                this.abilityName = 'doubleJump';
                break;
            case 'dash':
                this.color = '#4444ff';
                this.abilityName = 'dash';
                break;
            case 'wallJump':
                this.color = '#ff44ff';
                this.abilityName = 'wallJump';
                break;
            case 'attack':
                this.color = '#ffaa44';
                this.abilityName = 'attack';
                break;
            case 'shield':
                this.color = '#44aaff';
                this.abilityName = 'shield';
                break;
            default:
                this.color = '#ffffff';
        }
    }
    
    getPowerColor() {
        const colors = {
            health: '#ff4444',
            doubleJump: '#44ff44',
            dash: '#4444ff',
            wallJump: '#ff44ff',
            attack: '#ffaa44',
            shield: '#44aaff'
        };
        return colors[this.powerType] || '#ffffff';
    }
    
    onUpdate(deltaTime) {
        // Floating animation
        this.pulseTimer += deltaTime * 3;
        this.position.y += Math.sin(this.pulseTimer) * 0.5;
        
        // Scaling animation  
        const pulse = 1 + Math.sin(this.pulseTimer * 2) * 0.1;
        this.scale.set(pulse, pulse);
        
        // Rotation
        this.rotation += deltaTime * 2;
    }
    
    onTriggerEnter(other) {
        if (other.hasTag('player') && !this.collected) {
            this.collect(other);
        }
    }
    
    collect(player) {
        this.collected = true;
        
        switch (this.powerType) {
            case 'health':
                player.heal(this.value);
                break;
            case 'score':
                player.score += this.value;
                break;
            default:
                if (this.abilityName) {
                    player.unlockAbility(this.abilityName, this.level);
                }
        }
        
        // Visual effect
        this.createCollectionEffect();
        
        // Audio
        if (window.game && window.game.audioManager) {
            window.game.audioManager.playSound(this.collectSound);
        }
        
        this.destroy();
    }
    
    createCollectionEffect() {
        // Create particles or visual effect
        if (window.game && window.game.world) {
            window.game.world.createExplosion(this.getCenter(), 'small');
        }
    }
}

/**
 * Enemy - Base class for all enemies
 */
class Enemy extends GameObject {
    constructor(x, y, enemyType = 'basic') {
        super(x, y, 32, 32);
        
        this.enemyType = enemyType;
        this.health = 50;
        this.maxHealth = 50;
        this.damage = 10;
        this.speed = 100;
        this.attackRange = 40;
        this.sightRange = 200;
        
        // AI state
        this.aiState = 'patrol';
        this.target = null;
        this.lastSeenTarget = null;
        this.stateTimer = 0;
        
        // Movement
        this.direction = 1;
        this.patrolDistance = 100;
        this.startPosition = new Vector2(x, y);
        
        // Combat
        this.attackCooldown = 0;
        this.maxAttackCooldown = 1.0;
        
        // Visual
        this.color = '#ff6666';
        
        // Physics
        this.mass = 2;
        this.friction = 0.3;
        
        // Tags
        this.addTag('enemy');
        this.collisionLayers = ['enemy'];
        this.collisionMask = ['solid', 'platform', 'player', 'projectile'];
        
        this.setupEnemyType();
    }
    
    setupEnemyType() {
        switch (this.enemyType) {
            case 'basic':
                // Default values
                break;
            case 'fast':
                this.speed = 150;
                this.health = 30;
                this.color = '#ffff66';
                break;
            case 'heavy':
                this.speed = 50;
                this.health = 100;
                this.damage = 20;
                this.mass = 4;
                this.color = '#666666';
                break;
            case 'flying':
                this.gravityScale = 0;
                this.speed = 80;
                this.health = 40;
                this.color = '#66ffff';
                break;
        }
    }
    
    onUpdate(deltaTime) {
        this.updateAI(deltaTime);
        this.updateCombat(deltaTime);
        this.updateMovement(deltaTime);
        this.updateAnimation(deltaTime);
    }
    
    updateAI(deltaTime) {
        this.stateTimer += deltaTime;
        
        // Find player
        if (window.game && window.game.world) {
            const player = window.game.world.getPlayer();
            if (player) {
                const distance = this.distanceTo(player);
                
                if (distance <= this.sightRange && this.canSeeTarget(player)) {
                    this.target = player;
                    this.lastSeenTarget = player.getCenter().copy();
                    
                    if (distance <= this.attackRange) {
                        this.aiState = 'attack';
                    } else {
                        this.aiState = 'chase';
                    }
                } else if (this.aiState === 'chase' && this.lastSeenTarget) {
                    this.aiState = 'investigate';
                } else if (this.aiState !== 'patrol') {
                    this.aiState = 'patrol';
                    this.stateTimer = 0;
                }
            }
        }
        
        // State-specific behavior
        switch (this.aiState) {
            case 'patrol':
                this.updatePatrol(deltaTime);
                break;
            case 'chase':
                this.updateChase(deltaTime);
                break;
            case 'attack':
                this.updateAttack(deltaTime);
                break;
            case 'investigate':
                this.updateInvestigate(deltaTime);
                break;
        }
    }
    
    updatePatrol(deltaTime) {
        const distanceFromStart = Math.abs(this.position.x - this.startPosition.x);
        
        if (distanceFromStart >= this.patrolDistance || this.stateTimer > 3) {
            this.direction *= -1;
            this.stateTimer = 0;
        }
        
        this.velocity.x = this.direction * this.speed * 0.5;
    }
    
    updateChase(deltaTime) {
        if (this.target) {
            const targetDirection = this.directionTo(this.target);
            this.velocity.x = targetDirection.x * this.speed;
            
            if (this.enemyType === 'flying') {
                this.velocity.y = targetDirection.y * this.speed;
            }
        }
    }
    
    updateAttack(deltaTime) {
        this.velocity.x *= 0.5; // Slow down when attacking
        
        if (this.attackCooldown <= 0) {
            this.performAttack();
            this.attackCooldown = this.maxAttackCooldown;
        }
    }
    
    updateInvestigate(deltaTime) {
        if (this.lastSeenTarget) {
            const direction = this.lastSeenTarget.subtract(this.getCenter()).normalized();
            this.velocity.x = direction.x * this.speed * 0.7;
            
            if (this.getCenter().distance(this.lastSeenTarget) < 20) {
                this.aiState = 'patrol';
                this.lastSeenTarget = null;
            }
        }
    }
    
    updateCombat(deltaTime) {
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
    }
    
    updateMovement(deltaTime) {
        // Face movement direction
        if (Math.abs(this.velocity.x) > 10) {
            this.facingDirection = Math.sign(this.velocity.x);
            this.scale.x = this.facingDirection;
        }
    }
    
    updateAnimation(deltaTime) {
        // Simple animation state management
        if (Math.abs(this.velocity.x) > 10) {
            this.currentState = 'walk';
        } else if (this.aiState === 'attack') {
            this.currentState = 'attack';
        } else {
            this.currentState = 'idle';
        }
    }
    
    canSeeTarget(target) {
        // Simple line-of-sight check
        if (!window.game || !window.game.physics) return true;
        
        const direction = target.getCenter().subtract(this.getCenter()).normalized();
        const distance = this.distanceTo(target);
        
        const hits = window.game.physics.raycast(
            this.getCenter(), 
            direction, 
            distance, 
            ['solid']
        );
        
        return hits.length === 0;
    }
    
    performAttack() {
        if (!this.target) return;
        
        const distance = this.distanceTo(this.target);
        if (distance <= this.attackRange) {
            // Deal damage to target
            if (this.target.takeDamage) {
                this.target.takeDamage(this.damage, this);
            }
            
            // Create attack effect
            this.createAttackEffect();
            
            // Play sound
            if (window.game && window.game.audioManager) {
                window.game.audioManager.playSound('enemyAttack');
            }
        }
    }
    
    createAttackEffect() {
        // Visual attack effect
        if (window.game && window.game.world) {
            const effectPos = this.target ? 
                this.getCenter().lerp(this.target.getCenter(), 0.5) : 
                this.getCenter();
            window.game.world.createExplosion(effectPos, 'small');
        }
    }
    
    takeDamage(amount, source) {
        this.health -= amount;
        
        // Knockback
        if (source) {
            const knockback = this.getCenter().subtract(source.getCenter()).normalized();
            this.addImpulse(knockback.multiply(150));
        }
        
        // Flash effect
        this.color = '#ffffff';
        setTimeout(() => {
            this.color = this.enemyType === 'basic' ? '#ff6666' : 
                        this.enemyType === 'fast' ? '#ffff66' :
                        this.enemyType === 'heavy' ? '#666666' : '#66ffff';
        }, 100);
        
        if (this.health <= 0) {
            this.die();
        }
        
        return true;
    }
    
    die() {
        // Drop items occasionally
        if (Math.random() < 0.3) {
            this.dropItem();
        }
        
        // Death effect
        if (window.game && window.game.world) {
            window.game.world.createExplosion(this.getCenter(), 'medium');
        }
        
        // Award score to player
        if (window.game && window.game.world) {
            const player = window.game.world.getPlayer();
            if (player) {
                player.score += 50;
            }
        }
        
        this.destroy();
    }
    
    dropItem() {
        if (!window.game || !window.game.world) return;
        
        const items = ['health', 'score'];
        const randomItem = items[Math.floor(Math.random() * items.length)];
        
        const powerUp = new PowerUp(this.position.x, this.position.y, randomItem);
        if (randomItem === 'score') {
            powerUp.value = 100;
        }
        
        window.game.world.addObject(powerUp);
    }
    
    onCollision(other, collision) {
        if (other.hasTag('player')) {
            // Deal contact damage
            other.takeDamage(this.damage * 0.5, this);
        }
    }
}

/**
 * Platform - Moving and static platforms
 */
class Platform extends GameObject {
    constructor(x, y, width, height, platformType = 'solid') {
        super(x, y, width, height);
        
        this.platformType = platformType;
        this.color = '#8B4513';
        
        // Platform properties
        this.solid = platformType === 'solid';
        this.gravityScale = 0;
        
        // Movement (for moving platforms)
        this.movementType = 'none';
        this.movementSpeed = 50;
        this.movementDistance = 100;
        this.movementDirection = new Vector2(1, 0);
        this.startPosition = new Vector2(x, y);
        this.movementTimer = 0;
        
        // Tags
        this.addTag('platform');
        if (platformType === 'solid') {
            this.addTag('solid');
            this.collisionLayers = ['solid'];
        } else {
            this.addTag('jumpthrough');
            this.collisionLayers = ['platform'];
        }
        
        this.setupPlatformType();
    }
    
    setupPlatformType() {
        switch (this.platformType) {
            case 'solid':
                this.color = '#8B4513';
                break;
            case 'jumpthrough':
                this.color = '#DEB887';
                break;
            case 'ice':
                this.color = '#87CEEB';
                this.friction = 0.05; // Very slippery
                break;
            case 'bouncy':
                this.color = '#FFB6C1';
                this.bounciness = 1.2;
                break;
            case 'fragile':
                this.color = '#CD853F';
                this.health = 1;
                break;
        }
    }
    
    onUpdate(deltaTime) {
        if (this.movementType !== 'none') {
            this.updateMovement(deltaTime);
        }
    }
    
    updateMovement(deltaTime) {
        this.movementTimer += deltaTime;
        
        switch (this.movementType) {
            case 'horizontal':
                this.updateHorizontalMovement(deltaTime);
                break;
            case 'vertical':
                this.updateVerticalMovement(deltaTime);
                break;
            case 'circular':
                this.updateCircularMovement(deltaTime);
                break;
            case 'pendulum':
                this.updatePendulumMovement(deltaTime);
                break;
        }
    }
    
    updateHorizontalMovement(deltaTime) {
        const offset = Math.sin(this.movementTimer * this.movementSpeed / 50) * this.movementDistance;
        this.position.x = this.startPosition.x + offset;
    }
    
    updateVerticalMovement(deltaTime) {
        const offset = Math.sin(this.movementTimer * this.movementSpeed / 50) * this.movementDistance;
        this.position.y = this.startPosition.y + offset;
    }
    
    updateCircularMovement(deltaTime) {
        const angle = this.movementTimer * this.movementSpeed / 50;
        this.position.x = this.startPosition.x + Math.cos(angle) * this.movementDistance;
        this.position.y = this.startPosition.y + Math.sin(angle) * this.movementDistance;
    }
    
    updatePendulumMovement(deltaTime) {
        const angle = Math.sin(this.movementTimer * this.movementSpeed / 50) * Math.PI / 4;
        this.position.x = this.startPosition.x + Math.sin(angle) * this.movementDistance;
        this.position.y = this.startPosition.y + Math.cos(angle) * this.movementDistance;
    }
    
    setMovement(type, speed = 50, distance = 100) {
        this.movementType = type;
        this.movementSpeed = speed;
        this.movementDistance = distance;
        this.movementTimer = 0;
    }
    
    onCollision(other, collision) {
        if (this.platformType === 'fragile' && other.hasTag('player')) {
            this.health--;
            if (this.health <= 0) {
                this.crumble();
            }
        }
    }
    
    crumble() {
        // Create crumble effect
        if (window.game && window.game.world) {
            window.game.world.createExplosion(this.getCenter(), 'medium');
        }
        
        // Remove after delay
        setTimeout(() => this.destroy(), 500);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PowerUp, Enemy, Platform };
}
