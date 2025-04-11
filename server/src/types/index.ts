// Task types
export interface Task {
  id: string;
  status: 'completed' | 'running' | 'idle' | 'failed';
  message: string;
  timestamp: string;
  progress?: number;
}

// System status types
export interface SystemStatus {
  websocketStatus: 'connected' | 'disconnected';
  nanomachineClientVersion: string;
  nanobrowserVersion: string;
  serverStatus: 'online' | 'offline';
  activeSessions: number;
}

// Chat message types
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: string;
}

export interface ChatMessageRequest {
  text: string;
  sender: 'user' | 'agent';
}
