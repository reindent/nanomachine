/**
 * Strategist Agent Service
 * 
 * This service implements a simple AI agent that creates a strategy plan
 * for user requests before forwarding them to the bridge.
 */
import 'dotenv/config';
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Get API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Initialize the LLM
const strategistModel = new ChatOpenAI({
  openAIApiKey: OPENAI_API_KEY,
  modelName: process.env.STRATEGIST_MODEL || "o4-mini",
});

// Create a prompt template for the strategist
const strategistPrompt = PromptTemplate.fromTemplate(`
You are Nanomachine, and AI assistant that creates strategy plans for users with their tasks.

You have control over a Virtual Machine (VM) that can be used to execute tasks, the VM has a browser and a filesystem that you can use to execute tasks.

Your job is to analyze the user request and create a simple, clear plan in the form of a todo list.

User Request: {userRequest}

Depending on the task of the user, you may need to:

1) Reply right away (if the user greets you, or if it asks clarification of a previous plan, etc.)
2) Create a strategy plan on how to best execute the user's request
3) Ask for more details (if the user's request is not clear enough)

Do not assume you know the answer to the user's request, only if you are sure you can answer, otherwise ask for more details.

Create an atomic strategy plan as a todo list.

Example: if user request is "Do a market research on the product XYZ", the plan should be:

[ ] Open the VM's browser
[ ] Find online information about the product XYZ
[ ] Create a file in the VM and store the information
[ ] Find information about competitors, opportunities and threats
[ ] Create a new file in the VM and store the report
[ ] Analyze the report and double-check it
[ ] Compile a response and send it to the user along with the report

This plan will be passed to another AI Agent named 'executor' that will execute the plan, so only create the plan.

You MUST ONLY return the plan, nothing else.
`);

// Create a chain for the strategist
const strategistChain = strategistPrompt
  .pipe(strategistModel)
  .pipe(new StringOutputParser());

/**
 * Generate a strategy plan for a user request
 * 
 * @param userRequest The user's request message
 * @returns A strategy plan as a todo list
 */
export async function generateStrategyPlan(userRequest: string): Promise<string> {
  try {
    console.log(`Generating strategy plan for request: ${userRequest}`);
    
    // Generate the strategy plan
    const strategyPlan = await strategistChain.invoke({
      userRequest,
    });
    
    console.log(`Generated strategy plan: ${strategyPlan}`);
    return strategyPlan;
  } catch (error) {
    console.error('Error generating strategy plan:', error);
    return `Error generating strategy plan: ${error}`;
  }
}
