/**
 * Vector2 - 2D Vector utility class for Echo Genesis
 * Handles position, velocity, and mathematical operations
 */
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    // Static methods for common vectors
    static zero() {
        return new Vector2(0, 0);
    }
    
    static one() {
        return new Vector2(1, 1);
    }
    
    static up() {
        return new Vector2(0, -1);
    }
    
    static down() {
        return new Vector2(0, 1);
    }
    
    static left() {
        return new Vector2(-1, 0);
    }
    
    static right() {
        return new Vector2(1, 0);
    }
    
    // Basic operations
    add(other) {
        if (typeof other === 'number') {
            return new Vector2(this.x + other, this.y + other);
        }
        return new Vector2(this.x + other.x, this.y + other.y);
    }
    
    subtract(other) {
        if (typeof other === 'number') {
            return new Vector2(this.x - other, this.y - other);
        }
        return new Vector2(this.x - other.x, this.y - other.y);
    }
    
    multiply(scalar) {
        if (typeof scalar === 'number') {
            return new Vector2(this.x * scalar, this.y * scalar);
        }
        return new Vector2(this.x * scalar.x, this.y * scalar.y);
    }
    
    divide(scalar) {
        if (typeof scalar === 'number') {
            return new Vector2(this.x / scalar, this.y / scalar);
        }
        return new Vector2(this.x / scalar.x, this.y / scalar.y);
    }
    
    // In-place operations
    addInPlace(other) {
        if (typeof other === 'number') {
            this.x += other;
            this.y += other;
        } else {
            this.x += other.x;
            this.y += other.y;
        }
        return this;
    }
    
    subtractInPlace(other) {
        if (typeof other === 'number') {
            this.x -= other;
            this.y -= other;
        } else {
            this.x -= other.x;
            this.y -= other.y;
        }
        return this;
    }
    
    multiplyInPlace(scalar) {
        if (typeof scalar === 'number') {
            this.x *= scalar;
            this.y *= scalar;
        } else {
            this.x *= scalar.x;
            this.y *= scalar.y;
        }
        return this;
    }
    
    divideInPlace(scalar) {
        if (typeof scalar === 'number') {
            this.x /= scalar;
            this.y /= scalar;
        } else {
            this.x /= scalar.x;
            this.y /= scalar.y;
        }
        return this;
    }
    
    // Vector properties
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    magnitudeSquared() {
        return this.x * this.x + this.y * this.y;
    }
    
    normalized() {
        const mag = this.magnitude();
        if (mag === 0) return Vector2.zero();
        return new Vector2(this.x / mag, this.y / mag);
    }
    
    normalize() {
        const mag = this.magnitude();
        if (mag > 0) {
            this.x /= mag;
            this.y /= mag;
        }
        return this;
    }
    
    // Distance and dot product
    distance(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    distanceSquared(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return dx * dx + dy * dy;
    }
    
    dot(other) {
        return this.x * other.x + this.y * other.y;
    }
    
    cross(other) {
        return this.x * other.y - this.y * other.x;
    }
    
    // Angle operations
    angle() {
        return Math.atan2(this.y, this.x);
    }
    
    angleTo(other) {
        return Math.atan2(other.y - this.y, other.x - this.x);
    }
    
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }
    
    rotateInPlace(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const newX = this.x * cos - this.y * sin;
        const newY = this.x * sin + this.y * cos;
        this.x = newX;
        this.y = newY;
        return this;
    }
    
    // Interpolation
    lerp(other, t) {
        return new Vector2(
            this.x + (other.x - this.x) * t,
            this.y + (other.y - this.y) * t
        );
    }
    
    lerpInPlace(other, t) {
        this.x += (other.x - this.x) * t;
        this.y += (other.y - this.y) * t;
        return this;
    }
    
    // Clamping
    clamp(min, max) {
        return new Vector2(
            Math.max(min.x, Math.min(max.x, this.x)),
            Math.max(min.y, Math.min(max.y, this.y))
        );
    }
    
    clampMagnitude(maxLength) {
        const mag = this.magnitude();
        if (mag > maxLength) {
            return this.normalized().multiply(maxLength);
        }
        return new Vector2(this.x, this.y);
    }
    
    // Reflection
    reflect(normal) {
        const dot = this.dot(normal);
        return this.subtract(normal.multiply(2 * dot));
    }
    
    // Perpendicular vectors
    perpendicular() {
        return new Vector2(-this.y, this.x);
    }
    
    // Utility methods
    copy() {
        return new Vector2(this.x, this.y);
    }
    
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    
    setFromVector(other) {
        this.x = other.x;
        this.y = other.y;
        return this;
    }
    
    equals(other, tolerance = 0.0001) {
        return Math.abs(this.x - other.x) < tolerance && 
               Math.abs(this.y - other.y) < tolerance;
    }
    
    isZero(tolerance = 0.0001) {
        return Math.abs(this.x) < tolerance && Math.abs(this.y) < tolerance;
    }
    
    floor() {
        return new Vector2(Math.floor(this.x), Math.floor(this.y));
    }
    
    ceil() {
        return new Vector2(Math.ceil(this.x), Math.ceil(this.y));
    }
    
    round() {
        return new Vector2(Math.round(this.x), Math.round(this.y));
    }
    
    abs() {
        return new Vector2(Math.abs(this.x), Math.abs(this.y));
    }
    
    // String representation
    toString() {
        return `Vector2(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }
    
    // JSON serialization
    toJSON() {
        return { x: this.x, y: this.y };
    }
    
    static fromJSON(json) {
        return new Vector2(json.x, json.y);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Vector2;
}
