/**
 * Collision Detection Utilities
 * Provides helper functions for various collision detection scenarios
 */

export class CollisionDetection {
    /**
     * Check if two rectangles overlap
     * @param {Object} rect1 - First rectangle {x, y, width, height}
     * @param {Object} rect2 - Second rectangle {x, y, width, height}
     * @returns {boolean} True if rectangles overlap
     */
    static rectOverlap(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    /**
     * Check if a point is inside a rectangle
     * @param {Object} point - Point {x, y}
     * @param {Object} rect - Rectangle {x, y, width, height}
     * @returns {boolean} True if point is inside rectangle
     */
    static pointInRect(point, rect) {
        return point.x >= rect.x &&
               point.x <= rect.x + rect.width &&
               point.y >= rect.y &&
               point.y <= rect.y + rect.height;
    }

    /**
     * Check if two circles overlap
     * @param {Object} circle1 - First circle {x, y, radius}
     * @param {Object} circle2 - Second circle {x, y, radius}
     * @returns {boolean} True if circles overlap
     */
    static circleOverlap(circle1, circle2) {
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < circle1.radius + circle2.radius;
    }

    /**
     * Check if a circle and rectangle overlap
     * @param {Object} circle - Circle {x, y, radius}
     * @param {Object} rect - Rectangle {x, y, width, height}
     * @returns {boolean} True if they overlap
     */
    static circleRectOverlap(circle, rect) {
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
        
        const dx = circle.x - closestX;
        const dy = circle.y - closestY;
        
        return (dx * dx + dy * dy) < (circle.radius * circle.radius);
    }

    /**
     * Get the overlap area between two rectangles
     * @param {Object} rect1 - First rectangle
     * @param {Object} rect2 - Second rectangle
     * @returns {Object|null} Overlap rectangle or null if no overlap
     */
    static getOverlapRect(rect1, rect2) {
        if (!this.rectOverlap(rect1, rect2)) return null;

        const left = Math.max(rect1.x, rect2.x);
        const right = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
        const top = Math.max(rect1.y, rect2.y);
        const bottom = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);

        return {
            x: left,
            y: top,
            width: right - left,
            height: bottom - top
        };
    }

    /**
     * Calculate the minimum translation vector to separate two overlapping rectangles
     * @param {Object} rect1 - Moving rectangle
     * @param {Object} rect2 - Static rectangle
     * @returns {Object} MTV {x, y} or null if no overlap
     */
    static getMTV(rect1, rect2) {
        const overlap = this.getOverlapRect(rect1, rect2);
        if (!overlap) return null;

        // Determine the shortest separation axis
        const mtv = { x: 0, y: 0 };
        
        if (overlap.width < overlap.height) {
            // Separate horizontally
            mtv.x = (rect1.x + rect1.width / 2 < rect2.x + rect2.width / 2) 
                ? -overlap.width : overlap.width;
        } else {
            // Separate vertically
            mtv.y = (rect1.y + rect1.height / 2 < rect2.y + rect2.height / 2) 
                ? -overlap.height : overlap.height;
        }

        return mtv;
    }

    /**
     * Perform a line-rectangle intersection test
     * @param {Object} lineStart - Line start point {x, y}
     * @param {Object} lineEnd - Line end point {x, y}
     * @param {Object} rect - Rectangle {x, y, width, height}
     * @returns {Object|null} Intersection point or null
     */
    static lineRectIntersection(lineStart, lineEnd, rect) {
        const left = rect.x;
        const right = rect.x + rect.width;
        const top = rect.y;
        const bottom = rect.y + rect.height;

        // Check intersection with each edge of the rectangle
        const intersections = [];

        // Top edge
        const topIntersect = this.lineIntersection(
            lineStart, lineEnd,
            { x: left, y: top }, { x: right, y: top }
        );
        if (topIntersect) intersections.push(topIntersect);

        // Bottom edge
        const bottomIntersect = this.lineIntersection(
            lineStart, lineEnd,
            { x: left, y: bottom }, { x: right, y: bottom }
        );
        if (bottomIntersect) intersections.push(bottomIntersect);

        // Left edge
        const leftIntersect = this.lineIntersection(
            lineStart, lineEnd,
            { x: left, y: top }, { x: left, y: bottom }
        );
        if (leftIntersect) intersections.push(leftIntersect);

        // Right edge
        const rightIntersect = this.lineIntersection(
            lineStart, lineEnd,
            { x: right, y: top }, { x: right, y: bottom }
        );
        if (rightIntersect) intersections.push(rightIntersect);

        // Return the closest intersection
        if (intersections.length === 0) return null;

        let closest = intersections[0];
        let closestDist = this.distanceSquared(lineStart, closest);

        for (let i = 1; i < intersections.length; i++) {
            const dist = this.distanceSquared(lineStart, intersections[i]);
            if (dist < closestDist) {
                closest = intersections[i];
                closestDist = dist;
            }
        }

        return closest;
    }

    /**
     * Check if two line segments intersect
     * @param {Object} line1Start - First line start
     * @param {Object} line1End - First line end
     * @param {Object} line2Start - Second line start
     * @param {Object} line2End - Second line end
     * @returns {Object|null} Intersection point or null
     */
    static lineIntersection(line1Start, line1End, line2Start, line2End) {
        const x1 = line1Start.x, y1 = line1Start.y;
        const x2 = line1End.x, y2 = line1End.y;
        const x3 = line2Start.x, y3 = line2Start.y;
        const x4 = line2End.x, y4 = line2End.y;

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-10) return null; // Lines are parallel

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }

        return null;
    }

    /**
     * Calculate squared distance between two points (faster than distance)
     * @param {Object} point1 - First point {x, y}
     * @param {Object} point2 - Second point {x, y}
     * @returns {number} Squared distance
     */
    static distanceSquared(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return dx * dx + dy * dy;
    }

    /**
     * Calculate distance between two points
     * @param {Object} point1 - First point {x, y}
     * @param {Object} point2 - Second point {x, y}
     * @returns {number} Distance
     */
    static distance(point1, point2) {
        return Math.sqrt(this.distanceSquared(point1, point2));
    }

    /**
     * Check if a point is on a line segment
     * @param {Object} point - Point to check
     * @param {Object} lineStart - Line start point
     * @param {Object} lineEnd - Line end point
     * @param {number} tolerance - Distance tolerance
     * @returns {boolean} True if point is on line
     */
    static pointOnLine(point, lineStart, lineEnd, tolerance = 1) {
        const dist1 = this.distance(point, lineStart);
        const dist2 = this.distance(point, lineEnd);
        const lineLength = this.distance(lineStart, lineEnd);
        
        return Math.abs(dist1 + dist2 - lineLength) < tolerance;
    }

    /**
     * Get the closest point on a line segment to a given point
     * @param {Object} point - Target point
     * @param {Object} lineStart - Line start point
     * @param {Object} lineEnd - Line end point
     * @returns {Object} Closest point on line
     */
    static closestPointOnLine(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        
        if (dx === 0 && dy === 0) return { ...lineStart };
        
        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
        const clampedT = Math.max(0, Math.min(1, t));
        
        return {
            x: lineStart.x + clampedT * dx,
            y: lineStart.y + clampedT * dy
        };
    }

    /**
     * Check if a rectangle is completely inside another rectangle
     * @param {Object} inner - Inner rectangle
     * @param {Object} outer - Outer rectangle
     * @returns {boolean} True if inner is completely inside outer
     */
    static rectInside(inner, outer) {
        return inner.x >= outer.x &&
               inner.y >= outer.y &&
               inner.x + inner.width <= outer.x + outer.width &&
               inner.y + inner.height <= outer.y + outer.height;
    }

    /**
     * Expand a rectangle by a given amount
     * @param {Object} rect - Rectangle to expand
     * @param {number} amount - Amount to expand by
     * @returns {Object} Expanded rectangle
     */
    static expandRect(rect, amount) {
        return {
            x: rect.x - amount,
            y: rect.y - amount,
            width: rect.width + amount * 2,
            height: rect.height + amount * 2
        };
    }

    /**
     * Create a bounding box from a set of points
     * @param {Array} points - Array of points {x, y}
     * @returns {Object} Bounding rectangle
     */
    static boundingBox(points) {
        if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
        
        let minX = points[0].x;
        let maxX = points[0].x;
        let minY = points[0].y;
        let maxY = points[0].y;
        
        for (let i = 1; i < points.length; i++) {
            minX = Math.min(minX, points[i].x);
            maxX = Math.max(maxX, points[i].x);
            minY = Math.min(minY, points[i].y);
            maxY = Math.max(maxY, points[i].y);
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
}
