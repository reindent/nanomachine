import 'dotenv/config';
import { AgentModelMessage, LLMProviderMessage } from '../../../bridge/types';

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:8787';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

console.log(`Configuring nanobrowser with OpenAI API key: ${OPENAI_API_KEY}`);

export async function configureNanobrowser() {
  const providerConfig: LLMProviderMessage = {
    type: 'llm_provider',
    action: 'create',
    provider: {
      id: 'openai',
      name: 'OpenAI',
      apiKey: OPENAI_API_KEY,
      modelNames: ['gpt-4o', 'gpt-4o-mini', 'o3-mini']
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

  ['planner', 'navigator', 'validator'].forEach(async (agent) => {
    const modelConfig: AgentModelMessage = {
      type: 'agent_model',
      agent,
      config: {
        provider: 'openai',
        modelName: 'o3-mini',
        parameters: { temperature: 1, topP: 1 }
      }
    };

    await fetch(`${BRIDGE_URL}/model`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(modelConfig)
    });
  });

}
