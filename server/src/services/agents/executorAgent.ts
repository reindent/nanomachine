/**
 * Executor Agent Service
 * 
 * This service implements an AI agent that executes tasks from the strategist's plan.
 * It has two tools: browser and filesystem.
 */
import 'dotenv/config';
import { ChatOpenAI } from "@langchain/openai";
import bridgeService from '../bridgeService';
import { z } from "zod";

/**
 * Schema for the executor response
 */
const ExecutorToolSchema = z.object({
  tool: z.enum(['BROWSER', 'FILESYSTEM']),
  reasoning: z.string()
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

/**
 * Tool interface for executor agent
 */
interface Tool {
  name: string;
  execute: (task: string, chatId: string) => Promise<any>;
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

/**
 * Filesystem tool for file operations (mocked for now)
 */
const filesystemTool: Tool = {
  name: 'FILESYSTEM',
  execute: async (task: string, chatId: string) => {
    console.log(`Executing filesystem task (mocked): ${task}`);
    // Mock implementation - will be developed later
    return {
      success: true,
      message: `Filesystem operation simulated: ${task}`
    };
  }
};

// Map of available tools
const tools: Record<string, Tool> = {
  BROWSER: browserTool,
  FILESYSTEM: filesystemTool
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
    
    // Create system message with instructions
    const systemMessage = {
      role: 'system' as const,
      content: `
        You are an Executor AI agent that executes tasks from a strategy plan.
        Your job is to analyze each task and determine which tool to use to execute it.
        
        You have these tools available:
        1. BROWSER - For web browsing tasks (navigating to websites, searching online)
        2. FILESYSTEM - For file operations (creating, reading, writing files)
        
        Determine which tool to use for this task and explain your reasoning clearly.
      `
    };
    
    // Prepare messages for the conversation
    const messages = [
      systemMessage,
      {
        role: 'user' as const,
        content: `Task: ${task}`
      }
    ];
    
    // Configure the model for structured output
    const structuredOutputModel = executorModel.withStructuredOutput(ExecutorToolSchema);
    
    // Use structured output to determine the tool
    const toolResponse = await structuredOutputModel.invoke(messages);
    console.log(`Tool decision:`, JSON.stringify(toolResponse, null, 2));
    
    // Extract the tool name and reasoning from the structured response
    const { tool: toolName, reasoning } = toolResponse;
    
    // Check if the tool exists
    if (!tools[toolName]) {
      console.error(`Unknown tool: ${toolName}`);
      return {
        success: false,
        message: `Unknown tool: ${toolName}. Reasoning provided: ${reasoning}`
      };
    }
    
    // Execute the task with the selected tool
    console.log(`Executing task with ${toolName} tool: ${task}`);
    console.log(`Reasoning: ${reasoning}`);
    return await tools[toolName].execute(task, chatId);
  } catch (error) {
    console.error('Error executing task:', error);
    return {
      success: false,
      message: `Error executing task: ${error}`
    };
  }
}
