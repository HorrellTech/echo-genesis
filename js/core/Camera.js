/**
 * Camera - Handles camera movement, following, and screen transformations for Echo Genesis
 * Provides smooth camera movement and various follow modes
 */
class Camera {
    constructor(x = 0, y = 0, width = 1024, height = 576) {
        this.position = new Vector2(x, y);
        this.target = null;
        this.followTarget = null;
        
        // Camera bounds
        this.width = width;
        this.height = height;
        this.bounds = null; // World bounds to constrain camera
        
        // Follow settings
        this.followSpeed = 5.0;
        this.followOffset = new Vector2(0, 0);
        this.deadZone = {
            x: 100,
            y: 80,
            width: 200,
            height: 160
        };
        
        // Smoothing and easing
        this.smoothing = true;
        this.smoothingSpeed = 0.1;
        this.lookAheadDistance = 100;
        this.lookAheadSpeed = 2.0;
        
        // Shake effect
        this.shake = {
            intensity: 0,
            duration: 0,
            decay: 0.9,
            offset: new Vector2(0, 0)
        };
        
        // Zoom
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.zoomSpeed = 0.1;
        this.minZoom = 0.5;
        this.maxZoom = 3.0;
        
        // Camera states
        this.locked = false;
        this.following = true;
        
        // Transition effects
        this.transition = {
            active: false,
            type: 'fade', // 'fade', 'slide', 'zoom'
            duration: 1000,
            elapsed: 0,
            fromPosition: new Vector2(0, 0),
            toPosition: new Vector2(0, 0),
            onComplete: null
        };
        
        // Look ahead system for platformers
        this.lookAhead = {
            enabled: true,
            distance: 150,
            speed: 3.0,
            currentOffset: new Vector2(0, 0),
            targetOffset: new Vector2(0, 0)
        };
    }
    
    update(deltaTime) {
        if (this.locked) return;
        
        // Update camera shake
        this.updateShake(deltaTime);
        
        // Update zoom
        this.updateZoom(deltaTime);
        
        // Update following
        if (this.following && this.followTarget) {
            this.updateFollow(deltaTime);
        }
        
        // Update transitions
        this.updateTransition(deltaTime);
        
        // Apply bounds constraints
        this.applyBounds();
    }
    
    updateShake(deltaTime) {
        if (this.shake.duration > 0) {
            this.shake.duration -= deltaTime;
            
            // Generate random shake offset
            const angle = Math.random() * Math.PI * 2;
            const distance = this.shake.intensity * (this.shake.duration / 1000);
            this.shake.offset.set(
                Math.cos(angle) * distance,
                Math.sin(angle) * distance
            );
            
            // Decay intensity
            this.shake.intensity *= this.shake.decay;
            
            if (this.shake.duration <= 0) {
                this.shake.offset.set(0, 0);
                this.shake.intensity = 0;
            }
        }
    }
    
    updateZoom(deltaTime) {
        if (Math.abs(this.zoom - this.targetZoom) > 0.01) {
            this.zoom += (this.targetZoom - this.zoom) * this.zoomSpeed;
        }
    }
    
    updateFollow(deltaTime) {
        if (!this.followTarget) return;
        
        const targetPos = this.followTarget.getCenter
            ? this.followTarget.getCenter()
            : new Vector2(this.followTarget.position.x, this.followTarget.position.y);
        
        // Add follow offset
        targetPos.addInPlace(this.followOffset);
        
        // Look ahead system
        if (this.lookAhead.enabled) {
            this.updateLookAhead(deltaTime, targetPos);
            targetPos.addInPlace(this.lookAhead.currentOffset);
        }
        
        // Calculate desired camera position (center target on screen)
        const desiredPos = new Vector2(
            targetPos.x - this.width / 2,
            targetPos.y - this.height / 2
        );
        
        if (this.smoothing) {
            // Smooth following with dead zone
            const centerX = this.position.x + this.width / 2;
            const centerY = this.position.y + this.height / 2;
            
            const deadZoneLeft = centerX - this.deadZone.width / 2;
            const deadZoneRight = centerX + this.deadZone.width / 2;
            const deadZoneTop = centerY - this.deadZone.height / 2;
            const deadZoneBottom = centerY + this.deadZone.height / 2;
            
            let moveX = 0, moveY = 0;
            
            // Check if target is outside dead zone
            if (targetPos.x < deadZoneLeft) {
                moveX = targetPos.x - deadZoneLeft;
            } else if (targetPos.x > deadZoneRight) {
                moveX = targetPos.x - deadZoneRight;
            }
            
            if (targetPos.y < deadZoneTop) {
                moveY = targetPos.y - deadZoneTop;
            } else if (targetPos.y > deadZoneBottom) {
                moveY = targetPos.y - deadZoneBottom;
            }
            
            // Apply smooth movement
            this.position.x += moveX * this.smoothingSpeed;
            this.position.y += moveY * this.smoothingSpeed;
        } else {
            // Direct following
            this.position.lerpInPlace(desiredPos, this.followSpeed * deltaTime);
        }
    }
    
    updateLookAhead(deltaTime, targetPos) {
        if (!this.followTarget.velocity) return;
        
        // Calculate look ahead based on velocity
        const velocity = this.followTarget.velocity;
        const speed = velocity.magnitude();
        
        if (speed > 50) { // Only look ahead if moving fast enough
            const direction = velocity.normalized();
            this.lookAhead.targetOffset = direction.multiply(this.lookAhead.distance);
        } else {
            this.lookAhead.targetOffset.set(0, 0);
        }
        
        // Smooth look ahead transition
        this.lookAhead.currentOffset.lerpInPlace(
            this.lookAhead.targetOffset,
            this.lookAhead.speed * deltaTime
        );
    }
    
    updateTransition(deltaTime) {
        if (!this.transition.active) return;
        
        this.transition.elapsed += deltaTime;
        const progress = Math.min(this.transition.elapsed / this.transition.duration, 1);
        
        switch (this.transition.type) {
            case 'slide':
                this.position.setFromVector(
                    this.transition.fromPosition.lerp(this.transition.toPosition, this.easeInOut(progress))
                );
                break;
                
            case 'zoom':
                // Handle zoom transition
                break;
        }
        
        if (progress >= 1) {
            this.transition.active = false;
            if (this.transition.onComplete) {
                this.transition.onComplete();
            }
        }
    }
    
    easeInOut(t) {
        return t * t * (3.0 - 2.0 * t);
    }
    
    applyBounds() {
        if (!this.bounds) return;
        
        // Constrain camera to world bounds
        const minX = this.bounds.x;
        const maxX = this.bounds.x + this.bounds.width - this.width;
        const minY = this.bounds.y;
        const maxY = this.bounds.y + this.bounds.height - this.height;
        
        this.position.x = Math.max(minX, Math.min(maxX, this.position.x));
        this.position.y = Math.max(minY, Math.min(maxY, this.position.y));
    }
    
    // Camera control methods
    setTarget(target) {
        this.followTarget = target;
    }
    
    follow(target, immediate = false) {
        this.followTarget = target;
        this.following = true;
        
        if (immediate && target) {
            const targetPos = target.getCenter
                ? target.getCenter()
                : new Vector2(target.position.x, target.position.y);
            
            this.position.set(
                targetPos.x - this.width / 2,
                targetPos.y - this.height / 2
            );
            this.applyBounds();
        }
    }
    
    stopFollowing() {
        this.following = false;
    }
    
    moveTo(x, y, smooth = true) {
        if (smooth) {
            this.startTransition('slide', new Vector2(x, y), 1000);
        } else {
            this.position.set(x, y);
            this.applyBounds();
        }
    }
    
    centerOn(target, immediate = false) {
        const targetPos = target.getCenter
            ? target.getCenter()
            : new Vector2(target.position.x, target.position.y);
        
        const newPos = new Vector2(
            targetPos.x - this.width / 2,
            targetPos.y - this.height / 2
        );
        
        if (immediate) {
            this.position.setFromVector(newPos);
            this.applyBounds();
        } else {
            this.startTransition('slide', newPos, 1000);
        }
    }
    
    // Shake effects
    addShake(intensity, duration) {
        this.shake.intensity = Math.max(this.shake.intensity, intensity);
        this.shake.duration = Math.max(this.shake.duration, duration);
    }
    
    // Zoom controls
    setZoom(zoom, smooth = true) {
        zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
        
        if (smooth) {
            this.targetZoom = zoom;
        } else {
            this.zoom = zoom;
            this.targetZoom = zoom;
        }
    }
    
    zoomIn(factor = 1.2) {
        this.setZoom(this.targetZoom * factor);
    }
    
    zoomOut(factor = 0.8) {
        this.setZoom(this.targetZoom * factor);
    }
    
    resetZoom() {
        this.setZoom(1.0);
    }
    
    // Bounds management
    setBounds(x, y, width, height) {
        this.bounds = { x, y, width, height };
    }
    
    removeBounds() {
        this.bounds = null;
    }
    
    // Transitions
    startTransition(type, targetPosition, duration, onComplete = null) {
        this.transition.active = true;
        this.transition.type = type;
        this.transition.duration = duration;
        this.transition.elapsed = 0;
        this.transition.fromPosition.setFromVector(this.position);
        this.transition.toPosition.setFromVector(targetPosition);
        this.transition.onComplete = onComplete;
    }
    
    // Lock/unlock camera
    lock() {
        this.locked = true;
    }
    
    unlock() {
        this.locked = false;
    }
    
    // Coordinate transformations
    worldToScreen(worldPos) {
        return new Vector2(
            (worldPos.x - this.position.x) * this.zoom + this.shake.offset.x,
            (worldPos.y - this.position.y) * this.zoom + this.shake.offset.y
        );
    }
    
    screenToWorld(screenPos) {
        return new Vector2(
            (screenPos.x - this.shake.offset.x) / this.zoom + this.position.x,
            (screenPos.y - this.shake.offset.y) / this.zoom + this.position.y
        );
    }
    
    // Visibility testing
    isInView(bounds) {
        const cameraBounds = this.getViewBounds();
        return !(bounds.x + bounds.width < cameraBounds.x ||
                bounds.x > cameraBounds.x + cameraBounds.width ||
                bounds.y + bounds.height < cameraBounds.y ||
                bounds.y > cameraBounds.y + cameraBounds.height);
    }
    
    getViewBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.width / this.zoom,
            height: this.height / this.zoom
        };
    }
    
    // Camera settings
    setDeadZone(x, y, width, height) {
        this.deadZone = { x, y, width, height };
    }
    
    setFollowSpeed(speed) {
        this.followSpeed = speed;
    }
    
    setLookAhead(enabled, distance = 150, speed = 3.0) {
        this.lookAhead.enabled = enabled;
        this.lookAhead.distance = distance;
        this.lookAhead.speed = speed;
    }
    
    // Debug rendering
    renderDebug(ctx) {
        if (!ctx) return;
        
        ctx.save();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        
        // Draw camera bounds
        ctx.strokeRect(0, 0, this.width, this.height);
        
        // Draw dead zone
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        ctx.strokeStyle = '#00ff00';
        ctx.strokeRect(
            centerX - this.deadZone.width / 2,
            centerY - this.deadZone.height / 2,
            this.deadZone.width,
            this.deadZone.height
        );
        
        // Draw center point
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(centerX - 2, centerY - 2, 4, 4);
        
        ctx.restore();
    }
    
    // Serialization
    toJSON() {
        return {
            position: this.position.toJSON(),
            width: this.width,
            height: this.height,
            zoom: this.zoom,
            bounds: this.bounds,
            followSpeed: this.followSpeed,
            deadZone: this.deadZone,
            lookAhead: this.lookAhead
        };
    }
    
    static fromJSON(data) {
        const camera = new Camera(
            data.position.x, data.position.y,
            data.width, data.height
        );
        
        camera.zoom = data.zoom;
        camera.targetZoom = data.zoom;
        camera.bounds = data.bounds;
        camera.followSpeed = data.followSpeed;
        camera.deadZone = data.deadZone;
        camera.lookAhead = data.lookAhead;
        
        return camera;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Camera;
}
