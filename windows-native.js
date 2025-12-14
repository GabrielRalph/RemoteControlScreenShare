const ffi = require('ffi-napi');
const ref = require('ref-napi');

// Define Windows API types
const DWORD = ref.types.uint32;
const LONG = ref.types.long;
const WORD = ref.types.uint16;
const UINT = ref.types.uint32;

// INPUT structure types
const INPUT_MOUSE = 0;
const INPUT_KEYBOARD = 1;

// Mouse event flags
const MOUSEEVENTF_MOVE = 0x0001;
const MOUSEEVENTF_LEFTDOWN = 0x0002;
const MOUSEEVENTF_LEFTUP = 0x0004;
const MOUSEEVENTF_RIGHTDOWN = 0x0008;
const MOUSEEVENTF_RIGHTUP = 0x0010;
const MOUSEEVENTF_MIDDLEDOWN = 0x0020;
const MOUSEEVENTF_MIDDLEUP = 0x0040;
const MOUSEEVENTF_ABSOLUTE = 0x8000;

// Define MOUSEINPUT structure
const MOUSEINPUT = ref.types.void;

// Define INPUT structure
const INPUT = ref.types.void;

// Load User32.dll
const user32 = ffi.Library('user32', {
    'SetCursorPos': ['bool', ['int', 'int']],
    'GetCursorPos': ['bool', [ref.refType(ref.types.void)]],
    'SendInput': ['uint', ['uint', ref.refType(INPUT), 'int']],
    'GetSystemMetrics': ['int', ['int']]
});

// System metrics constants
const SM_CXSCREEN = 0;
const SM_CYSCREEN = 1;

/**
 * Get screen dimensions
 */
function getScreenSize() {
    const width = user32.GetSystemMetrics(SM_CXSCREEN);
    const height = user32.GetSystemMetrics(SM_CYSCREEN);
    return { width, height };
}

/**
 * Convert absolute coordinates to normalized coordinates (0-65535)
 */
function toNormalizedCoords(x, y) {
    const screen = getScreenSize();
    const normalizedX = Math.round((x * 65535) / screen.width);
    const normalizedY = Math.round((y * 65535) / screen.height);
    return { x: normalizedX, y: normalizedY };
}

/**
 * Simulates moving the mouse to the specified (x, y) coordinates.
 * Uses SetCursorPos for direct, immediate positioning.
 *
 * @param {number} x - The x-coordinate to move to.
 * @param {number} y - The y-coordinate to move to.
 */
function move(x, y) {
    try {
        const result = user32.SetCursorPos(Math.round(x), Math.round(y));
        if (!result) {
            console.error('SetCursorPos failed');
        }
    } catch (error) {
        console.error('Error moving mouse:', error);
    }
}

/**
 * Simulates a virtual click at the specified (x, y) coordinates.
 *
 * @param {number} x - The x-coordinate of the click.
 * @param {number} y - The y-coordinate of the click.
 */
function click(x, y) {
    try {
        // Move to position
        move(x, y);
        
        // Small delay to ensure position is set
        const start = Date.now();
        while (Date.now() - start < 10) {}
        
        // Perform click (down then up)
        mouseDown();
        
        // Small delay between down and up
        const start2 = Date.now();
        while (Date.now() - start2 < 50) {}
        
        mouseUp();
    } catch (error) {
        console.error('Error clicking mouse:', error);
    }
}

/**
 * Simulates a mouse down event (press left button).
 */
function mouseDown() {
    try {
        // Create INPUT structure for mouse down
        const inputSize = 28; // Size of INPUT structure
        const input = Buffer.alloc(inputSize);
        
        // Set type to INPUT_MOUSE
        input.writeUInt32LE(INPUT_MOUSE, 0);
        
        // Set dwFlags to MOUSEEVENTF_LEFTDOWN
        input.writeUInt32LE(MOUSEEVENTF_LEFTDOWN, 8);
        
        const result = user32.SendInput(1, input, inputSize);
        if (result === 0) {
            console.error('SendInput (mouseDown) failed');
        }
    } catch (error) {
        console.error('Error in mouseDown:', error);
    }
}

/**
 * Simulates a mouse up event (release left button).
 */
function mouseUp() {
    try {
        // Create INPUT structure for mouse up
        const inputSize = 28; // Size of INPUT structure
        const input = Buffer.alloc(inputSize);
        
        // Set type to INPUT_MOUSE
        input.writeUInt32LE(INPUT_MOUSE, 0);
        
        // Set dwFlags to MOUSEEVENTF_LEFTUP
        input.writeUInt32LE(MOUSEEVENTF_LEFTUP, 8);
        
        const result = user32.SendInput(1, input, inputSize);
        if (result === 0) {
            console.error('SendInput (mouseUp) failed');
        }
    } catch (error) {
        console.error('Error in mouseUp:', error);
    }
}

/**
 * Get current mouse position
 */
function getMousePos() {
    try {
        const point = Buffer.alloc(8); // POINT structure is 8 bytes (2 LONGs)
        const result = user32.GetCursorPos(point);
        
        if (result) {
            const x = point.readInt32LE(0);
            const y = point.readInt32LE(4);
            return { x, y };
        } else {
            console.error('GetCursorPos failed');
            return { x: 0, y: 0 };
        }
    } catch (error) {
        console.error('Error getting mouse position:', error);
        return { x: 0, y: 0 };
    }
}

/**
 * Creates a border around the viewport to show what the user 
 * is currently sharing (Windows implementation).
 */
function createOverlayFrame() {
    const { spawn } = require('child_process');
    const path = require('path');
    
    const overlayPath = path.join(__dirname, 'Examples', 'example-overlay-windows.js');
    const electronPath = require('electron');
    
    try {
        spawn(electronPath, [overlayPath], {
            detached: true,
            stdio: 'ignore'
        }).unref();
    } catch (error) {
        console.error('Error creating overlay frame:', error);
    }
}

module.exports = { 
    click, 
    mouseDown, 
    mouseUp, 
    move, 
    getMousePos,
    createOverlayFrame,
    getScreenSize
};
