
import { createRequire } from "node:module";

/**
 * Load native extension module
 */
const require = createRequire(import.meta.url);
const native = require("./build/Release/remote_control.node");

/**
 * Perform a left mouse click at specified coordinates
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function click(x, y) {
  return native.click(x, y);
}

/**
 * Move mouse cursor to specified coordinates
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function move(x, y) {
  return native.move(x, y);
}

/**
 * Press left mouse button
 * @param {number} [x] - Optional X coordinate for mouse down position
 * @param {number} [y] - Optional Y coordinate for mouse down position
 * If coordinates are not provided, uses current mouse position
 */
function mouseDown(x, y) {
  if (x !== undefined && y !== undefined) {
    return native.mouseDown(x, y);
  } else {
    return native.mouseDown();
  }
}

/**
 * Release left mouse button
 * @param {number} [x] - Optional X coordinate for mouse up position
 * @param {number} [y] - Optional Y coordinate for mouse up position
 * If coordinates are not provided, uses current mouse position
 */
function mouseUp(x, y) {
  if (x !== undefined && y !== undefined) {
    return native.mouseUp(x, y);
  } else {
    return native.mouseUp();
  }
}

/**
 * Create overlay frame with rounded top corners
 * Displays a border overlay on the screen
 */
function createOverlayFrame() {
  return native.createOverlayFrame();
}

export { click, mouseDown, mouseUp, move, createOverlayFrame };