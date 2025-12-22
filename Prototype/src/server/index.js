const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve viewer page, make it accessible through http
app.use(express.static(path.join(__dirname, '../public')));

// Track connected clients
let presenter = null;
const viewers = new Set();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  // Client joins as presenter
  socket.on('join-presenter', () => {
    if (presenter) {
      socket.emit('error', 'Presenter already exists');
      return;
    }
    
    presenter = socket.id;
    socket.role = 'presenter';
    console.log('Presenter joined:', socket.id);
    
    // Tell viewers presenter is ready
    viewers.forEach(viewerId => {
      io.to(viewerId).emit('presenter-ready');
    });
    
    // ✅ FIX: Tell presenter about existing viewers
    viewers.forEach(viewerId => {
      socket.emit('viewer-joined', { viewerId: viewerId });
    });
  });
  // Client joins as viewer
  socket.on('join-viewer', () => {
    viewers.add(socket.id);
    socket.role = 'viewer';
    console.log('Viewer joined:', socket.id, '(total:', viewers.size, ')');
    
    // Tell presenter about new viewer
    if (presenter) {
      io.to(presenter).emit('viewer-joined', { viewerId: socket.id });
      socket.emit('presenter-ready');
    }
  });

  // Forward WebRTC signaling messages
  socket.on('offer', ({ targetId, offer }) => {
    console.log('Forwarding offer to', targetId);
    io.to(targetId).emit('offer', { senderId: socket.id, offer });
  });

  socket.on('answer', ({ targetId, answer }) => {
    console.log('Forwarding answer to', targetId);
    io.to(targetId).emit('answer', { senderId: socket.id, answer });
  });

  socket.on('ice-candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('ice-candidate', { senderId: socket.id, candidate });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    if (socket.id === presenter) {
      console.log('Presenter left');
      presenter = null;
      viewers.forEach(viewerId => {
        io.to(viewerId).emit('presenter-left');
      });
    } else {
      viewers.delete(socket.id);
      if (presenter) {
        io.to(presenter).emit('viewer-left', { viewerId: socket.id });
      }
    }
  });
});

server.listen(3000, () => {
  console.log('Signaling server running on http://localhost:3000');
  console.log('Open http://localhost:3000 in browser to view stream');
});