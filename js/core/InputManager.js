/**
 * InputManager - Handles keyboard, mouse, and touch input for Echo Genesis
 * Provides a unified interface for input handling across different devices
 */
class InputManager {
    constructor() {
        this.keys = new Map();
        this.keysDown = new Map();
        this.keysUp = new Map();
        this.mouse = {
            position: new Vector2(0, 0),
            buttons: new Map(),
            buttonsDown: new Map(),
            buttonsUp: new Map(),
            wheel: 0
        };
        this.touch = {
            touches: new Map(),
            touchesStarted: new Map(),
            touchesEnded: new Map()
        };
        
        // Input mapping for different control schemes
        this.inputMap = new Map();
        this.setupDefaultInputMap();
        
        // Event listeners
        this.eventListeners = [];
        this.setupEventListeners();
        
        // Input state tracking
        this.inputBuffer = [];
        this.bufferSize = 60; // 1 second at 60fps
        
        // Touch controls for mobile
        this.touchControlsEnabled = false;
        this.virtualButtons = new Map();
    }
    
    setupDefaultInputMap() {
        // Movement
        this.inputMap.set('moveLeft', ['ArrowLeft', 'KeyA']);
        this.inputMap.set('moveRight', ['ArrowRight', 'KeyD']);
        this.inputMap.set('moveUp', ['ArrowUp', 'KeyW']);
        this.inputMap.set('moveDown', ['ArrowDown', 'KeyS']);
        
        // Actions
        this.inputMap.set('jump', [' ', 'Space']);
        this.inputMap.set('attack', ['KeyX']);
        this.inputMap.set('dash', ['ShiftLeft', 'ShiftRight']);
        this.inputMap.set('special', ['KeyZ']);
        this.inputMap.set('interact', ['KeyE']);
        
        // Menu/UI
        this.inputMap.set('pause', ['Escape', 'KeyP']);
        this.inputMap.set('menu', ['Tab']);
        this.inputMap.set('confirm', [' ', 'Enter']);
        this.inputMap.set('cancel', ['Escape']);
        
        // Debug
        this.inputMap.set('debug', ['F1']);
        this.inputMap.set('debugToggle', ['Backquote']); // ` key
    }
    
    setupEventListeners() {
        // Keyboard events
        const keyDownHandler = (e) => {
            this.setKey(e.code, true);
            this.setKeyDown(e.code, true);
            
            // Prevent default for game keys
            if (this.isGameKey(e.code)) {
                e.preventDefault();
            }
        };
        
        const keyUpHandler = (e) => {
            this.setKey(e.code, false);
            this.setKeyUp(e.code, true);
            
            if (this.isGameKey(e.code)) {
                e.preventDefault();
            }
        };
        
        // Mouse events
        const mouseDownHandler = (e) => {
            this.setMouseButton(e.button, true);
            this.setMouseButtonDown(e.button, true);
            e.preventDefault();
        };
        
        const mouseUpHandler = (e) => {
            this.setMouseButton(e.button, false);
            this.setMouseButtonUp(e.button, true);
            e.preventDefault();
        };
        
        const mouseMoveHandler = (e) => {
            this.mouse.position.set(e.clientX, e.clientY);
        };
        
        const mouseWheelHandler = (e) => {
            this.mouse.wheel = e.deltaY;
            e.preventDefault();
        };
        
        // Touch events
        const touchStartHandler = (e) => {
            for (const touch of e.changedTouches) {
                this.setTouch(touch.identifier, {
                    x: touch.clientX,
                    y: touch.clientY,
                    force: touch.force || 1
                });
                this.setTouchStarted(touch.identifier, true);
            }
            e.preventDefault();
        };
        
        const touchMoveHandler = (e) => {
            for (const touch of e.changedTouches) {
                if (this.touch.touches.has(touch.identifier)) {
                    this.touch.touches.get(touch.identifier).x = touch.clientX;
                    this.touch.touches.get(touch.identifier).y = touch.clientY;
                }
            }
            e.preventDefault();
        };
        
        const touchEndHandler = (e) => {
            for (const touch of e.changedTouches) {
                this.setTouchEnded(touch.identifier, true);
                this.touch.touches.delete(touch.identifier);
            }
            e.preventDefault();
        };
        
        // Add event listeners
        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('keyup', keyUpHandler);
        document.addEventListener('mousedown', mouseDownHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('wheel', mouseWheelHandler);
        document.addEventListener('touchstart', touchStartHandler, { passive: false });
        document.addEventListener('touchmove', touchMoveHandler, { passive: false });
        document.addEventListener('touchend', touchEndHandler, { passive: false });
        
        // Store references for cleanup
        this.eventListeners = [
            { element: document, event: 'keydown', handler: keyDownHandler },
            { element: document, event: 'keyup', handler: keyUpHandler },
            { element: document, event: 'mousedown', handler: mouseDownHandler },
            { element: document, event: 'mouseup', handler: mouseUpHandler },
            { element: document, event: 'mousemove', handler: mouseMoveHandler },
            { element: document, event: 'wheel', handler: mouseWheelHandler },
            { element: document, event: 'touchstart', handler: touchStartHandler },
            { element: document, event: 'touchmove', handler: touchMoveHandler },
            { element: document, event: 'touchend', handler: touchEndHandler }
        ];
    }
    
    isGameKey(code) {
        const gameKeys = [
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'KeyA', 'KeyD', 'KeyW', 'KeyS',
            'Space', 'KeyX', 'KeyZ', 'KeyE',
            'ShiftLeft', 'ShiftRight',
            'Escape', 'KeyP', 'Tab', 'Enter',
            'F1', 'Backquote'
        ];
        return gameKeys.includes(code);
    }
    
    // Update method - call once per frame
    update() {
        // Clear per-frame input states
        this.keysDown.clear();
        this.keysUp.clear();
        this.mouse.buttonsDown.clear();
        this.mouse.buttonsUp.clear();
        this.touch.touchesStarted.clear();
        this.touch.touchesEnded.clear();
        this.mouse.wheel = 0;
        
        // Update input buffer for combo detection
        this.updateInputBuffer();
        
        // Update virtual buttons (touch controls)
        this.updateVirtualButtons();
    }
    
    updateInputBuffer() {
        const currentFrame = {
            timestamp: Date.now(),
            keys: new Set(this.keys.keys()),
            mouseButtons: new Set(this.mouse.buttons.keys())
        };
        
        this.inputBuffer.push(currentFrame);
        
        // Keep buffer size manageable
        if (this.inputBuffer.length > this.bufferSize) {
            this.inputBuffer.shift();
        }
    }
    
    updateVirtualButtons() {
        // Update virtual button states for touch controls
        for (const [name, button] of this.virtualButtons) {
            button.wasPressed = button.isPressed;
            button.isPressed = false;
            
            // Check if any touch is over this button
            for (const touch of this.touch.touches.values()) {
                if (this.isPointInButton(touch, button)) {
                    button.isPressed = true;
                    break;
                }
            }
            
            // Set input based on virtual button state
            const mappedKeys = this.inputMap.get(name);
            if (mappedKeys && mappedKeys.length > 0) {
                this.setKey(mappedKeys[0], button.isPressed);
                if (button.isPressed && !button.wasPressed) {
                    this.setKeyDown(mappedKeys[0], true);
                }
                if (!button.isPressed && button.wasPressed) {
                    this.setKeyUp(mappedKeys[0], true);
                }
            }
        }
    }
    
    isPointInButton(point, button) {
        return point.x >= button.x && 
               point.x <= button.x + button.width &&
               point.y >= button.y && 
               point.y <= button.y + button.height;
    }
    
    // Key state methods
    setKey(keyCode, pressed) {
        if (pressed) {
            this.keys.set(keyCode, true);
        } else {
            this.keys.delete(keyCode);
        }
    }
    
    setKeyDown(keyCode, pressed) {
        if (pressed) {
            this.keysDown.set(keyCode, true);
        }
    }
    
    setKeyUp(keyCode, pressed) {
        if (pressed) {
            this.keysUp.set(keyCode, true);
        }
    }
    
    isKeyPressed(keyCode) {
        return this.keys.has(keyCode);
    }
    
    isKeyDown(keyCode) {
        return this.keysDown.has(keyCode);
    }
    
    isKeyUp(keyCode) {
        return this.keysUp.has(keyCode);
    }
    
    // Action-based input methods
    isActionPressed(action) {
        const mappedKeys = this.inputMap.get(action);
        if (!mappedKeys) return false;
        
        return mappedKeys.some(key => this.isKeyPressed(key));
    }
    
    isActionDown(action) {
        const mappedKeys = this.inputMap.get(action);
        if (!mappedKeys) return false;
        
        return mappedKeys.some(key => this.isKeyDown(key));
    }
    
    isActionUp(action) {
        const mappedKeys = this.inputMap.get(action);
        if (!mappedKeys) return false;
        
        return mappedKeys.some(key => this.isKeyUp(key));
    }
    
    // Movement input helpers
    getMovementVector() {
        const movement = new Vector2(0, 0);
        
        if (this.isActionPressed('moveLeft')) movement.x -= 1;
        if (this.isActionPressed('moveRight')) movement.x += 1;
        if (this.isActionPressed('moveUp')) movement.y -= 1;
        if (this.isActionPressed('moveDown')) movement.y += 1;
        
        // Normalize diagonal movement
        if (movement.x !== 0 && movement.y !== 0) {
            movement.normalize();
        }
        
        return movement;
    }
    
    getMovementAxis(axis) {
        if (axis === 'horizontal') {
            let value = 0;
            if (this.isActionPressed('moveLeft')) value -= 1;
            if (this.isActionPressed('moveRight')) value += 1;
            return value;
        } else if (axis === 'vertical') {
            let value = 0;
            if (this.isActionPressed('moveUp')) value -= 1;
            if (this.isActionPressed('moveDown')) value += 1;
            return value;
        }
        return 0;
    }
    
    // Mouse state methods
    setMouseButton(button, pressed) {
        if (pressed) {
            this.mouse.buttons.set(button, true);
        } else {
            this.mouse.buttons.delete(button);
        }
    }
    
    setMouseButtonDown(button, pressed) {
        if (pressed) {
            this.mouse.buttonsDown.set(button, true);
        }
    }
    
    setMouseButtonUp(button, pressed) {
        if (pressed) {
            this.mouse.buttonsUp.set(button, true);
        }
    }
    
    isMouseButtonPressed(button) {
        return this.mouse.buttons.has(button);
    }
    
    isMouseButtonDown(button) {
        return this.mouse.buttonsDown.has(button);
    }
    
    isMouseButtonUp(button) {
        return this.mouse.buttonsUp.has(button);
    }
    
    getMousePosition() {
        return this.mouse.position.copy();
    }
    
    getMouseWheelDelta() {
        return this.mouse.wheel;
    }
    
    // Touch state methods
    setTouch(id, data) {
        this.touch.touches.set(id, data);
    }
    
    setTouchStarted(id, started) {
        if (started) {
            this.touch.touchesStarted.set(id, true);
        }
    }
    
    setTouchEnded(id, ended) {
        if (ended) {
            this.touch.touchesEnded.set(id, true);
        }
    }
    
    getTouches() {
        return Array.from(this.touch.touches.values());
    }
    
    getTouchCount() {
        return this.touch.touches.size;
    }
    
    // Input mapping methods
    mapInput(action, keys) {
        this.inputMap.set(action, Array.isArray(keys) ? keys : [keys]);
    }
    
    addInputMapping(action, key) {
        if (!this.inputMap.has(action)) {
            this.inputMap.set(action, []);
        }
        this.inputMap.get(action).push(key);
    }
    
    removeInputMapping(action, key) {
        if (this.inputMap.has(action)) {
            const keys = this.inputMap.get(action);
            const index = keys.indexOf(key);
            if (index !== -1) {
                keys.splice(index, 1);
            }
        }
    }
    
    // Virtual button methods for touch controls
    addVirtualButton(name, x, y, width, height) {
        this.virtualButtons.set(name, {
            x: x,
            y: y,
            width: width,
            height: height,
            isPressed: false,
            wasPressed: false
        });
    }
    
    removeVirtualButton(name) {
        this.virtualButtons.delete(name);
    }
    
    enableTouchControls() {
        this.touchControlsEnabled = true;
    }
    
    disableTouchControls() {
        this.touchControlsEnabled = false;
        this.virtualButtons.clear();
    }
    
    // Combo detection
    detectCombo(sequence, timeWindow = 1000) {
        if (this.inputBuffer.length < sequence.length) return false;
        
        const now = Date.now();
        let sequenceIndex = 0;
        
        // Check from most recent to oldest
        for (let i = this.inputBuffer.length - 1; i >= 0; i--) {
            const frame = this.inputBuffer[i];
            
            // Check if this frame is within time window
            if (now - frame.timestamp > timeWindow) break;
            
            // Check if current sequence input is in this frame
            const expectedInput = sequence[sequence.length - 1 - sequenceIndex];
            if (frame.keys.has(expectedInput)) {
                sequenceIndex++;
                if (sequenceIndex === sequence.length) return true;
            }
        }
        
        return false;
    }
    
    // Cleanup
    destroy() {
        // Remove all event listeners
        for (const listener of this.eventListeners) {
            listener.element.removeEventListener(listener.event, listener.handler);
        }
        this.eventListeners = [];
        
        // Clear all state
        this.keys.clear();
        this.keysDown.clear();
        this.keysUp.clear();
        this.mouse.buttons.clear();
        this.mouse.buttonsDown.clear();
        this.mouse.buttonsUp.clear();
        this.touch.touches.clear();
        this.touch.touchesStarted.clear();
        this.touch.touchesEnded.clear();
        this.virtualButtons.clear();
        this.inputBuffer = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputManager;
}
