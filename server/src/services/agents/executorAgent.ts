/**
 * Executor Agent Service
 * 
 * This service implements an AI agent that executes tasks from the strategist's plan.
 * It has two tools: browser and shell.
 */
import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import bridgeService from '../bridgeService';
import { z } from "zod";
import { Server } from 'socket.io';

/**
 * Schema for the executor response
 */
const ExecutorToolSchema = z.object({
  tool: z.enum(['BROWSER', 'SHELL']),
  reasoning: z.string(),
  script: z.string().optional().describe('Shell script to execute (for SHELL tool)')
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
}

/**
 * Tool interface for executor agent
 */
export interface Tool {
  name: string;
  execute: (task: string, chatId: string, params?: any) => Promise<any>;
}

/**
 * Browser tool for web operations
 */
const browserTool: Tool = {
  name: 'BROWSER',
  execute: async (task: string, chatId: string) => {
    console.log(`Executing browser task: ${task}`);
    try {
      // Use the existing bridge service to execute browser tasks
      const result = await bridgeService.sendPrompt(task);
      console.log(`Browser task sent to bridge, task ID: ${result.taskId}`);
      return {
        success: true,
        taskId: result.taskId,
        message: `Browser task initiated with ID: ${result.taskId}`
      };
    } catch (error) {
      console.error('Error executing browser task:', error);
      return {
        success: false,
        message: `Error executing browser task: ${error}`
      };
    }
  }
};

// Import the shell tool
async function importShellTool() {
  const { shellTool } = await import('./tools/shellTool');
  return shellTool;
}

// Map of available tools
const tools: Record<string, Tool> = {
  BROWSER: browserTool
};

/**
 * Determine which tool to use for a task and execute it
 * 
 * @param task The task to execute
 * @param chatId The chat ID associated with the task
 * @returns The result of the tool execution
 */
export async function executeTask(task: string, chatId: string): Promise<any> {
  try {
    console.log(`Determining tool for task: ${task}`);
    
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
        content: `Task: ${task}

Available tools:
1. BROWSER - Use for web browsing, searching, and interacting with websites
2. SHELL - Use for terminal operations, executing commands, and file operations

If you choose SHELL, also provide a shell script that accomplishes the task.`
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
        text: `**Tool Selection:**\n\nTask: ${task}\nSelected Tool: ${toolName}\nReasoning: ${reasoning}`,
        sender: 'agent',
        timestamp: new Date().toISOString()
      });
    }
    
    // Log execution information
    console.log(`Executing task with ${toolName} tool: ${task}`);
    console.log(`Reasoning: ${reasoning}`);
    
    // Handle tool execution based on type
    if (toolName === 'SHELL') {
      // For SHELL tool, import and execute it directly
      const script = toolResponse.script || '';
      const shellTool = await importShellTool();
      return await shellTool.execute(task, chatId, { script });
    } else if (toolName === 'BROWSER') {
      // For BROWSER tool, use the browser tool
      return await browserTool.execute(task, chatId);
    } else {
      // Unknown tool
      console.error(`Unknown tool: ${toolName}`);
      return {
        success: false,
        message: `Unknown tool: ${toolName}. Reasoning provided: ${reasoning}`
      };
    }
  } catch (error) {
    console.error('Error executing task:', error);
    return {
      success: false,
      message: `Error executing task: ${error}`
    };
  }
}
