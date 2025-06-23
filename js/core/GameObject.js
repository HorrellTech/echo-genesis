/**
 * GameObject - Base class for all game entities in Echo Genesis
 * Provides common functionality for position, rendering, and updates
 */
class GameObject {
    constructor(x = 0, y = 0, width = 32, height = 32) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.acceleration = new Vector2(0, 0);
        this.size = new Vector2(width, height);
        
        // Physics properties
        this.mass = 1;
        this.friction = 0.8;
        this.bounciness = 0;
        this.gravityScale = 1;
        
        // State properties
        this.active = true;
        this.visible = true;
        this.solid = true;
        this.destroyed = false;
        
        // Rendering properties
        this.color = '#ffffff';
        this.rotation = 0;
        this.scale = new Vector2(1, 1);
        this.opacity = 1;
        this.zIndex = 0;
        
        // Animation properties
        this.sprite = null;
        this.currentFrame = 0;
        this.frameTime = 0;
        this.animationSpeed = 100; // milliseconds per frame
        this.animations = new Map();
        this.currentAnimation = null;
        
        // Collision properties
        this.collisionBounds = null; // Custom collision bounds
        this.collisionLayers = ['default'];
        this.collisionMask = ['default'];
        this.isTrigger = false;
        
        // Component system
        this.components = new Map();
        this.tags = new Set();
        
        // Events
        this.onDestroy = null;
        this.onCollision = null;
        this.onTriggerEnter = null;
        this.onTriggerExit = null;
        
        // Unique ID
        this.id = GameObject.generateId();
        this.name = `GameObject_${this.id}`;
    }
    
    static idCounter = 0;
    static generateId() {
        return ++GameObject.idCounter;
    }
    
    // Core update methods
    update(deltaTime) {
        if (!this.active || this.destroyed) return;
        
        // Update components
        for (const component of this.components.values()) {
            if (component.update) {
                component.update(deltaTime);
            }
        }
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Apply physics
        this.updatePhysics(deltaTime);
        
        // Custom update logic (override in subclasses)
        this.onUpdate(deltaTime);
    }
    
    onUpdate(deltaTime) {
        // Override in subclasses
    }
    
    updatePhysics(deltaTime) {
        // Apply acceleration to velocity
        this.velocity.addInPlace(this.acceleration.multiply(deltaTime));
        
        // Apply friction
        this.velocity.multiplyInPlace(this.friction);
        
        // Apply velocity to position
        this.position.addInPlace(this.velocity.multiply(deltaTime));
        
        // Reset acceleration (forces need to be applied each frame)
        this.acceleration.set(0, 0);
    }
    
    updateAnimation(deltaTime) {
        if (!this.currentAnimation) return;
        
        const animation = this.animations.get(this.currentAnimation);
        if (!animation) return;
        
        this.frameTime += deltaTime;
        if (this.frameTime >= this.animationSpeed) {
            this.frameTime = 0;
            this.currentFrame++;
            
            if (this.currentFrame >= animation.frames.length) {
                if (animation.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = animation.frames.length - 1;
                    if (animation.onComplete) {
                        animation.onComplete();
                    }
                }
            }
        }
    }
    
    // Rendering
    render(renderer) {
        if (!this.visible || this.destroyed) return;
        
        const ctx = renderer.context;
        ctx.save();
        
        // Apply transformations
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.position.x + this.size.x / 2, this.position.y + this.size.y / 2);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale.x, this.scale.y);
        
        // Render sprite or color
        if (this.sprite && this.currentAnimation) {
            this.renderSprite(ctx);
        } else {
            this.renderColor(ctx);
        }
        
        // Custom rendering (override in subclasses)
        this.onRender(ctx);
        
        ctx.restore();
        
        // Render components
        for (const component of this.components.values()) {
            if (component.render) {
                component.render(renderer);
            }
        }
    }
    
    renderSprite(ctx) {
        if (!this.sprite) return;
        
        const animation = this.animations.get(this.currentAnimation);
        if (!animation) return;
        
        const frame = animation.frames[this.currentFrame];
        if (!frame) return;
        
        ctx.drawImage(
            this.sprite,
            frame.x, frame.y, frame.width, frame.height,
            -this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y
        );
    }
    
    renderColor(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
    }
    
    onRender(ctx) {
        // Override in subclasses
    }
    
    // Collision detection
    getBounds() {
        if (this.collisionBounds) {
            return {
                x: this.position.x + this.collisionBounds.x,
                y: this.position.y + this.collisionBounds.y,
                width: this.collisionBounds.width,
                height: this.collisionBounds.height
            };
        }
        
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.size.x,
            height: this.size.y
        };
    }
    
    getCenter() {
        const bounds = this.getBounds();
        return new Vector2(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height / 2
        );
    }
    
    overlaps(other) {
        const a = this.getBounds();
        const b = other.getBounds();
        
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
    
    contains(point) {
        const bounds = this.getBounds();
        return point.x >= bounds.x &&
               point.x <= bounds.x + bounds.width &&
               point.y >= bounds.y &&
               point.y <= bounds.y + bounds.height;
    }
    
    // Animation system
    addAnimation(name, frames, loop = true, onComplete = null) {
        this.animations.set(name, {
            frames: frames,
            loop: loop,
            onComplete: onComplete
        });
    }
    
    playAnimation(name, reset = false) {
        if (this.currentAnimation === name && !reset) return;
        
        this.currentAnimation = name;
        this.currentFrame = 0;
        this.frameTime = 0;
    }
    
    stopAnimation() {
        this.currentAnimation = null;
        this.currentFrame = 0;
        this.frameTime = 0;
    }
    
    // Component system
    addComponent(name, component) {
        component.gameObject = this;
        this.components.set(name, component);
        if (component.start) {
            component.start();
        }
    }
    
    getComponent(name) {
        return this.components.get(name);
    }
    
    removeComponent(name) {
        const component = this.components.get(name);
        if (component && component.destroy) {
            component.destroy();
        }
        this.components.delete(name);
    }
    
    // Tag system
    addTag(tag) {
        this.tags.add(tag);
    }
    
    removeTag(tag) {
        this.tags.delete(tag);
    }
    
    hasTag(tag) {
        return this.tags.has(tag);
    }
    
    // Force application
    addForce(force) {
        this.acceleration.addInPlace(force.divide(this.mass));
    }
    
    addImpulse(impulse) {
        this.velocity.addInPlace(impulse.divide(this.mass));
    }
    
    // Utility methods
    distanceTo(other) {
        return this.getCenter().distance(other.getCenter());
    }
    
    directionTo(other) {
        return other.getCenter().subtract(this.getCenter()).normalized();
    }
    
    lookAt(target) {
        const direction = this.directionTo(target);
        this.rotation = Math.atan2(direction.y, direction.x);
    }
    
    // State management
    destroy() {
        this.destroyed = true;
        this.active = false;
        
        // Destroy components
        for (const component of this.components.values()) {
            if (component.destroy) {
                component.destroy();
            }
        }
        this.components.clear();
        
        // Call destroy callback
        if (this.onDestroy) {
            this.onDestroy();
        }
    }
    
    clone() {
        const clone = new this.constructor(
            this.position.x, this.position.y,
            this.size.x, this.size.y
        );
        
        // Copy properties
        clone.velocity.setFromVector(this.velocity);
        clone.acceleration.setFromVector(this.acceleration);
        clone.mass = this.mass;
        clone.friction = this.friction;
        clone.bounciness = this.bounciness;
        clone.gravityScale = this.gravityScale;
        clone.color = this.color;
        clone.rotation = this.rotation;
        clone.scale.setFromVector(this.scale);
        clone.opacity = this.opacity;
        clone.zIndex = this.zIndex;
        clone.solid = this.solid;
        clone.isTrigger = this.isTrigger;
        clone.collisionLayers = [...this.collisionLayers];
        clone.collisionMask = [...this.collisionMask];
        
        // Copy tags
        for (const tag of this.tags) {
            clone.addTag(tag);
        }
        
        // Copy animations
        for (const [name, animation] of this.animations) {
            clone.addAnimation(name, animation.frames, animation.loop, animation.onComplete);
        }
        
        return clone;
    }
    
    // Serialization
    toJSON() {
        return {
            type: this.constructor.name,
            position: this.position.toJSON(),
            velocity: this.velocity.toJSON(),
            size: this.size.toJSON(),
            rotation: this.rotation,
            scale: this.scale.toJSON(),
            color: this.color,
            opacity: this.opacity,
            zIndex: this.zIndex,
            active: this.active,
            visible: this.visible,
            solid: this.solid,
            mass: this.mass,
            friction: this.friction,
            bounciness: this.bounciness,
            gravityScale: this.gravityScale,
            tags: Array.from(this.tags),
            name: this.name
        };
    }
    
    static fromJSON(data) {
        const obj = new GameObject(
            data.position.x, data.position.y,
            data.size.x, data.size.y
        );
        
        obj.velocity.setFromVector(Vector2.fromJSON(data.velocity));
        obj.rotation = data.rotation;
        obj.scale.setFromVector(Vector2.fromJSON(data.scale));
        obj.color = data.color;
        obj.opacity = data.opacity;
        obj.zIndex = data.zIndex;
        obj.active = data.active;
        obj.visible = data.visible;
        obj.solid = data.solid;
        obj.mass = data.mass;
        obj.friction = data.friction;
        obj.bounciness = data.bounciness;
        obj.gravityScale = data.gravityScale;
        obj.name = data.name;
        
        for (const tag of data.tags) {
            obj.addTag(tag);
        }
        
        return obj;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameObject;
}
