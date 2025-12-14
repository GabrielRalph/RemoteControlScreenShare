const os = require('os');

// Use platform-specific implementation
let platformModule;
if (os.platform() === 'win32') {
    // Try native Windows implementation first
    try {
        platformModule = require('./build/Release/windows_native.node');
        console.log('Using native Windows implementation');
    } catch (error) {
        console.warn('Native Windows module not found, falling back to FFI implementation');
        platformModule = require('./windows-native');
    }
} else if (os.platform() === 'darwin') {
    // Try native macOS implementation first
    try {
        platformModule = require('./build/Release/macos_native.node');
        console.log('Using native macOS implementation');
    } catch (error) {
        console.warn('Native macOS module not found, falling back to cross-platform');
        const { mouse, Button } = require('@nut-tree/nut-js');
        platformModule = {
            click: async (x, y) => {
                await mouse.setPosition({ x, y });
                await mouse.click(Button.LEFT);
            },
            move: async (x, y) => {
                await mouse.setPosition({ x, y });
            },
            mouseDown: async () => {
                await mouse.pressButton(Button.LEFT);
            },
            mouseUp: async () => {
                await mouse.releaseButton(Button.LEFT);
            }
        };
    }
} else {
    // Fallback to cross-platform library for Linux and others
    const { mouse, Button } = require('@nut-tree/nut-js');
    platformModule = {
        click: async (x, y) => {
            await mouse.setPosition({ x, y });
            await mouse.click(Button.LEFT);
        },
        move: async (x, y) => {
            await mouse.setPosition({ x, y });
        },
        mouseDown: async () => {
            await mouse.pressButton(Button.LEFT);
        },
        mouseUp: async () => {
            await mouse.releaseButton(Button.LEFT);
        }
    };
}

/**
 * Simulates a virtual click at the specified (x, y) coordinates.
 *
 * @param {number} x - The x-coordinate of the click.
 * @param {number} y - The y-coordinate of the click.
 */
function click(x, y) {
    return platformModule.click(x, y);
}

/**
 * Simulates moving the mouse to the specified (x, y) coordinates.
 *
 * @param {number} x - The x-coordinate to move to.
 * @param {number} y - The y-coordinate to move to.
 */
function move(x, y) {
    return platformModule.move(x, y);
}

/**
 * Simulates a mouse down event.
 */
function mouseDown() {
    return platformModule.mouseDown();
}

/**
 * Simulates a mouse up event.
 */
function mouseUp() {
    return platformModule.mouseUp();
}

/**
 * Creates a border around the viewport to show what the user 
 * is currently sharing.
 */
function createOverlayFrame() {
    // Try to use native implementation if available
    if (platformModule.createOverlayFrame) {
        return platformModule.createOverlayFrame();
    }
    
    // Fallback to Electron-based overlay
    const { exec, spawn } = require('child_process');
    const path = require('path');
    const os = require('os');
    
    if (os.platform() === 'darwin') {
        const overlayPath = path.join(__dirname, 'Examples', 'example-overlay-mac-os');
        exec(overlayPath, (error) => {
            if (error) {
                console.error('Error creating overlay:', error);
            }
        });
    } else if (os.platform() === 'win32') {
        const overlayPath = path.join(__dirname, 'Examples', 'example-overlay-windows.js');
        const electronPath = require('electron');
        spawn(electronPath, [overlayPath], {
            detached: true,
            stdio: 'ignore'
        }).unref();
    } else {
        console.log('Overlay frame is currently only supported on macOS and Windows');
    }
}

module.exports = { click, mouseDown, mouseUp, move, createOverlayFrame };