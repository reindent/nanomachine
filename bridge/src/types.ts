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

export interface LLMProvider {
  id: string;         // Provider ID (e.g., 'openai', 'anthropic', or custom ID)
  name?: string;      // Display name
  apiKey: string;     // API key
  baseUrl?: string;   // Optional base URL for custom providers
  modelNames: string[]; // Available models
}

export interface AgentModelConfig {
  provider: string;   // Reference to provider ID
  modelName: string;  // Selected model name
  parameters: {
    temperature: number;
    topP: number;
  };
}

export interface LLMProviderMessage extends WebSocketMessage {
  type: 'llm_provider';
  action: 'create' | 'update' | 'delete';
  provider: LLMProvider;
}

export interface AgentModelMessage extends WebSocketMessage {
  type: 'agent_model';
  agent: string;      // 'planner', 'navigator', or 'validator'
  config: AgentModelConfig;
}
