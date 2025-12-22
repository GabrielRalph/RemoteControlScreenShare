const { ipcRenderer } = require('electron'); // Talk with Electron main process
const io = require('socket.io-client');

class PresenterApp {
  constructor() {
    // WebRTC configuration
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Stun server to discover public IP address
      ]
    };
    
    this.socket = null;
    this.peerConnections = new Map(); // Track connections to each viewer
    this.localStream = null;
    
    this.elements = {
      shareBtn: document.getElementById('shareBtn'),
      stopBtn: document.getElementById('stopBtn'),
      preview: document.getElementById('preview'),
      status: document.getElementById('status'),
      viewerCount: document.getElementById('viewerCount')
    };

    this.init();
  }

  init() {
    // Button click handlers
    this.elements.shareBtn.onclick = () => {
      ipcRenderer.send('open-picker');
    };

    this.elements.stopBtn.onclick = () => {
      this.stopSharing();
    };

    // Listen for selected screen from picker
    ipcRenderer.on('start-capture', async (event, sourceId) => {
      await this.startCapture(sourceId);
    });
  }

  async startCapture(sourceId) {
    try {
      // STEP 1: Capture the screen
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId
          }
        }
      });

      // Show preview
      this.elements.preview.srcObject = this.localStream;

      // STEP 2: Connect to signaling server
      this.connectToSignalingServer();

      // Update UI
      this.elements.shareBtn.style.display = 'none';
      this.elements.stopBtn.style.display = 'inline-block';
      this.updateStatus('Waiting for viewers...');

    } catch (error) {
      console.error('Failed to capture:', error);
      alert('Error: ' + error.message);
    }
  }

  connectToSignalingServer() {
    this.socket = io('http://localhost:3000');

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.socket.emit('join-presenter');
    });

    // STEP 3: When a viewer joins, create WebRTC connection
    this.socket.on('viewer-joined', async ({ viewerId }) => {
      console.log('Viewer joined:', viewerId);
      await this.createPeerConnection(viewerId);
      this.updateViewerCount();
    });

    this.socket.on('viewer-left', ({ viewerId }) => {
      console.log('Viewer left:', viewerId);
      this.closePeerConnection(viewerId);
      this.updateViewerCount();
    });

    // STEP 4: Handle WebRTC answers from viewers
    this.socket.on('answer', async ({ senderId, answer }) => {
      const pc = this.peerConnections.get(senderId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Answer received from', senderId);
      }
    });

    // STEP 5: Handle ICE candidates
    this.socket.on('ice-candidate', async ({ senderId, candidate }) => {
      const pc = this.peerConnections.get(senderId);
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }

  async createPeerConnection(viewerId) {
    // Create new RTCPeerConnection (NATIVE WEBRTC API)
    const pc = new RTCPeerConnection(this.config);

    // Add our screen stream to this connection
    this.localStream.getTracks().forEach(track => {
      pc.addTrack(track, this.localStream);
    });

    // When we find a route to the viewer, send it via signaling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          targetId: viewerId,
          candidate: event.candidate
        });
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        this.updateStatus('Streaming to viewers');
      }
    };

    // Store this connection
    this.peerConnections.set(viewerId, pc);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send offer to viewer via signaling
    this.socket.emit('offer', {
      targetId: viewerId,
      offer: offer
    });

    console.log('Offer sent to', viewerId);
  }

  closePeerConnection(viewerId) {
    const pc = this.peerConnections.get(viewerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(viewerId);
    }
  }

  stopSharing() {
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.elements.preview.srcObject = null;
    }

    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    // Disconnect from server
    if (this.socket) {
      this.socket.disconnect();
    }

    // Reset UI
    this.elements.shareBtn.style.display = 'inline-block';
    this.elements.stopBtn.style.display = 'none';
    this.updateStatus('Not sharing');
    this.updateViewerCount();
  }

  updateStatus(message) {
    this.elements.status.textContent = 'Status: ' + message;
  }

  updateViewerCount() {
    this.elements.viewerCount.textContent = 'Viewers: ' + this.peerConnections.size;
  }
}

// Start the app
new PresenterApp();