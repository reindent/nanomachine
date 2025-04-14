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
  chatId?: string;  // Reference to the chat this message belongs to
  text: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: string;
}

export interface ChatMessageRequest {
  chatId?: string;  // Reference to the chat this message belongs to
  text: string;
  sender: 'user' | 'agent' | 'system';
}
