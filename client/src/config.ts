/**
 * Application configuration
 * 
 * This file centralizes all configuration values from environment variables
 * with sensible defaults for local development.
 */

// API URL for HTTP requests
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3100';

// Socket server URL for WebSocket connections
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3100';

// Bridge WebSocket URL
export const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'ws://localhost:8787';

// VNC server URL
export const VNC_URL = import.meta.env.VITE_VNC_URL || 'http://localhost:3201/vnc/index.html?autoconnect=1&resize=remote&enable_perf_stats=0';

// Use KasmVNC iframe instead of custom canvas
export const USE_KASMVNC_IFRAME = import.meta.env.VITE_USE_KASMVNC_IFRAME !== 'false';
