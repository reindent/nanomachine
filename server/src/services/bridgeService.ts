import 'dotenv/config';
import WebSocket from 'ws';
import axios from 'axios';
import { EventEmitter } from 'events';
import { Task, Message } from '../models';
import { configureNanobrowser } from './nanobrowserService';

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:8787';

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
// Import our own types for model configuration
interface LLMProvider {
  id: string;         // Provider ID (e.g., 'openai', 'anthropic', or custom ID)
  name?: string;      // Display name
  apiKey: string;     // API key
  baseUrl?: string;   // Optional base URL for custom providers
  modelNames: string[]; // Available models
}

interface AgentModelConfig {
  provider: string;   // Reference to provider ID
  modelName: string;  // Selected model name
  parameters: {
    temperature: number;
    topP: number;
  };
}

class BridgeService {
  private ws: WebSocket | null = null;
  private eventEmitter = new EventEmitter();
  private bridgeUrl: string;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private nanobrowserVersion: string = 'unknown';
  
  constructor(bridgeUrl = BRIDGE_URL) {
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
          name: 'nanomachine-service',
        });

        // Configure Nanobrowser Provider and Models

      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          // Handle ping/pong (silently)
          if (message.type === 'ping') {
            this.ws?.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          if (message.type === 'pong') return;
          
          console.log(`Received message from bridge: ${message.type}`);

          // Handle nanobrowser ready message
          if (message.type === 'nanobrowser' && message.ready === true) {
            // Store nanobrowser version if provided
            if (message.version) {
              this.nanobrowserVersion = message.version;
              console.log(`Nanobrowser version: ${message.version}`);
            }
            configureNanobrowser();
            console.log('Nanobrowser is ready and configured.');
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
   * Update or create a provider configuration
   */
  async updateProvider(provider: LLMProvider, action: 'create' | 'update' | 'delete' = 'update'): Promise<any> {
    try {
      console.log(`Sending provider ${action} for ${provider.id} to bridge`);
      const response = await axios.post(`${this.bridgeUrl}/provider`, {
        type: 'llm_provider',
        action,
        provider
      });
      return response.data;
    } catch (error) {
      console.error(`Error ${action} provider:`, error);
      throw error;
    }
  }
  
  /**
   * Update model configuration for an agent
   */
  async updateAgentModel(agent: string, config: AgentModelConfig): Promise<any> {
    try {
      console.log(`Sending model config update for agent ${agent} to bridge`);
      const response = await axios.post(`${this.bridgeUrl}/model`, {
        type: 'agent_model',
        agent,
        config
      });
      return response.data;
    } catch (error) {
      console.error('Error updating agent model:', error);
      throw error;
    }
  }
  
  /**
   * Get the nanobrowser version
   */
  getNanobrowserVersion(): string {
    return this.nanobrowserVersion;
  }
  
  /**
   * Check if the bridge is connected
   */
  isBridgeConnected(): boolean {
    return this.isConnected;
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
