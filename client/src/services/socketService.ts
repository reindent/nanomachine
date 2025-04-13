import { io, Socket } from 'socket.io-client';
import { Task } from '../components/dashboard/ActiveTasks';

// Define types for messages
export interface AgentEvent {
  type: 'agent_event';
  taskId: string;
  event: {
    actor: string;
    state: string;
    data: {
      message?: string;
      [key: string]: any;
    };
    timestamp: number;
  };
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: string;
}

export interface ChatMessageRequest {
  text: string;
  sender: 'user' | 'agent' | 'system';
}

export interface SystemStatus {
  websocketStatus: 'connected' | 'disconnected';
  nanomachineClientVersion: string;
  nanobrowserVersion: string;
  serverStatus: 'online' | 'offline';
  activeSessions: number;
}

// Socket service class
class SocketService {
  private socket: Socket | null = null;
  private serverUrl = 'http://localhost:3100';
  
  // Event callbacks
  private taskUpdateCallbacks: ((tasks: Task[]) => void)[] = [];
  private statusUpdateCallbacks: ((status: SystemStatus) => void)[] = [];
  private chatMessageCallbacks: ((message: ChatMessage) => void)[] = [];
  private connectionStatusCallbacks: ((connected: boolean) => void)[] = [];
  private agentEventCallbacks: ((event: AgentEvent) => void)[] = [];

  // Initialize socket connection
  connect(): void {
    if (this.socket) return;
    
    this.socket = io(this.serverUrl);
    
    // Setup event listeners
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.notifyConnectionStatus(true);
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.notifyConnectionStatus(false);
    });
    
    this.socket.on('tasks:update', (tasks: Task[]) => {
      this.notifyTaskUpdate(tasks);
    });
    
    this.socket.on('status:update', (status: SystemStatus) => {
      this.notifyStatusUpdate(status);
    });
    
    this.socket.on('chat:message', (message: ChatMessage) => {
      this.notifyChatMessage(message);
    });
    
    this.socket.on('agent:event', (event: AgentEvent) => {
      console.log('Agent event received in socket service:', event);
      console.log(`Event type: ${event.type}, Actor: ${event.event.actor}, State: ${event.event.state}`);
      this.notifyAgentEvent(event);
      console.log(`Notified ${this.agentEventCallbacks.length} agent event callbacks`);
    });
  }
  
  // Disconnect socket
  disconnect(): void {
    if (!this.socket) return;
    
    this.socket.disconnect();
    this.socket = null;
  }
  
  // Send a chat message
  sendChatMessage(message: ChatMessageRequest): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('chat:message', message);
  }
  
  // Request task refresh
  refreshTasks(): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('tasks:refresh');
  }
  
  // Event registration methods
  onTaskUpdate(callback: (tasks: Task[]) => void): () => void {
    this.taskUpdateCallbacks.push(callback);
    return () => {
      this.taskUpdateCallbacks = this.taskUpdateCallbacks.filter(cb => cb !== callback);
    };
  }
  
  onStatusUpdate(callback: (status: SystemStatus) => void): () => void {
    this.statusUpdateCallbacks.push(callback);
    return () => {
      this.statusUpdateCallbacks = this.statusUpdateCallbacks.filter(cb => cb !== callback);
    };
  }
  
  onChatMessage(callback: (message: ChatMessage) => void): () => void {
    this.chatMessageCallbacks.push(callback);
    return () => {
      this.chatMessageCallbacks = this.chatMessageCallbacks.filter(cb => cb !== callback);
    };
  }
  
  onConnectionStatus(callback: (connected: boolean) => void): () => void {
    this.connectionStatusCallbacks.push(callback);
    return () => {
      this.connectionStatusCallbacks = this.connectionStatusCallbacks.filter(cb => cb !== callback);
    };
  }
  
  // Subscribe to agent events
  onAgentEvent(callback: (event: AgentEvent) => void): () => void {
    this.agentEventCallbacks.push(callback);
    return () => {
      this.agentEventCallbacks = this.agentEventCallbacks.filter(cb => cb !== callback);
    };
  }
  
  // Notification methods
  private notifyTaskUpdate(tasks: Task[]): void {
    this.taskUpdateCallbacks.forEach(callback => callback(tasks));
  }
  
  private notifyStatusUpdate(status: SystemStatus): void {
    this.statusUpdateCallbacks.forEach(callback => callback(status));
  }
  
  private notifyChatMessage(message: ChatMessage): void {
    this.chatMessageCallbacks.forEach(callback => callback(message));
  }
  
  private notifyConnectionStatus(connected: boolean): void {
    this.connectionStatusCallbacks.forEach(callback => callback(connected));
  }
  
  private notifyAgentEvent(event: AgentEvent): void {
    console.log(`Notifying ${this.agentEventCallbacks.length} callbacks about agent event`);
    this.agentEventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in agent event callback:', error);
      }
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
