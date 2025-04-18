import 'dotenv/config';
import { AgentModelMessage, LLMProviderMessage } from '../../../bridge/src/types';

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:8787';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Parse model names from environment variable or use defaults
const MODEL_NAMES = process.env.LLM_MODEL_NAMES 
  ? process.env.LLM_MODEL_NAMES.split(',')
  : ['gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o3-mini'];

// Agent configuration from environment variables
const NANOBROWSER_PLANNER_MODEL = process.env.NANOBROWSER_PLANNER_MODEL || 'gpt-4.1';
const NANOBROWSER_PLANNER_TEMPERATURE = parseFloat(process.env.NANOBROWSER_PLANNER_TEMPERATURE || '0.7');
const NANOBROWSER_PLANNER_TOP_P = parseFloat(process.env.NANOBROWSER_PLANNER_TOP_P || '0.9');

const NANOBROWSER_NAVIGATOR_MODEL = process.env.NANOBROWSER_NAVIGATOR_MODEL || 'gpt-4.1';
const NANOBROWSER_NAVIGATOR_TEMPERATURE = parseFloat(process.env.NANOBROWSER_NAVIGATOR_TEMPERATURE || '0.3');
const NANOBROWSER_NAVIGATOR_TOP_P = parseFloat(process.env.NANOBROWSER_NAVIGATOR_TOP_P || '0.85');

const NANOBROWSER_VALIDATOR_MODEL = process.env.NANOBROWSER_VALIDATOR_MODEL || 'gpt-4.1';
const NANOBROWSER_VALIDATOR_TEMPERATURE = parseFloat(process.env.NANOBROWSER_VALIDATOR_TEMPERATURE || '0.1');
const NANOBROWSER_VALIDATOR_TOP_P = parseFloat(process.env.NANOBROWSER_VALIDATOR_TOP_P || '0.8');

console.log(`Configuring nanobrowser with OpenAI API key: ${OPENAI_API_KEY}`);

export async function configureNanobrowser() {
  const providerConfig: LLMProviderMessage = {
    type: 'llm_provider',
    action: 'create',
    provider: {
      id: 'openai',
      name: 'OpenAI',
      apiKey: OPENAI_API_KEY,
      modelNames: MODEL_NAMES
    }
  };

  await fetch(`${BRIDGE_URL}/provider`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(providerConfig)
  });

  // wait 100ms
  await new Promise(resolve => setTimeout(resolve, 100));

  await configureAgent('planner', NANOBROWSER_PLANNER_MODEL, NANOBROWSER_PLANNER_TEMPERATURE, NANOBROWSER_PLANNER_TOP_P);
  await configureAgent('navigator', NANOBROWSER_NAVIGATOR_MODEL, NANOBROWSER_NAVIGATOR_TEMPERATURE, NANOBROWSER_NAVIGATOR_TOP_P);
  await configureAgent('validator', NANOBROWSER_VALIDATOR_MODEL, NANOBROWSER_VALIDATOR_TEMPERATURE, NANOBROWSER_VALIDATOR_TOP_P);
}

async function configureAgent(agentName: string, modelName: string, temperature?: number, topP?: number) {
  temperature = temperature || 0;
  topP = topP || 0;
  const modelConfig: AgentModelMessage = {
    type: 'agent_model',
    agent: agentName,
    config: {
      provider: 'openai',
      modelName,
      parameters: { temperature, topP }
    }
  };

  await fetch(`${BRIDGE_URL}/model`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(modelConfig)
  });
}