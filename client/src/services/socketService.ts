import { io, Socket } from 'socket.io-client';
import { Task } from '../components/dashboard/TaskLog';

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

export interface Chat {
  chatId: string;
  title: string;
  lastMessageAt: Date | string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ChatMessage {
  id: string;
  chatId?: string;  // Reference to the chat this message belongs to
  text: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: string;
  keepTyping: boolean;
}

export interface ChatMessageRequest {
  chatId?: string;  // Reference to the chat this message belongs to
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
  private serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3100';
  
  // Event callbacks
  private statusUpdateCallbacks: ((status: SystemStatus) => void)[] = [];
  private chatMessageCallbacks: ((message: ChatMessage) => void)[] = [];
  private connectionStatusCallbacks: ((connected: boolean) => void)[] = [];
  private agentEventCallbacks: ((event: AgentEvent) => void)[] = [];
  private chatCreatedCallbacks: ((chat: Chat) => void)[] = [];
  private chatSelectedCallbacks: ((chatId: string) => void)[] = [];
  private taskCreatedCallbacks: ((task: Task) => void)[] = [];
  private taskUpdateCallbacks: ((task: Task) => void)[] = [];
  private tasksUpdateCallbacks: ((tasks: Task[]) => void)[] = [];

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
    
    this.socket.on('status:update', (status: SystemStatus) => {
      this.notifyStatusUpdate(status);
    });
    
    this.socket.on('chat:message', (message: ChatMessage) => {
      this.notifyChatMessage(message);
    });
    
    // Listen for new chat creation events
    this.socket.on('chat:created', (chat: Chat) => {
      this.notifyChatCreated(chat);
    });

    // Server wants us to select a chat
    this.socket.on('chat:select', (chatId: string) => {
      this.notifyChatSelected(chatId);
    });
    
    this.socket.on('agent:event', (event: AgentEvent) => {
      console.log('Agent event received in socket service:', event);
      this.notifyAgentEvent(event);
    });
    
    this.socket.on('task:created', (task: Task) => {
      console.log('New task created:', task);
      this.notifyTaskCreated(task);
    });

    // Update a single task
    this.socket.on('task:update', (task: Task) => {
      this.notifyTaskUpdate(task);
    });

    // Update all tasks
    this.socket.on('tasks:update', (tasks: Task[]) => {
      this.notifyTasksUpdate(tasks);
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
  
  // Archive a task
  archiveTask(taskId: string): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('task:archive', taskId);
    console.log(`Sent archive request for task ${taskId}`);
  }
  
  // Event registration methods
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
  
  // Subscribe to chat created events
  onChatCreated(callback: (chat: Chat) => void): () => void {
    this.chatCreatedCallbacks.push(callback);
    return () => {
      this.chatCreatedCallbacks = this.chatCreatedCallbacks.filter(cb => cb !== callback);
    };
  }

  // Subscribe to chat selection events
  onChatSelected(callback: (chatId: string) => void): () => void {
    this.chatSelectedCallbacks.push(callback);
    return () => {
      this.chatSelectedCallbacks = this.chatSelectedCallbacks.filter(cb => cb !== callback);
    };
  }
  // Subscribe to task created events
  onTaskCreated(callback: (task: Task) => void): () => void {
    this.taskCreatedCallbacks.push(callback);
    return () => {
      this.taskCreatedCallbacks = this.taskCreatedCallbacks.filter(cb => cb !== callback);
    };
  }

  // Subscribe to a single task update events
  onTaskUpdate(callback: (task: Task) => void): () => void {
    this.taskUpdateCallbacks.push(callback);
    return () => {
      this.taskUpdateCallbacks = this.taskUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  // Subscribe to tasks update events
  onTasksUpdate(callback: (tasks: Task[]) => void): () => void {
    this.tasksUpdateCallbacks.push(callback);
    return () => {
      this.tasksUpdateCallbacks = this.tasksUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  // Notification methods  
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
    this.agentEventCallbacks.forEach(callback => callback(event));
  }
  
  // Notify chat created callbacks
  private notifyChatCreated(chat: Chat): void {
    console.log(`Notifying ${this.chatCreatedCallbacks.length} callbacks about new chat`);
    this.chatCreatedCallbacks.forEach(callback => callback(chat));
  }

  // Notify chat selected callbacks
  private notifyChatSelected(chatId: string): void {
    console.log(`Notifying ${this.chatSelectedCallbacks.length} callbacks about chat selection`);
    this.chatSelectedCallbacks.forEach(callback => callback(chatId));
  }

  // Notify task created callbacks
  private notifyTaskCreated(task: Task): void {
    console.log(`Notifying ${this.taskCreatedCallbacks.length} callbacks about new task`);
    this.taskCreatedCallbacks.forEach(callback => callback(task));
  }

  // Notify task update callbacks
  private notifyTaskUpdate(task: Task): void {
    this.taskUpdateCallbacks.forEach(callback => callback(task));
  }

  // Notify tasks update callbacks
  private notifyTasksUpdate(tasks: Task[]): void {
    this.tasksUpdateCallbacks.forEach(callback => callback(tasks));
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
