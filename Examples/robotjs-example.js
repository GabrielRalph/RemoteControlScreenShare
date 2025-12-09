const robot = require("robotjs");

// Move mouse to (x, y)
robot.moveMouse(700, 200);

// Drag mouse
robot.mouseToggle("down");
robot.moveMouse(700, 600);
robot.mouseToggle("up");