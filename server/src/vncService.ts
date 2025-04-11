import * as rfb from 'rfb2';
import { Server as SocketIOServer } from 'socket.io';

// VNC connection settings
const VNC_HOST = 'localhost';
const VNC_PORT = 5900;
const VNC_PASSWORD = 'password';

// Create a VNC service that connects to the VNC server and streams frames to clients
export function createVNCService(io: SocketIOServer) {
  console.log('VNC Service: Initializing...');
  // Track connected clients
  let clientCount = 0;
  let vncClient: any = null;
  let isConnected = false;
  
  // Handle Socket.IO connections
  console.log('VNC Service: Setting up Socket.IO namespace /vnc');
  io.of('/vnc').on('connection', (socket) => {
    console.log('VNC Service: New client connected to /vnc namespace');
    console.log('VNC: New client connected');
    clientCount++;
    
    // If this is the first client, connect to VNC server
    if (clientCount === 1 && !isConnected) {
      connectToVNC();
    }
    
    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log('VNC: Client disconnected');
      clientCount--;
      
      // If no clients left, disconnect from VNC server
      if (clientCount === 0 && vncClient) {
        console.log('VNC: No clients left, disconnecting from VNC server');
        vncClient.end();
        vncClient = null;
        isConnected = false;
      }
    });
    
    // Handle connect request
    socket.on('connect-vnc', () => {
      console.log('VNC Service: Received connect-vnc request');
      if (!isConnected) {
        connectToVNC();
      } else {
        console.log('VNC Service: Already connected, sending status');
        socket.emit('vnc-status', { 
          connected: true,
          width: vncClient ? vncClient.width : 800,
          height: vncClient ? vncClient.height : 600
        });
      }
    });
    
    // Handle disconnect request
    socket.on('disconnect-vnc', () => {
      if (vncClient) {
        vncClient.end();
        vncClient = null;
        isConnected = false;
        io.of('/vnc').emit('vnc-status', { connected: false });
      }
    });
  });
  
  // Connect to VNC server
  function connectToVNC() {
    console.log('VNC Service: Attempting to connect to VNC server...');
    console.log(`VNC: Connecting to ${VNC_HOST}:${VNC_PORT}`);
    
    try {
      vncClient = rfb.createConnection({
        host: VNC_HOST,
        port: VNC_PORT,
        password: VNC_PASSWORD
      });
      
      // Handle connection events
      vncClient.on('connect', () => {
        console.log('VNC: Connected to VNC server');
        console.log(`VNC: Screen size: ${vncClient.width}x${vncClient.height}`);
        isConnected = true;
        io.of('/vnc').emit('vnc-status', { 
          connected: true,
          width: vncClient.width,
          height: vncClient.height
        });
        
        // Send initial screen update to ensure we have something to display
        vncClient.requestUpdate(false, 0, 0, vncClient.width, vncClient.height);
      });
      
      // Handle rectangle updates (screen updates)
      vncClient.on('rect', (rect: any) => {
        if (clientCount > 0) {
          try {
            // Send the raw frame data to all clients
            io.of('/vnc').emit('vnc-frame', {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              encoding: rect.encoding,
              data: rect.data.toString('base64')
            });
          } catch (err) {
            console.error('VNC: Error processing frame:', err);
          }
        }
      });
      
      // Handle errors
      vncClient.on('error', (error: Error) => {
        console.error('VNC: Connection error:', error);
        isConnected = false;
        io.of('/vnc').emit('vnc-status', { 
          connected: false,
          error: error.message
        });
        vncClient = null;
      });
      
      // Handle close
      vncClient.on('close', () => {
        console.log('VNC: Connection closed');
        isConnected = false;
        io.of('/vnc').emit('vnc-status', { connected: false });
        vncClient = null;
      });
    } catch (err) {
      console.error('VNC: Failed to connect:', err);
      io.of('/vnc').emit('vnc-status', { 
        connected: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }
}

export default createVNCService;
