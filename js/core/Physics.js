/**
 * Physics - Handles collision detection, resolution, and physics simulation for Echo Genesis
 * Provides AABB collision detection optimized for platformers
 */
class Physics {
    constructor() {
        this.gravity = new Vector2(0, 980); // pixels per second squared
        this.terminalVelocity = 1000;
        this.spatialGrid = new SpatialGrid(64); // 64x64 grid cells
        
        // Collision layers
        this.collisionMatrix = new Map();
        this.setupDefaultCollisionLayers();
        
        // Physics settings
        this.subSteps = 4; // For more accurate collision detection
        this.velocityIterations = 8;
        this.positionIterations = 3;
        
        // Debug
        this.debugDraw = false;
    }
    
    setupDefaultCollisionLayers() {
        // Define which layers can collide with each other
        this.setLayerCollision('player', ['solid', 'platform', 'enemy', 'pickup']);
        this.setLayerCollision('enemy', ['solid', 'platform', 'player', 'projectile']);
        this.setLayerCollision('projectile', ['solid', 'enemy']);
        this.setLayerCollision('pickup', ['player']);
        this.setLayerCollision('solid', ['player', 'enemy', 'projectile']);
        this.setLayerCollision('platform', ['player', 'enemy']);
    }
    
    setLayerCollision(layer1, layers) {
        this.collisionMatrix.set(layer1, new Set(layers));
    }
    
    canLayersCollide(layer1, layer2) {
        const layer1Collisions = this.collisionMatrix.get(layer1);
        return layer1Collisions && layer1Collisions.has(layer2);
    }
    
    // Main physics update
    update(world, deltaTime) {
        // Apply gravity to all physics objects
        this.applyGravity(world.gameObjects, deltaTime);
        
        // Update spatial grid
        this.spatialGrid.clear();
        this.spatialGrid.addObjects(world.gameObjects);
        
        // Perform collision detection and resolution in substeps
        const subDeltaTime = deltaTime / this.subSteps;
        for (let i = 0; i < this.subSteps; i++) {
            this.physicsSubStep(world.gameObjects, subDeltaTime);
        }
    }
    
    physicsSubStep(objects, deltaTime) {
        // Move objects
        for (const obj of objects) {
            if (obj.active && !obj.destroyed && obj.gravityScale !== 0) {
                this.integrateVelocity(obj, deltaTime);
            }
        }
        
        // Detect and resolve collisions
        this.detectCollisions(objects);
        this.resolveCollisions();
        
        // Update positions
        for (const obj of objects) {
            if (obj.active && !obj.destroyed) {
                this.integratePosition(obj, deltaTime);
            }
        }
    }
    
    applyGravity(objects, deltaTime) {
        for (const obj of objects) {
            if (obj.active && !obj.destroyed && obj.gravityScale > 0) {
                const gravityForce = this.gravity.multiply(obj.gravityScale * obj.mass);
                obj.addForce(gravityForce);
                
                // Apply terminal velocity
                if (obj.velocity.y > this.terminalVelocity) {
                    obj.velocity.y = this.terminalVelocity;
                }
            }
        }
    }
    
    integrateVelocity(obj, deltaTime) {
        // Verlet integration for better stability
        obj.velocity.addInPlace(obj.acceleration.multiply(deltaTime));
        obj.acceleration.set(0, 0); // Reset acceleration
    }
    
    integratePosition(obj, deltaTime) {
        obj.position.addInPlace(obj.velocity.multiply(deltaTime));
    }
    
    // Collision detection
    detectCollisions(objects) {
        this.collisionPairs = [];
        
        // Broad phase - use spatial grid
        const potentialPairs = this.spatialGrid.getPotentialCollisionPairs();
        
        // Narrow phase - precise collision detection
        for (const pair of potentialPairs) {
            const [objA, objB] = pair;
            
            if (this.shouldCheckCollision(objA, objB)) {
                const collision = this.checkAABBCollision(objA, objB);
                if (collision) {
                    this.collisionPairs.push({
                        objectA: objA,
                        objectB: objB,
                        collision: collision
                    });
                }
            }
        }
    }
    
    shouldCheckCollision(objA, objB) {
        // Skip if same object
        if (objA === objB) return false;
        
        // Skip if either is destroyed or inactive
        if (objA.destroyed || objB.destroyed || !objA.active || !objB.active) return false;
        
        // Skip if neither is solid (unless one is a trigger)
        if (!objA.solid && !objB.solid && !objA.isTrigger && !objB.isTrigger) return false;
        
        // Check collision layers
        const layersA = objA.collisionLayers || ['default'];
        const layersB = objB.collisionLayers || ['default'];
        const maskA = objA.collisionMask || ['default'];
        const maskB = objB.collisionMask || ['default'];
        
        // Check if layers can collide
        for (const layerA of layersA) {
            for (const layerB of layersB) {
                if (maskA.includes(layerB) || maskB.includes(layerA)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    checkAABBCollision(objA, objB) {
        const boundsA = objA.getBounds();
        const boundsB = objB.getBounds();
        
        // Check if bounding boxes overlap
        if (boundsA.x + boundsA.width <= boundsB.x ||
            boundsB.x + boundsB.width <= boundsA.x ||
            boundsA.y + boundsA.height <= boundsB.y ||
            boundsB.y + boundsB.height <= boundsA.y) {
            return null; // No collision
        }
        
        // Calculate overlap
        const overlapX = Math.min(boundsA.x + boundsA.width, boundsB.x + boundsB.width) -
                        Math.max(boundsA.x, boundsB.x);
        const overlapY = Math.min(boundsA.y + boundsA.height, boundsB.y + boundsB.height) -
                        Math.max(boundsA.y, boundsB.y);
        
        // Determine collision normal and penetration
        let normal, penetration;
        
        if (overlapX < overlapY) {
            // Horizontal collision
            penetration = overlapX;
            normal = boundsA.x < boundsB.x ? new Vector2(-1, 0) : new Vector2(1, 0);
        } else {
            // Vertical collision
            penetration = overlapY;
            normal = boundsA.y < boundsB.y ? new Vector2(0, -1) : new Vector2(0, 1);
        }
        
        return {
            normal: normal,
            penetration: penetration,
            point: new Vector2(
                Math.max(boundsA.x, boundsB.x) + overlapX / 2,
                Math.max(boundsA.y, boundsB.y) + overlapY / 2
            )
        };
    }
    
    // Collision resolution
    resolveCollisions() {
        // Sort collisions by penetration depth (resolve deepest first)
        this.collisionPairs.sort((a, b) => b.collision.penetration - a.collision.penetration);
        
        for (const pair of this.collisionPairs) {
            this.resolveCollision(pair);
        }
    }
    
    resolveCollision(pair) {
        const { objectA, objectB, collision } = pair;
        
        // Handle trigger collisions
        if (objectA.isTrigger || objectB.isTrigger) {
            this.handleTriggerCollision(objectA, objectB, collision);
            return;
        }
        
        // Skip if neither object is solid
        if (!objectA.solid && !objectB.solid) return;
        
        // Position correction (separate overlapping objects)
        this.positionalCorrection(objectA, objectB, collision);
        
        // Velocity resolution (bounce, friction, etc.)
        this.resolveVelocity(objectA, objectB, collision);
        
        // Call collision callbacks
        this.handleCollisionCallbacks(objectA, objectB, collision);
    }
    
    positionalCorrection(objA, objB, collision) {
        const { normal, penetration } = collision;
        const correction = normal.multiply(penetration * 0.8); // 80% correction
        
        // Calculate mass ratios for position correction
        const totalMass = objA.mass + objB.mass;
        const ratioA = objB.mass / totalMass;
        const ratioB = objA.mass / totalMass;
        
        // Apply position correction based on mass and solidity
        if (objA.solid && objB.solid) {
            // Both solid - distribute correction based on mass
            objA.position.subtractInPlace(correction.multiply(ratioA));
            objB.position.addInPlace(correction.multiply(ratioB));
        } else if (objA.solid) {
            // Only A is solid - B moves entirely
            objB.position.addInPlace(correction);
        } else if (objB.solid) {
            // Only B is solid - A moves entirely
            objA.position.subtractInPlace(correction);
        }
    }
    
    resolveVelocity(objA, objB, collision) {
        const { normal } = collision;
        
        // Calculate relative velocity
        const relativeVelocity = objB.velocity.subtract(objA.velocity);
        const velocityAlongNormal = relativeVelocity.dot(normal);
        
        // Don't resolve if velocities are separating
        if (velocityAlongNormal > 0) return;
        
        // Calculate restitution (bounciness)
        const restitution = Math.min(objA.bounciness, objB.bounciness);
        
        // Calculate impulse scalar
        let impulseScalar = -(1 + restitution) * velocityAlongNormal;
        impulseScalar /= (1 / objA.mass) + (1 / objB.mass);
        
        // Apply impulse
        const impulse = normal.multiply(impulseScalar);
        
        if (objA.solid && !objA.hasTag('static')) {
            objA.velocity.subtractInPlace(impulse.multiply(1 / objA.mass));
        }
        if (objB.solid && !objB.hasTag('static')) {
            objB.velocity.addInPlace(impulse.multiply(1 / objB.mass));
        }
        
        // Apply friction
        this.applyFriction(objA, objB, collision, impulseScalar);
    }
    
    applyFriction(objA, objB, collision, normalImpulse) {
        const { normal } = collision;
        
        // Calculate relative velocity
        const relativeVelocity = objB.velocity.subtract(objA.velocity);
        
        // Calculate tangent vector
        const tangent = relativeVelocity.subtract(normal.multiply(relativeVelocity.dot(normal)));
        if (tangent.magnitudeSquared() < 0.001) return; // No tangential velocity
        
        tangent.normalize();
        
        // Calculate friction impulse
        const frictionCoefficient = Math.sqrt(objA.friction * objB.friction);
        let frictionImpulse = -relativeVelocity.dot(tangent);
        frictionImpulse /= (1 / objA.mass) + (1 / objB.mass);
        
        // Coulomb friction
        const frictionMagnitude = Math.abs(normalImpulse) * frictionCoefficient;
        const friction = Math.abs(frictionImpulse) < frictionMagnitude ?
            tangent.multiply(frictionImpulse) :
            tangent.multiply(-frictionMagnitude * Math.sign(frictionImpulse));
        
        // Apply friction
        if (objA.solid && !objA.hasTag('static')) {
            objA.velocity.subtractInPlace(friction.multiply(1 / objA.mass));
        }
        if (objB.solid && !objB.hasTag('static')) {
            objB.velocity.addInPlace(friction.multiply(1 / objB.mass));
        }
    }
    
    handleTriggerCollision(objA, objB, collision) {
        // Call trigger callbacks
        if (objA.isTrigger && objA.onTriggerEnter) {
            objA.onTriggerEnter(objB, collision);
        }
        if (objB.isTrigger && objB.onTriggerEnter) {
            objB.onTriggerEnter(objA, collision);
        }
    }
    
    handleCollisionCallbacks(objA, objB, collision) {
        if (objA.onCollision) {
            objA.onCollision(objB, collision);
        }
        if (objB.onCollision) {
            objB.onCollision(objA, collision);
        }
    }
    
    // Raycasting
    raycast(origin, direction, maxDistance = 1000, layerMask = null) {
        const hits = [];
        const ray = {
            origin: origin,
            direction: direction.normalized(),
            maxDistance: maxDistance
        };
        
        // Get objects that might intersect the ray
        const potentialObjects = this.spatialGrid.getObjectsInRay(ray);
        
        for (const obj of potentialObjects) {
            if (layerMask && !this.objectMatchesLayerMask(obj, layerMask)) continue;
            
            const hit = this.raycastAABB(ray, obj);
            if (hit) {
                hits.push({
                    object: obj,
                    point: hit.point,
                    normal: hit.normal,
                    distance: hit.distance
                });
            }
        }
        
        // Sort by distance
        hits.sort((a, b) => a.distance - b.distance);
        return hits;
    }
    
    raycastAABB(ray, obj) {
        const bounds = obj.getBounds();
        const tMin = new Vector2(
            (bounds.x - ray.origin.x) / ray.direction.x,
            (bounds.y - ray.origin.y) / ray.direction.y
        );
        const tMax = new Vector2(
            (bounds.x + bounds.width - ray.origin.x) / ray.direction.x,
            (bounds.y + bounds.height - ray.origin.y) / ray.direction.y
        );
        
        const t1 = new Vector2(Math.min(tMin.x, tMax.x), Math.min(tMin.y, tMax.y));
        const t2 = new Vector2(Math.max(tMin.x, tMax.x), Math.max(tMin.y, tMax.y));
        
        const tNear = Math.max(t1.x, t1.y);
        const tFar = Math.min(t2.x, t2.y);
        
        if (tNear > tFar || tFar < 0 || tNear > ray.maxDistance) return null;
        
        const distance = tNear > 0 ? tNear : tFar;
        const point = ray.origin.add(ray.direction.multiply(distance));
        
        // Calculate normal
        let normal;
        if (Math.abs(tNear - t1.x) < 0.001) {
            normal = new Vector2(ray.direction.x > 0 ? -1 : 1, 0);
        } else {
            normal = new Vector2(0, ray.direction.y > 0 ? -1 : 1);
        }
        
        return { point, normal, distance };
    }
    
    objectMatchesLayerMask(obj, layerMask) {
        const objLayers = obj.collisionLayers || ['default'];
        return objLayers.some(layer => layerMask.includes(layer));
    }
    
    // Ground checking for platformers
    isGrounded(obj, groundDistance = 5) {
        const bounds = obj.getBounds();
        const rayOrigin = new Vector2(bounds.x + bounds.width / 2, bounds.y + bounds.height);
        const rayDirection = Vector2.down();
        
        const hits = this.raycast(rayOrigin, rayDirection, groundDistance, ['solid', 'platform']);
        return hits.length > 0;
    }
    
    // Wall checking
    isTouchingWall(obj, direction, wallDistance = 5) {
        const bounds = obj.getBounds();
        const rayOrigin = new Vector2(
            bounds.x + bounds.width / 2 + direction.x * bounds.width / 2,
            bounds.y + bounds.height / 2
        );
        
        const hits = this.raycast(rayOrigin, direction, wallDistance, ['solid']);
        return hits.length > 0;
    }
    
    // Settings
    setGravity(x, y) {
        this.gravity.set(x, y);
    }
    
    setDebugDraw(enabled) {
        this.debugDraw = enabled;
    }
}

/**
 * SpatialGrid - Optimizes collision detection by dividing space into a grid
 */
class SpatialGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }
    
    clear() {
        this.grid.clear();
    }
    
    addObjects(objects) {
        for (const obj of objects) {
            if (obj.active && !obj.destroyed) {
                this.addObject(obj);
            }
        }
    }
    
    addObject(obj) {
        const bounds = obj.getBounds();
        const cells = this.getCellsForBounds(bounds);
        
        for (const cellKey of cells) {
            if (!this.grid.has(cellKey)) {
                this.grid.set(cellKey, []);
            }
            this.grid.get(cellKey).push(obj);
        }
    }
    
    getCellsForBounds(bounds) {
        const cells = [];
        const startX = Math.floor(bounds.x / this.cellSize);
        const endX = Math.floor((bounds.x + bounds.width) / this.cellSize);
        const startY = Math.floor(bounds.y / this.cellSize);
        const endY = Math.floor((bounds.y + bounds.height) / this.cellSize);
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                cells.push(`${x},${y}`);
            }
        }
        
        return cells;
    }
    
    getPotentialCollisionPairs() {
        const pairs = [];
        const checked = new Set();
        
        for (const objects of this.grid.values()) {
            for (let i = 0; i < objects.length; i++) {
                for (let j = i + 1; j < objects.length; j++) {
                    const pairKey = `${Math.min(objects[i].id, objects[j].id)}-${Math.max(objects[i].id, objects[j].id)}`;
                    if (!checked.has(pairKey)) {
                        pairs.push([objects[i], objects[j]]);
                        checked.add(pairKey);
                    }
                }
            }
        }
        
        return pairs;
    }
    
    getObjectsInRay(ray) {
        // Simplified - get objects in cells that the ray passes through
        const objects = new Set();
        const distance = 0;
        const step = this.cellSize / 2;
        
        while (distance < ray.maxDistance) {
            const point = ray.origin.add(ray.direction.multiply(distance));
            const cellKey = `${Math.floor(point.x / this.cellSize)},${Math.floor(point.y / this.cellSize)}`;
            
            if (this.grid.has(cellKey)) {
                for (const obj of this.grid.get(cellKey)) {
                    objects.add(obj);
                }
            }
            
            distance += step;
        }
        
        return Array.from(objects);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Physics, SpatialGrid };
}
