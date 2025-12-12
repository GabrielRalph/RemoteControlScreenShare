const { initializeFirebase, getDatabase } = require('./firebase-config');
const ioHook = require('iohook');

class RemoteController {
    constructor(sessionId, serviceAccountPath) {
        this.sessionId = sessionId;
        this.database = initializeFirebase(serviceAccountPath);
        this.commandRef = this.database.ref(`sessions/${sessionId}/commands`);
        this.isMouseDown = false;
        
        console.log(`Controller initialized for session: ${sessionId}`);
    }

    start() {
        console.log('Starting controller - capturing mouse events...');
        
        ioHook.on('mousemove', event => {
            this.sendCommand({
                type: 'move',
                x: event.x,
                y: event.y,
                timestamp: Date.now()
            });
        });

        ioHook.on('mousedown', event => {
            this.isMouseDown = true;
            this.sendCommand({
                type: 'mousedown',
                x: event.x,
                y: event.y,
                button: event.button,
                timestamp: Date.now()
            });
        });

        ioHook.on('mouseup', event => {
            this.isMouseDown = false;
            this.sendCommand({
                type: 'mouseup',
                x: event.x,
                y: event.y,
                button: event.button,
                timestamp: Date.now()
            });
        });

        ioHook.on('mouseclick', event => {
            this.sendCommand({
                type: 'click',
                x: event.x,
                y: event.y,
                button: event.button,
                timestamp: Date.now()
            });
        });

        ioHook.start();
        console.log('Controller started successfully');
    }

    sendCommand(command) {
        this.commandRef.push(command)
            .catch(error => {
                console.error('Error sending command:', error);
            });
    }

    stop() {
        console.log('Stopping controller...');
        ioHook.stop(); // Stop listening
        ioHook.unload();
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
