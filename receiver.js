const { initializeFirebase, getDatabase } = require('./firebase-config');
const { click, move, mouseDown, mouseUp, createOverlayFrame } = require('./module-template');

class RemoteReceiver {
    constructor(sessionId, serviceAccountPath) {
        this.sessionId = sessionId;
        this.database = initializeFirebase(serviceAccountPath);
        this.sessionRef = this.database.ref(`sessions/${sessionId}`);
        this.mouseXRef = this.sessionRef.child('mouseX');
        this.mouseYRef = this.sessionRef.child('mouseY');
        this.actionRef = this.sessionRef.child('action');
        this.lastAction = null;
        this.lastActionTimestamp = 0;
        
        console.log(`Receiver initialized for session: ${sessionId}`);
    }

    start() {
        console.log('Starting receiver - listening for mouse state...');
        
        createOverlayFrame();

        this.sessionRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            if (data.mouseX !== undefined && data.mouseY !== undefined) {
                move(data.mouseX, data.mouseY);
            }

            if (data.action && data.actionTimestamp > this.lastActionTimestamp) {
                this.executeAction(data.action);
                this.lastActionTimestamp = data.actionTimestamp;
            }
        });

        console.log('Receiver started successfully');
    }

    executeAction(action) {
        try {
            switch (action.type) {
                case 'click':
                    click(action.x, action.y);
                    break;
                
                case 'mousedown':
                    mouseDown();
                    break;
                
                case 'mouseup':
                    mouseUp();
                    break;
                
                default:
                    console.warn(`Unknown action type: ${action.type}`);
            }
        } catch (error) {
            console.error('Error executing action:', error);
        }
    }

    stop() {
        console.log('Stopping receiver...');
        this.sessionRef.off();
        console.log('Receiver stopped');
    }

    async clearSession() {
        try {
            await this.sessionRef.remove();
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
