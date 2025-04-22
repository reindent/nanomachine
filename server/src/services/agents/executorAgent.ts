/**
 * Executor Agent Service
 * 
 * This service implements an AI agent that executes tasks from the strategist's plan.
 * It has three tools: browser, shell, and data.
 */
import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { z } from "zod";
import { Server } from 'socket.io';
import { taskContextManager } from './contextManager';
import { StringOutputParser } from '@langchain/core/output_parsers';

/**
 * Schema for the executor response
 */
const ExecutorToolSchema = z.object({
  tool: z.enum(['BROWSER', 'SHELL', 'DATA']),
  reasoning: z.string(),
  script: z.string().nullish().describe('Shell script to execute (for SHELL tool)')
});

/**
 * Type for the executor response
 */
type ExecutorToolResponse = z.infer<typeof ExecutorToolSchema>;

// Get API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Initialize the LLM
const executorModel = new ChatOpenAI({
  openAIApiKey: OPENAI_API_KEY,
  modelName: process.env.EXECUTOR_MODEL || "o4-mini",
  // temperature: 0.2,
});

// Socket.io instance reference
let io: Server;

/**
 * Configure the executor agent with the Socket.IO server instance
 * @param socketIo The Socket.IO server instance
 */
export function configureExecutorAgent(socketIo: Server) {
  io = socketIo;
  
  // Configure the data tool with the Socket.IO instance
  import('./tools/dataTool').then(({ configureDataTool }) => {
    configureDataTool(socketIo);
  });
  
  // Configure the browser tool with the Socket.IO instance
  import('./tools/browserTool').then(({ configureBrowserTool }) => {
    configureBrowserTool(socketIo);
  });
}

/**
 * Tool interface for executor agent
 */
export interface Tool {
  name: string;
  execute: (task: string, chatId: string, params?: any) => Promise<any>;
}

// Browser tool is now imported from ./tools/browserTool.ts

// Import the shell tool
async function importShellTool() {
  const { shellTool } = await import('./tools/shellTool');
  return shellTool;
}

// Import the data tool
async function importDataTool() {
  const { dataTool } = await import('./tools/dataTool');
  return dataTool;
}

// Import the browser tool
async function importBrowserTool() {
  const { browserTool } = await import('./tools/browserTool');
  return browserTool;
}

// Map of available tools
const tools: Record<string, Tool> = {};

/**
 * Enrich a task with context from previous tasks
 * 
 * @param task The original task to enrich
 * @param chatId The chat ID to retrieve context for
 * @returns The enriched task
 */
async function enrichTaskWithContext(task: string, chatId: string): Promise<string> {
  // Get context from previous tasks
  const context = taskContextManager.getContext(chatId);
  
  // If no context exists, return the original task
  if (!taskContextManager.hasContext(chatId)) {
    console.log('No context available for enrichment');
    return task;
  }
  
  console.log(`Enriching task with context: ${JSON.stringify(context)}`);
  
  // Create a context enricher model
  const contextEnricher = new ChatOpenAI({
    openAIApiKey: OPENAI_API_KEY,
    modelName: process.env.EXECUTOR_MODEL || "o4-mini",
  });
  
  // Create messages for the chat model
  const messages = [
    {
      role: 'system' as const,
      content: `You are an AI assistant that enhances tasks with relevant context. 
      Your job is to modify the task to include specific information from previous tasks.
      Be specific and explicit in your modifications, incorporating exact data points from the context.`
    },
    {
      role: 'user' as const,
      content: `Original task: ${task}
      
      Available context from previous tasks:
      ${JSON.stringify(context, null, 2)}
      
      Please rewrite the task to incorporate relevant context. Make sure to include specific details from the context.
      Return ONLY the rewritten task, nothing else.`
    }
  ];
  
  // Get the enriched task
  const response = await contextEnricher.invoke(messages);
  const enrichedTask = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  
  console.log(`Original task: ${task}`);
  console.log(`Enriched task: ${enrichedTask}`);
  
  return enrichedTask;
}

/**
 * Extract and store context from task execution results
 * 
 * @param task The task that was executed
 * @param result The result of the task execution
 * @param chatId The chat ID to store context for
 */
async function extractAndStoreContext(task: string, result: any, chatId: string): Promise<void> {
  // Skip if result is not successful
  if (!result || !result.success) {
    console.log('Task was not successful, skipping context extraction');
    return;
  }
  
  // For browser tasks, use the finalResult if available
  const resultToProcess = result.finalResult ? result.finalResult : result;
  
  console.log(`Extracting context from task result: ${JSON.stringify(resultToProcess)}`);
  
  try {
    // Create a context extractor model with structured output
    const contextExtractor = new ChatOpenAI({
      openAIApiKey: OPENAI_API_KEY,
      modelName: process.env.EXECUTOR_MODEL || "o4-mini",
    });
    
    // Create messages for the chat model
    const messages = [
      {
        role: 'system' as const,
        content: `You are an AI assistant that extracts key information from task results.
        Your job is to identify important data points that might be needed for future tasks.
        Extract information in a structured format with descriptive keys.`
      },
      {
        role: 'user' as const,
        content: `Task: ${task}
        
        Task result: ${JSON.stringify(resultToProcess, null, 2)}
        
        Extract key information from this result that might be useful for future tasks.
        Use descriptive keys for the extracted information.
        For example: { "topWebsites": ["site1.com", "site2.com"], "searchTerm": "AI agents" }`
      }
    ];
    
    // Get structured output from the model
    const extractedContext = await contextExtractor.invoke(messages);
    
    // Store the extracted context
    taskContextManager.storeMultipleContext(chatId, extractedContext);
  } catch (error) {
    console.error('Error extracting context:', error);
    // Store a simple context with the raw result as fallback
    taskContextManager.storeContext(chatId, `raw_${task}_result`, resultToProcess);
  }
}

/**
 * Determine which tool to use for a task and execute it
 * 
 * @param task The task to execute
 * @param chatId The chat ID associated with the task
 * @returns The result of the tool execution
 */
export async function executeTask(task: string, chatId: string): Promise<any> {
  try {
    // Enrich the task with context from previous tasks
    const enrichedTask = await enrichTaskWithContext(task, chatId);
    
    console.log(`Determining tool for task: ${enrichedTask}`);
    
    // Configure the model for structured output
    const structuredOutputModel = executorModel.withStructuredOutput(ExecutorToolSchema);
    
    // Create messages for the chat model
    const messages = [
      {
        role: 'system' as const,
        content: `You are an AI agent deciding which tool to use for a given task. 
        Choose the most appropriate tool from the available options.
        Provide clear reasoning for your decision.`
      },
      {
        role: 'user' as const,
        content: `Task: ${enrichedTask}

Available tools:
1. BROWSER - Use for web browsing, searching, and interacting with websites
2. SHELL - Use for terminal operations, executing commands, and file operations
3. DATA - Use for processing, cleaning, deduplicating, ranking, or presenting data from previous tasks

If you choose SHELL, also provide a shell script that accomplishes the task.

Choose DATA for tasks that involve:
- Cleaning or deduplicating data
- Ranking or sorting information
- Merging data from multiple sources
- Presenting or formatting results
- Analyzing patterns in collected data`
      }
    ];

    // Get structured output from the model
    const toolResponse = await structuredOutputModel.invoke(messages);
    
    // Extract the tool and reasoning
    const { tool: toolName, reasoning } = toolResponse;
    console.log(`Selected tool: ${toolName}`);
    console.log(`Reasoning: ${reasoning}`);
    
    // Send the reasoning as a message to the client if io is available
    if (io && chatId) {
      io.emit('chat:message', {
        id: `reasoning-${Date.now()}`,
        chatId,
        text: `**Tool Selection:**\n\nTask: ${enrichedTask}\nSelected Tool: ${toolName}\nReasoning: ${reasoning}`,
        sender: 'agent',
        timestamp: new Date().toISOString()
      });
    }
    
    // Log execution information
    console.log(`Executing task with ${toolName} tool: ${enrichedTask}`);
    
    // Execute the task with the selected tool
    let result;
    if (toolName === 'SHELL') {
      // For SHELL tool, import and execute it directly
      const script = toolResponse.script || '';
      const shellTool = await importShellTool();
      result = await shellTool.execute(enrichedTask, chatId, { script });
    } else if (toolName === 'BROWSER') {
      // For BROWSER tool, import and execute it
      const browserTool = await importBrowserTool();
      result = await browserTool.execute(enrichedTask, chatId);
    } else if (toolName === 'DATA') {
      // For DATA tool, import and execute it
      const dataTool = await importDataTool();
      result = await dataTool.execute(enrichedTask, chatId);
    } else {
      // Unknown tool
      console.error(`Unknown tool: ${toolName}`);
      result = {
        success: false,
        message: `Unknown tool: ${toolName}. Reasoning provided: ${reasoning}`
      };
    }
    
    // Extract and store context from the result
    if (result.success) {
      await extractAndStoreContext(enrichedTask, result, chatId);
    }
    
    return result;
  } catch (error) {
    console.error('Error executing task:', error);
    return {
      success: false,
      message: `Error executing task: ${error}`
    };
  }
}
