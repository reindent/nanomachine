import { Socket, io } from 'socket.io-client';

// Constants for server connection
const VNC_SERVER_URL = 'http://' + window.location.hostname + ':3100/vnc';
const TRANSPORT_OPTIONS = { transports: ['websocket', 'polling'] };

// VNC Socket Service - Manages VNC socket connections
// Simple singleton pattern to manage the VNC socket connection

// Types
export interface VncStatus {
  connected: boolean;
  width?: number;
  height?: number;
  error?: string;
}

export interface VncFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  data: string;
  encoding: number;
  bpp: number;
}

export interface VncCopyRect {
  x: number;
  y: number;
  width: number;
  height: number;
  srcX: number;
  srcY: number;
}

export interface ControlStatus {
  hasControl: boolean;
  clientId: string | null;
}

// Singleton instance
let socketInstance: Socket | null = null;

// Connect to VNC server
export function connectToVnc(): Socket {
  if (!socketInstance) {
    console.log('Creating new VNC socket connection');
    socketInstance = io(VNC_SERVER_URL, TRANSPORT_OPTIONS);
    
    // Set up basic error handling
    socketInstance.on('connect_error', (err: Error) => {
      console.error('VNC socket connection error:', err.message);
    });
  }
  
  return socketInstance;
}

// Get the current socket instance
export function getVncSocket(): Socket | null {
  return socketInstance;
}

// Disconnect from VNC server
export function disconnectFromVnc(): void {
  if (socketInstance) {
    socketInstance.emit('disconnect-vnc');
    socketInstance.disconnect();
    socketInstance = null;
  }
}

// Request VNC connection
export function requestVncConnection(): void {
  if (socketInstance) {
    socketInstance.emit('connect-vnc');
  }
}

// Request control
export function requestControl(): void {
  if (socketInstance) {
    socketInstance.emit('take-control');
  }
}

// Release control
export function releaseControl(): void {
  if (socketInstance) {
    socketInstance.emit('release-control');
  }
}
