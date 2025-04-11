import * as http from 'http';
import * as dotenv from 'dotenv';
import * as websockify from 'websockify';

// Load environment variables
dotenv.config();

// VNC server configuration
const VNC_HOST = process.env.VNC_HOST || 'localhost';
const VNC_PORT = parseInt(process.env.VNC_PORT || '5900', 10);

/**
 * Create a standalone websockify server for VNC
 */
export function createVNCProxy(server: http.Server): void {
  // Create a separate websockify server on a different port
  const WS_PORT = parseInt(process.env.WS_PORT || '6080', 10);
  
  // Start websockify server
  websockify.websockify(WS_PORT, VNC_HOST, VNC_PORT, {
    cert: null,
    key: null,
    web_dir: null
  });
  
  console.log(`VNC Proxy: WebSocket server created on port ${WS_PORT}`);
  console.log(`VNC Proxy: Connected to VNC server at ${VNC_HOST}:${VNC_PORT}`);
}

export default createVNCProxy;
