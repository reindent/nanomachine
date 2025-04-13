/**
 * Types for bridge communication
 */

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface AgentEventMessage extends WebSocketMessage {
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

export interface TaskResultMessage extends WebSocketMessage {
  type: 'task_result';
  taskId: string;
  result: any;
}

export interface TaskErrorMessage extends WebSocketMessage {
  type: 'task_error';
  taskId: string;
  error: string;
}

export interface PromptRequest {
  task: string;
  taskId?: string;
  tabId?: string;
}

export interface PromptResponse {
  status: 'accepted' | 'error';
  message: string;
  taskId: string;
}
