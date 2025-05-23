import * as rfb from 'rfb2';
import { Server as SocketIOServer } from 'socket.io';

const LOG_MOUSE_MOVEMENT = false;
const LOG_MOUSE_BUTTON = false;
const LOG_KEY_EVENTS = false;
const LOG_VNC_CONNECTION = true;
const LOG_VNC_FRAME = false;

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
  
  // Track which client has control
  let controllingClientId: string | null = null;
  
  // Handle Socket.IO connections
  console.log('VNC Service: Setting up Socket.IO namespace /vnc');
  io.of('/vnc').on('connection', (socket) => {
    console.log('VNC Service: New client connected to /vnc namespace');
    if (LOG_VNC_CONNECTION) console.log('VNC: New client connected');
    clientCount++;
    
    // If this is the first client, connect to VNC server
    if (clientCount === 1 && !isConnected) {
      connectToVNC();
    }
    
    // Handle client disconnect
    socket.on('disconnect', () => {
      if (LOG_VNC_CONNECTION) console.log('VNC: Client disconnected');
      clientCount--;
      
      // If this client had control, release it
      if (controllingClientId === socket.id) {
        if (LOG_VNC_CONNECTION) console.log('VNC: Controlling client disconnected, releasing control');
        controllingClientId = null;
        io.of('/vnc').emit('control-status', { hasControl: false, clientId: null });
      }
      
      // If no clients left, disconnect from VNC server
      if (clientCount === 0 && vncClient) {
        if (LOG_VNC_CONNECTION) console.log('VNC: No clients left, disconnecting from VNC server');
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
    
    // Handle take control request
    socket.on('take-control', () => {
      if (LOG_VNC_CONNECTION) console.log(`VNC: Client ${socket.id} requested control`);
      // Only allow if no one else has control
      if (!controllingClientId) {
        controllingClientId = socket.id;
        if (LOG_VNC_CONNECTION) console.log(`VNC: Control granted to client ${socket.id}`);
        io.of('/vnc').emit('control-status', { hasControl: true, clientId: socket.id });
        socket.emit('control-granted', true);
      } else {
        if (LOG_VNC_CONNECTION) console.log(`VNC: Control denied for client ${socket.id}, already controlled by ${controllingClientId}`);
        socket.emit('control-granted', false);
      }
    });
    
    // Handle release control request
    socket.on('release-control', () => {
      if (LOG_VNC_CONNECTION) console.log(`VNC: Client ${socket.id} released control`);
      if (controllingClientId === socket.id) {
        controllingClientId = null;
        io.of('/vnc').emit('control-status', { hasControl: false, clientId: null });
      }
    });
    
    // Handle mouse movement
    socket.on('mouse-move', (data) => {
      // Only process if this client has control
      if (controllingClientId !== socket.id) {
        return;
      }
      
      if (LOG_MOUSE_MOVEMENT) console.log('VNC: Received mouse move event:', data);
      if (isConnected && vncClient) {
        try {
          // Convert relative coordinates to absolute pixel coordinates
          const x = Math.floor(data.relativeX * vncClient.width);
          const y = Math.floor(data.relativeY * vncClient.height);
          
          if (LOG_MOUSE_MOVEMENT) console.log(`VNC: Mouse move at ${x},${y} (from rel: ${data.relativeX.toFixed(3)},${data.relativeY.toFixed(3)})`);
          
          // Send mouse event to VNC server - using the correct button state (0 for move)
          // According to RFB protocol: x, y, buttonMask
          // buttonMask is a bitmask where bit 0 = left, bit 1 = middle, bit 2 = right
          vncClient.pointerEvent(x, y, 0);
        } catch (err) {
          console.error('VNC: Error handling mouse move:', err);
        }
      } else {
        if (LOG_MOUSE_MOVEMENT) console.log('VNC: Ignoring mouse move, not connected or no client');
      }
    });
    
    // Handle mouse button events
    socket.on('mouse-button', (data) => {
      // Only process if this client has control
      if (controllingClientId !== socket.id) {
        return;
      }
      
      if (LOG_MOUSE_BUTTON) console.log('VNC: Received mouse button event:', data);
      if (isConnected && vncClient) {
        try {
          // Convert relative coordinates to absolute pixel coordinates
          const x = Math.floor(data.relativeX * vncClient.width);
          const y = Math.floor(data.relativeY * vncClient.height);
          
          if (LOG_MOUSE_BUTTON) console.log(`VNC: Mouse button at ${x},${y}, mask: ${data.buttonMask}, isDown: ${data.isDown}`);
          
          // For mouse button events, we need to use the correct button mask
          // In RFB protocol: bit 0 = left, bit 1 = middle, bit 2 = right
          // If isDown is false (button release), we send 0 as the mask
          const buttonMask = data.isDown ? data.buttonMask : 0;
          
          // Send mouse button event to VNC server
          vncClient.pointerEvent(x, y, buttonMask);
        } catch (err) {
          console.error('VNC: Error handling mouse button:', err);
        }
      } else {
        if (LOG_MOUSE_BUTTON) console.log('VNC: Ignoring mouse button, not connected or no client');
      }
    });
    
    // Handle keyboard events
    socket.on('key-event', (data) => {
      // Only process if this client has control
      if (controllingClientId !== socket.id) {
        return;
      }
      
      if (LOG_KEY_EVENTS) console.log('VNC: Received key event:', data);
      if (isConnected && vncClient) {
        try {
          // Send key event to VNC server
          // keyEvent(keysym, isDown) - keysym is the X11 keysym, isDown is true for keydown, false for keyup
          vncClient.keyEvent(data.keysym, data.isDown);
          if (LOG_KEY_EVENTS) console.log(`VNC: Key event sent - keysym: ${data.keysym}, isDown: ${data.isDown}`);
        } catch (err) {
          console.error('VNC: Error handling key event:', err);
        }
      } else {
        if (LOG_KEY_EVENTS) console.log('VNC: Ignoring key event, not connected or no client');
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
    if (LOG_VNC_CONNECTION) console.log(`VNC: Connecting to ${VNC_HOST}:${VNC_PORT}`);
    
    try {
      vncClient = rfb.createConnection({
        host: VNC_HOST,
        port: VNC_PORT,
        password: VNC_PASSWORD
      });
      
      // Handle connection events
      vncClient.on('connect', (a:any,b:any,c:any) => {
        if (!vncClient.width || !vncClient.height) return; // RFB has a bug where width/height are not set sometimes
        if (LOG_VNC_CONNECTION) console.log('VNC: Connected to VNC server');
        if (LOG_VNC_CONNECTION) console.log(`VNC: Screen size: ${vncClient.width}x${vncClient.height}`);
        isConnected = true;
        io.of('/vnc').emit('vnc-status', { 
          connected: true,
          width: vncClient.width,
          height: vncClient.height
        });
        
        // Send initial screen update to ensure we have something to display
        vncClient.requestUpdate(false, 0, 0, vncClient.width, vncClient.height);
        
        // Log VNC client capabilities
        if (LOG_VNC_CONNECTION) console.log('VNC client capabilities:', {
          width: vncClient.width,
          height: vncClient.height,
          bpp: vncClient.bpp,
          depth: vncClient.depth,
          pixelFormat: vncClient.pixelFormat,
          redShift: vncClient.redShift,
          greenShift: vncClient.greenShift,
          blueShift: vncClient.blueShift
        });
      });
      
      // Handle rectangle updates (screen updates)
      vncClient.on('rect', (rect: any) => {
        if (LOG_VNC_FRAME) console.log(`VNC: Received frame update: x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}, encoding=${rect.encoding}`);
        
        if (clientCount > 0) {
          try {
            // Handle different encodings
            switch(rect.encoding) {
              case 0: // Raw encoding
                // Make sure we have valid data
                if (!rect.data || !rect.width || !rect.height) {
                  console.error('VNC: Invalid frame data received');
                  return;
                }
                
                // Log frame data info
                if (LOG_VNC_FRAME) console.log(`VNC: Frame data length: ${rect.data.length}, expected: ${rect.width * rect.height * (vncClient.bpp / 8)}`);
                
                // Send the raw frame data to all clients
                io.of('/vnc').emit('vnc-frame', {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                  encoding: rect.encoding,
                  bpp: vncClient.bpp,
                  depth: vncClient.depth,
                  redShift: vncClient.redShift,
                  greenShift: vncClient.greenShift,
                  blueShift: vncClient.blueShift,
                  data: rect.data.toString('base64')
                });
                break;
              
              case 1: // CopyRect encoding
                if (LOG_VNC_CONNECTION) console.log('VNC: CopyRect encoding received');
                // For CopyRect, we need to tell the client to copy a region
                io.of('/vnc').emit('vnc-copyrect', {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                  srcX: rect.src.x,
                  srcY: rect.src.y
                });
                break;
              
              default:
                if (LOG_VNC_CONNECTION) console.log(`VNC: Unsupported encoding: ${rect.encoding}`);
                break;
            }
            
            // Request next frame update
            vncClient.requestUpdate(true, 0, 0, vncClient.width, vncClient.height);
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
          error: 'Failed to connect to VNC server.'
        });
        vncClient = null;
      });
      
      // Handle close
      vncClient.on('close', () => {
        if (LOG_VNC_CONNECTION) console.log('VNC: Connection closed');
        isConnected = false;
        io.of('/vnc').emit('vnc-status', { connected: false });
        vncClient = null;
      });
    } catch (err) {
      console.error('VNC: Failed to connect:', err);
      io.of('/vnc').emit('vnc-status', { 
        connected: false,
        error: 'Failed to connect to VNC server.'
      });
    }
  }
}

export default createVNCService;
