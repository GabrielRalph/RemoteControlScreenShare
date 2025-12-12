const { initializeFirebase } = require('./firebase-config');
const robot = require('robotjs');

class RemoteController {
    constructor(sessionId, serviceAccountPath) {
        this.sessionId = sessionId;
        this.database = initializeFirebase(serviceAccountPath);
        this.commandRef = this.database.ref(`sessions/${sessionId}/commands`);
        this.lastPos = { x: 0, y: 0 };
        this.pollInterval = null;
        
        console.log(`Controller initialized for session: ${sessionId}`);
    }

    start() {
        console.log('Starting controller - capturing mouse position...');
        
        // Poll mouse position every 16ms (~60fps)
        this.pollInterval = setInterval(() => {
            const pos = robot.getMousePos();
            
            // Only send if position changed
            if (pos.x !== this.lastPos.x || pos.y !== this.lastPos.y) {
                this.sendCommand({
                    type: 'move',
                    x: pos.x,
                    y: pos.y,
                    timestamp: Date.now()
                });
                
                this.lastPos = { x: pos.x, y: pos.y };
            }
        }, 16);
        
        console.log('Controller started successfully');
        console.log('Move your mouse to send commands. Press Ctrl+C to stop.');
    }

    sendCommand(command) {
        this.commandRef.push(command)
            .catch(error => {
                console.error('Error sending command:', error);
            });
    }

    stop() {
        console.log('Stopping controller...');
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        console.log('Controller stopped');
    }

    async clearSession() {
        try {
            await this.commandRef.remove();
            console.log('Session cleared');
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Usage: node controller.js <session-id> <service-account-path>');
        console.log('Example: node controller.js my-session ./serviceAccountKey.json');
        process.exit(1);
    }

    const [sessionId, serviceAccountPath] = args;
    const controller = new RemoteController(sessionId, serviceAccountPath);
    
    controller.clearSession().then(() => {
        controller.start();
    });

    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        controller.stop();
        process.exit(0);
    });
}

module.exports = RemoteController;