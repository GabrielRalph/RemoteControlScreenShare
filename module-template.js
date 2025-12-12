const { mouse, Button } = require('@nut-tree/nut-js');

/**
 * Simulates a virtual click at the specified (x, y) coordinates.
 *
 * @param {number} x - The x-coordinate of the click.
 * @param {number} y - The y-coordinate of the click.
 */
async function click(x, y) {
    await mouse.setPosition({ x, y });
    await mouse.click(Button.LEFT);
}

/**
 * Simulates moving the mouse to the specified (x, y) coordinates.
 *
 * @param {number} x - The x-coordinate to move to.
 * @param {number} y - The y-coordinate to move to.
 */
async function move(x, y) {
    await mouse.setPosition({ x, y });
}

/**
 * Simulates a mouse down event.
 */
async function mouseDown() {
    await mouse.pressButton(Button.LEFT);
}

/** * Simulates a mouse up event.
 */
async function mouseUp() {
    await mouse.releaseButton(Button.LEFT);
}

/**
 * Creates a border around the viewport to show what the user 
 * is currently sharing.
 */
function createOverlayFrame() {
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