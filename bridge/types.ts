// src/types.ts
// Common types used across the project

export interface PromptRequest {
  task: string;
  tabId?: number | null;
  taskId?: string;
}

export interface PromptResponse {
  status: string;
  message: string;
  taskId: string;
  error?: string;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface HelloMessage extends WebSocketMessage {
  type: 'hello';
  client: string;
}

export interface ExternalTaskMessage extends WebSocketMessage {
  type: 'external_task';
  task: string;
  taskId: string;
  tabId?: number | null;
}

export interface TaskResultMessage extends WebSocketMessage {
  type: 'task_result';
  taskId: string;
  result: unknown;
}

export interface TaskErrorMessage extends WebSocketMessage {
  type: 'task_error';
  taskId: string;
  error: string;
}

export interface AgentEventData {
  step: number;
  maxSteps: number;
  details: string;
}

export interface AgentEventMessage extends WebSocketMessage {
  type: 'agent_event';
  taskId: string;
  event: {
    actor: string; // 'planner', 'navigator', 'validator'
    state: string; // Various states like 'task.start', 'step.ok', etc.
    timestamp: number;
    data: AgentEventData;
  };
}
