/**
 * Additional Game Entities
 * Projectile, Checkpoint, and specialized enemy classes
 */

import { GameObject } from '../core/GameObject.js';
import { Vector2 } from '../utils/Vector2.js';

/**
 * Projectile class for bullets, fireballs, arrows, etc.
 */
export class Projectile extends GameObject {
    constructor(x, y, config = {}) {
        super(x, y, config.width || 8, config.height || 8);
        
        this.type = 'projectile';
        this.projectileType = config.projectileType || 'bullet';
        this.velocity = new Vector2(config.velocityX || 0, config.velocityY || 0);
        this.damage = config.damage || 1;
        this.range = config.range || 500;
        this.piercing = config.piercing || false;
        this.explosive = config.explosive || false;
        this.explosionRadius = config.explosionRadius || 50;
        this.owner = config.owner || null;
        this.team = config.team || 'neutral';
        
        // Visual properties
        this.color = config.color || '#ffff00';
        this.trail = config.trail || false;
        this.trailLength = config.trailLength || 10;
        this.trailPositions = [];
        
        // Physics
        this.gravity = config.gravity || 0;
        this.bounce = config.bounce || false;
        this.bounceDecay = config.bounceDecay || 0.8;
        this.maxBounces = config.maxBounces || 3;
        this.bounceCount = 0;
        
        // Lifecycle
        this.startPosition = new Vector2(x, y);
        this.lifetime = config.lifetime || 5; // seconds
        this.age = 0;
        
        // Effects
        this.homingTarget = config.homingTarget || null;
        this.homingStrength = config.homingStrength || 0;
        this.spinSpeed = config.spinSpeed || 0;
        this.rotation = 0;
    }

    update(deltaTime, world) {
        super.update(deltaTime, world);
        
        this.age += deltaTime;
        
        // Check lifetime
        if (this.age >= this.lifetime) {
            this.destroy();
            return;
        }
        
        // Check range
        const distanceTraveled = Vector2.distance(this.position, this.startPosition);
        if (distanceTraveled >= this.range) {
            if (this.explosive) {
                this.explode(world);
            }
            this.destroy();
            return;
        }
        
        // Apply homing behavior
        if (this.homingTarget && this.homingStrength > 0) {
            const targetDirection = Vector2.subtract(this.homingTarget.position, this.position).normalize();
            this.velocity = Vector2.lerp(this.velocity.normalize(), targetDirection, this.homingStrength * deltaTime).multiply(this.velocity.magnitude());
        }
        
        // Apply gravity
        if (this.gravity > 0) {
            this.velocity.y += this.gravity * deltaTime;
        }
        
        // Update rotation
        if (this.spinSpeed !== 0) {
            this.rotation += this.spinSpeed * deltaTime;
        } else {
            // Point in direction of movement
            this.rotation = Math.atan2(this.velocity.y, this.velocity.x);
        }
        
        // Store trail positions
        if (this.trail) {
            this.trailPositions.unshift({ ...this.position });
            if (this.trailPositions.length > this.trailLength) {
                this.trailPositions.pop();
            }
        }
        
        // Move
        const newPosition = Vector2.add(this.position, Vector2.multiply(this.velocity, deltaTime));
        
        // Check collisions
        this.checkCollisions(newPosition, world);
    }

    checkCollisions(newPosition, world) {
        // Check world bounds
        if (newPosition.x < 0 || newPosition.x > world.width * world.tileSize ||
            newPosition.y < 0 || newPosition.y > world.height * world.tileSize) {
            this.destroy();
            return;
        }
        
        // Check tile collisions
        const tileCollision = world.checkTileCollision({
            x: newPosition.x - this.width / 2,
            y: newPosition.y - this.height / 2,
            width: this.width,
            height: this.height
        });
        
        if (tileCollision) {
            if (this.bounce && this.bounceCount < this.maxBounces) {
                this.handleBounce(tileCollision);
                this.bounceCount++;
            } else {
                if (this.explosive) {
                    this.explode(world);
                }
                this.destroy();
                return;
            }
        }
        
        // Check entity collisions
        const entities = world.getEntitiesInArea(
            newPosition.x - this.width,
            newPosition.y - this.height,
            this.width * 2,
            this.height * 2
        );
        
        for (const entity of entities) {
            if (entity === this || entity === this.owner) continue;
            if (this.team !== 'neutral' && entity.team === this.team) continue;
            
            if (this.checkCollision(entity, newPosition)) {
                this.hitEntity(entity, world);
                
                if (!this.piercing) {
                    this.destroy();
                    return;
                }
            }
        }
        
        // Update position if no collision stopped us
        this.position = newPosition;
    }

    handleBounce(collision) {
        if (collision.normal.x !== 0) {
            this.velocity.x *= -this.bounceDecay;
        }
        if (collision.normal.y !== 0) {
            this.velocity.y *= -this.bounceDecay;
        }
    }

    hitEntity(entity, world) {
        if (entity.takeDamage) {
            entity.takeDamage(this.damage, this);
        }
        
        // Apply knockback
        if (entity.velocity && this.velocity.magnitude() > 0) {
            const knockback = this.velocity.normalize().multiply(this.damage * 50);
            entity.velocity = Vector2.add(entity.velocity, knockback);
        }
        
        if (this.explosive) {
            this.explode(world);
        }
    }

    explode(world) {
        // Find entities in explosion radius
        const entitiesInRange = world.getEntitiesInArea(
            this.position.x - this.explosionRadius,
            this.position.y - this.explosionRadius,
            this.explosionRadius * 2,
            this.explosionRadius * 2
        );
        
        for (const entity of entitiesInRange) {
            if (entity === this || entity === this.owner) continue;
            if (this.team !== 'neutral' && entity.team === this.team) continue;
            
            const distance = Vector2.distance(this.position, entity.position);
            if (distance <= this.explosionRadius) {
                const damage = this.damage * (1 - distance / this.explosionRadius);
                const knockback = Vector2.subtract(entity.position, this.position).normalize().multiply(damage * 100);
                
                if (entity.takeDamage) {
                    entity.takeDamage(Math.ceil(damage), this);
                }
                
                if (entity.velocity) {
                    entity.velocity = Vector2.add(entity.velocity, knockback);
                }
            }
        }
        
        // Create explosion effect
        world.createExplosion(this.position.x, this.position.y, this.explosionRadius);
    }

    render(renderer) {
        // Render trail
        if (this.trail && this.trailPositions.length > 1) {
            renderer.setAlpha(0.5);
            for (let i = 0; i < this.trailPositions.length - 1; i++) {
                const alpha = 1 - (i / this.trailPositions.length);
                renderer.setAlpha(alpha * 0.5);
                renderer.drawLine(
                    this.trailPositions[i].x,
                    this.trailPositions[i].y,
                    this.trailPositions[i + 1].x,
                    this.trailPositions[i + 1].y,
                    this.color,
                    2
                );
            }
            renderer.setAlpha(1);
        }
        
        // Render projectile
        renderer.save();
        renderer.translate(this.position.x, this.position.y);
        renderer.rotate(this.rotation);
        
        switch (this.projectileType) {
            case 'bullet':
                renderer.fillRect(-this.width/2, -this.height/2, this.width, this.height, this.color);
                break;
            case 'arrow':
                this.renderArrow(renderer);
                break;
            case 'fireball':
                this.renderFireball(renderer);
                break;
            default:
                renderer.fillCircle(0, 0, this.width/2, this.color);
        }
        
        renderer.restore();
    }

    renderArrow(renderer) {
        const points = [
            { x: this.width/2, y: 0 },
            { x: -this.width/4, y: -this.height/4 },
            { x: -this.width/4, y: -this.height/8 },
            { x: -this.width/2, y: -this.height/8 },
            { x: -this.width/2, y: this.height/8 },
            { x: -this.width/4, y: this.height/8 },
            { x: -this.width/4, y: this.height/4 }
        ];
        
        renderer.fillPolygon(points, this.color);
    }

    renderFireball(renderer) {
        // Outer glow
        renderer.fillCircle(0, 0, this.width/2 + 2, 'rgba(255, 100, 0, 0.3)');
        // Main fireball
        renderer.fillCircle(0, 0, this.width/2, '#ff6600');
        // Inner core
        renderer.fillCircle(0, 0, this.width/4, '#ffaa00');
    }
}

/**
 * Checkpoint class for save points
 */
export class Checkpoint extends GameObject {
    constructor(x, y, config = {}) {
        super(x, y, config.width || 32, config.height || 48);
        
        this.type = 'checkpoint';
        this.checkpointId = config.id || `checkpoint_${Date.now()}`;
        this.activated = false;
        this.respawnPoint = config.respawnPoint || { x: x, y: y - 20 };
        
        // Visual properties
        this.baseColor = '#4a5568';
        this.activeColor = '#48bb78';
        this.glowRadius = 0;
        this.glowSpeed = 2;
        this.particles = [];
        
        // Audio
        this.activationSound = config.activationSound || null;
        this.ambientSound = config.ambientSound || null;
        
        // Animation
        this.bobOffset = 0;
        this.bobSpeed = 1;
        this.bobAmount = 2;
        
        this.isStatic = true;
        this.isTrigger = true;
    }

    update(deltaTime, world) {
        super.update(deltaTime, world);
        
        // Update bob animation
        this.bobOffset += this.bobSpeed * deltaTime;
        
        // Update glow effect
        if (this.activated) {
            this.glowRadius = Math.sin(world.time * this.glowSpeed) * 5 + 10;
            
            // Spawn particles
            if (Math.random() < 0.3) {
                this.particles.push({
                    x: this.position.x + (Math.random() - 0.5) * this.width,
                    y: this.position.y + this.height,
                    vy: -50 - Math.random() * 30,
                    life: 1,
                    maxLife: 1
                });
            }
        }
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.y += particle.vy * deltaTime;
            particle.life -= deltaTime;
            return particle.life > 0;
        });
        
        // Check for player activation
        if (!this.activated) {
            const player = world.getPlayer();
            if (player && this.checkCollision(player)) {
                this.activate(world);
            }
        }
    }

    activate(world) {
        if (this.activated) return;
        
        this.activated = true;
        
        // Save checkpoint
        if (world.saveSystem) {
            world.saveSystem.setCheckpoint(world.currentLevel, {
                checkpointId: this.checkpointId,
                position: this.respawnPoint,
                timestamp: Date.now()
            });
        }
        
        // Play activation sound
        if (this.activationSound && world.audioManager) {
            world.audioManager.playSound(this.activationSound);
        }
        
        // Create activation effect
        world.createEffect('checkpoint_activation', this.position.x, this.position.y);
        
        // Deactivate other checkpoints
        const otherCheckpoints = world.getEntitiesByType('checkpoint');
        otherCheckpoints.forEach(checkpoint => {
            if (checkpoint !== this && checkpoint.activated) {
                checkpoint.deactivate();
            }
        });
        
        console.log(`Checkpoint activated: ${this.checkpointId}`);
    }

    deactivate() {
        this.activated = false;
        this.glowRadius = 0;
        this.particles = [];
    }

    render(renderer) {
        const bobY = Math.sin(this.bobOffset) * this.bobAmount;
        const renderY = this.position.y + bobY;
        
        // Render glow effect
        if (this.activated && this.glowRadius > 0) {
            renderer.setAlpha(0.3);
            renderer.fillCircle(
                this.position.x, 
                renderY, 
                this.glowRadius, 
                this.activeColor
            );
            renderer.setAlpha(1);
        }
        
        // Render checkpoint pillar
        const color = this.activated ? this.activeColor : this.baseColor;
        
        // Base
        renderer.fillRect(
            this.position.x - this.width/2, 
            renderY, 
            this.width, 
            8, 
            color
        );
        
        // Pillar
        renderer.fillRect(
            this.position.x - 6, 
            renderY - this.height + 8, 
            12, 
            this.height - 8, 
            color
        );
        
        // Crystal/Orb on top
        if (this.activated) {
            renderer.fillCircle(this.position.x, renderY - this.height + 4, 8, '#ffffff');
            renderer.fillCircle(this.position.x, renderY - this.height + 4, 6, this.activeColor);
        } else {
            renderer.fillCircle(this.position.x, renderY - this.height + 4, 6, '#718096');
        }
        
        // Render particles
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            renderer.setAlpha(alpha);
            renderer.fillCircle(particle.x, particle.y, 2, this.activeColor);
        });
        renderer.setAlpha(1);
    }
}

/**
 * Flying Enemy class
 */
export class FlyingEnemy extends GameObject {
    constructor(x, y, config = {}) {
        super(x, y, config.width || 24, config.height || 16);
        
        this.type = 'flying_enemy';
        this.enemyType = config.enemyType || 'drone';
        this.health = config.health || 2;
        this.maxHealth = this.health;
        this.damage = config.damage || 1;
        this.speed = config.speed || 60;
        this.team = 'enemy';
        
        // AI properties
        this.detectionRange = config.detectionRange || 150;
        this.attackRange = config.attackRange || 100;
        this.patrolPath = config.patrolPath || [];
        this.currentPathIndex = 0;
        this.patrolSpeed = config.patrolSpeed || 40;
        
        // States
        this.state = 'patrol'; // patrol, chase, attack, stunned
        this.target = null;
        this.lastAttackTime = 0;
        this.attackCooldown = config.attackCooldown || 2;
        
        // Flying properties
        this.hoverHeight = config.hoverHeight || 0;
        this.hoverSpeed = config.hoverSpeed || 2;
        this.hoverAmount = config.hoverAmount || 5;
        this.hoverOffset = Math.random() * Math.PI * 2;
        
        // Visual
        this.color = config.color || '#e53e3e';
        this.facingDirection = 1;
        
        this.hasGravity = false;
    }

    update(deltaTime, world) {
        super.update(deltaTime, world);
        
        // Update hover animation
        this.hoverOffset += this.hoverSpeed * deltaTime;
        const targetY = this.position.y + Math.sin(this.hoverOffset) * this.hoverAmount;
        
        // Find player
        const player = world.getPlayer();
        const distanceToPlayer = player ? Vector2.distance(this.position, player.position) : Infinity;
        
        // State machine
        switch (this.state) {
            case 'patrol':
                this.updatePatrol(deltaTime);
                if (player && distanceToPlayer <= this.detectionRange) {
                    this.state = 'chase';
                    this.target = player;
                }
                break;
                
            case 'chase':
                if (!player || distanceToPlayer > this.detectionRange * 1.5) {
                    this.state = 'patrol';
                    this.target = null;
                } else if (distanceToPlayer <= this.attackRange) {
                    this.state = 'attack';
                } else {
                    this.chaseTarget(player, deltaTime);
                }
                break;
                
            case 'attack':
                if (!player || distanceToPlayer > this.attackRange * 1.2) {
                    this.state = 'chase';
                } else {
                    this.attackTarget(player, deltaTime, world);
                }
                break;
        }
        
        // Apply hover effect to Y position
        if (this.state !== 'stunned') {
            this.position.y = targetY;
        }
    }

    updatePatrol(deltaTime) {
        if (this.patrolPath.length === 0) return;
        
        const targetPoint = this.patrolPath[this.currentPathIndex];
        const direction = Vector2.subtract(targetPoint, this.position);
        const distance = direction.magnitude();
        
        if (distance < 10) {
            this.currentPathIndex = (this.currentPathIndex + 1) % this.patrolPath.length;
        } else {
            const moveVector = direction.normalize().multiply(this.patrolSpeed * deltaTime);
            this.position = Vector2.add(this.position, moveVector);
            this.facingDirection = moveVector.x > 0 ? 1 : -1;
        }
    }

    chaseTarget(target, deltaTime) {
        const direction = Vector2.subtract(target.position, this.position);
        const moveVector = direction.normalize().multiply(this.speed * deltaTime);
        this.position = Vector2.add(this.position, moveVector);
        this.facingDirection = moveVector.x > 0 ? 1 : -1;
    }

    attackTarget(target, deltaTime, world) {
        const currentTime = world.time;
        if (currentTime - this.lastAttackTime >= this.attackCooldown) {
            this.performAttack(target, world);
            this.lastAttackTime = currentTime;
        }
    }

    performAttack(target, world) {
        switch (this.enemyType) {
            case 'drone':
                // Shoot projectile
                const direction = Vector2.subtract(target.position, this.position).normalize();
                world.createProjectile({
                    x: this.position.x,
                    y: this.position.y,
                    velocityX: direction.x * 200,
                    velocityY: direction.y * 200,
                    damage: this.damage,
                    owner: this,
                    team: this.team,
                    projectileType: 'bullet'
                });
                break;
                
            case 'bomber':
                // Drop explosive
                world.createProjectile({
                    x: this.position.x,
                    y: this.position.y,
                    velocityX: 0,
                    velocityY: 100,
                    damage: this.damage * 2,
                    owner: this,
                    team: this.team,
                    projectileType: 'bomb',
                    explosive: true,
                    explosionRadius: 40
                });
                break;
        }
    }

    takeDamage(amount, source) {
        this.health -= amount;
        
        // Visual feedback
        this.color = '#ffffff';
        setTimeout(() => {
            this.color = '#e53e3e';
        }, 100);
        
        if (this.health <= 0) {
            this.die(source);
        } else {
            // Become stunned briefly
            this.state = 'stunned';
            setTimeout(() => {
                if (this.state === 'stunned') {
                    this.state = 'patrol';
                }
            }, 500);
        }
    }

    die(source) {
        // Drop items or give rewards
        if (Math.random() < 0.3) {
            // Drop health pickup
            // world.createPickup('health', this.position.x, this.position.y);
        }
        
        this.destroy();
    }

    render(renderer) {
        renderer.save();
        renderer.translate(this.position.x, this.position.y);
        renderer.scale(this.facingDirection, 1);
        
        // Body
        renderer.fillRect(-this.width/2, -this.height/2, this.width, this.height, this.color);
        
        // Wings (simple animation)
        const wingFlap = Math.sin(this.hoverOffset * 3) * 0.3 + 0.7;
        renderer.setAlpha(wingFlap);
        renderer.fillRect(-this.width/2 - 4, -this.height/4, 8, 4, '#a0aec0');
        renderer.fillRect(this.width/2 - 4, -this.height/4, 8, 4, '#a0aec0');
        renderer.setAlpha(1);
        
        // Health bar
        if (this.health < this.maxHealth) {
            const barWidth = this.width;
            const barHeight = 3;
            const healthPercent = this.health / this.maxHealth;
            
            renderer.fillRect(-barWidth/2, -this.height/2 - 8, barWidth, barHeight, '#4a5568');
            renderer.fillRect(-barWidth/2, -this.height/2 - 8, barWidth * healthPercent, barHeight, '#48bb78');
        }
        
        renderer.restore();
    }
}
