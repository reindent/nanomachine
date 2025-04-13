import WebSocket from 'ws';
import axios from 'axios';
import { EventEmitter } from 'events';
/**
 * Agent event message interface
 */
interface AgentEventMessage {
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

/**
 * Service to communicate with the bridge application running in the Docker container
 */
class BridgeService {
  private ws: WebSocket | null = null;
  private eventEmitter = new EventEmitter();
  private bridgeUrl: string;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  
  constructor(bridgeUrl = 'http://localhost:8787') {
    this.bridgeUrl = bridgeUrl;
    this.connect();
  }
  
  /**
   * Connect to the bridge WebSocket
   */
  connect(): void {
    const wsUrl = this.bridgeUrl.replace('http', 'ws');
    console.log(`Attempting to connect to bridge WebSocket at ${wsUrl}`);
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        console.log('Connected to bridge WebSocket');
        this.isConnected = true;
        this.eventEmitter.emit('connected');
        
        // Send a hello message
        this.sendMessage({
          type: 'hello',
          client: 'nanomachine-server',
          isServer: true,
        });
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type !== 'ping') {
            console.log(`Received message from bridge: ${message.type}`);
          }
          
          // Forward agent events to listeners
          if (message.type === 'agent_event') {
            this.eventEmitter.emit('agent_event', message);
          }
          
          // Forward task results to listeners
          if (message.type === 'task_result' || message.type === 'task_error') {
            console.log(`Received ${message.type} for task ${message.taskId}`);
            console.log('Task message details:', JSON.stringify(message, null, 2));
            this.eventEmitter.emit('task_update', message);
            
            // Also emit a special event for task errors to ensure they're displayed
            if (message.type === 'task_error') {
              const errorEvent = {
                type: 'agent_event',
                taskId: message.taskId,
                event: {
                  actor: 'system',
                  state: 'task.error',
                  timestamp: Date.now(),
                  data: {
                    details: message.error,
                    message: message.error
                  }
                }
              };
              console.log('Converting task_error to agent_event:', JSON.stringify(errorEvent, null, 2));
              this.eventEmitter.emit('agent_event', errorEvent);
            }
          }
          
          // Handle welcome message
          if (message.type === 'welcome') {
            console.log(`Received welcome from bridge: ${message.message}`);
          }
        } catch (error) {
          console.error('Error parsing bridge message:', error);
        }
      });
      
      this.ws.on('close', () => {
        console.log('Bridge WebSocket connection closed, reconnecting...');
        this.isConnected = false;
        this.eventEmitter.emit('disconnected');
        this.scheduleReconnect();
      });
      
      this.ws.on('error', (error) => {
        console.error('Bridge WebSocket error:', error);
        this.isConnected = false;
        this.scheduleReconnect();
      });
    } catch (error) {
      console.error('Failed to connect to bridge WebSocket:', error);
      this.scheduleReconnect();
    }
  }
  
  /**
   * Send a message to the bridge WebSocket
   */
  sendMessage(message: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message, WebSocket not connected');
      return false;
    }
    
    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending message to bridge:', error);
      return false;
    }
  }
  
  /**
   * Send a prompt to the bridge
   */
  async sendPrompt(task: string, taskId?: string): Promise<any> {
    try {
      console.log(`Sending prompt to bridge: ${task}`);
      const response = await axios.post(`${this.bridgeUrl}/prompt`, {
        task,
        taskId: taskId || `task-${Date.now()}`
      });
      return response.data;
    } catch (error) {
      console.error('Error sending prompt to bridge:', error);
      throw error;
    }
  }
  
  /**
   * Subscribe to agent events
   */
  onAgentEvent(callback: (event: AgentEventMessage) => void): () => void {
    this.eventEmitter.on('agent_event', callback);
    return () => this.eventEmitter.off('agent_event', callback);
  }
  
  /**
   * Subscribe to task updates
   */
  onTaskUpdate(callback: (update: any) => void): () => void {
    this.eventEmitter.on('task_update', callback);
    return () => this.eventEmitter.off('task_update', callback);
  }
  
  /**
   * Subscribe to connection status changes
   */
  onConnectionStatus(callback: (connected: boolean) => void): () => void {
    // Initial status
    callback(this.isConnected);
    
    // Subscribe to future changes
    this.eventEmitter.on('connected', () => callback(true));
    this.eventEmitter.on('disconnected', () => callback(false));
    
    return () => {
      this.eventEmitter.off('connected', () => callback(true));
      this.eventEmitter.off('disconnected', () => callback(false));
    };
  }
  
  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
  }
}

// Export as singleton
export default new BridgeService();
