const admin = require('firebase-admin');

let database = null;

function initializeFirebase(serviceAccountPath) {
    try {
        const serviceAccount = require(serviceAccountPath);
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: serviceAccount.databaseURL || `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
        });
        
        database = admin.database();
        console.log('Firebase initialized successfully');
        return database;
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        throw error;
    }
}

function getDatabase() {
    if (!database) {
        throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }
    return database;
}

module.exports = { initializeFirebase, getDatabase };
