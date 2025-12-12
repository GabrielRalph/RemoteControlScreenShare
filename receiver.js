const { initializeFirebase, getDatabase } = require('./firebase-config');
const { click, move, mouseDown, mouseUp, createOverlayFrame } = require('./module-template');

class RemoteReceiver {
    constructor(sessionId, serviceAccountPath) {
        this.sessionId = sessionId;
        this.database = initializeFirebase(serviceAccountPath);
        this.commandRef = this.database.ref(`sessions/${sessionId}/commands`);
        this.lastProcessedTimestamp = 0;
        this.processedCommands = new Set();
        
        console.log(`Receiver initialized for session: ${sessionId}`);
    }

    start() {
        console.log('Starting receiver - listening for commands...');
        
        createOverlayFrame();

        this.commandRef.on('child_added', (snapshot) => {
            const command = snapshot.val();
            const commandKey = snapshot.key;
            
            if (this.processedCommands.has(commandKey)) {
                return;
            }
            
            if (command.timestamp <= this.lastProcessedTimestamp) {
                return;
            }

            this.executeCommand(command);
            this.processedCommands.add(commandKey);
            this.lastProcessedTimestamp = command.timestamp;

            if (this.processedCommands.size > 1000) {
                const oldestKeys = Array.from(this.processedCommands).slice(0, 500);
                oldestKeys.forEach(key => this.processedCommands.delete(key));
            }
        });

        console.log('Receiver started successfully');
    }

    executeCommand(command) {
        try {
            switch (command.type) {
                case 'move':
                    move(command.x, command.y);
                    break;
                
                case 'click':
                    click(command.x, command.y);
                    break;
                
                case 'mousedown':
                    mouseDown();
                    break;
                
                case 'mouseup':
                    mouseUp();
                    break;
                
                default:
                    console.warn(`Unknown command type: ${command.type}`);
            }
        } catch (error) {
            console.error('Error executing command:', error);
        }
    }

    stop() {
        console.log('Stopping receiver...');
        this.commandRef.off();
        console.log('Receiver stopped');
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
        console.log('Usage: node receiver.js <session-id> <service-account-path>');
        console.log('Example: node receiver.js my-session ./serviceAccountKey.json');
        process.exit(1);
    }

    const [sessionId, serviceAccountPath] = args;
    const receiver = new RemoteReceiver(sessionId, serviceAccountPath);
    
    receiver.clearSession().then(() => {
        receiver.start();
    });

    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        receiver.stop();
        process.exit(0);
    });
}

module.exports = RemoteReceiver;
