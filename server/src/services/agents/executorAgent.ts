/**
 * Executor Agent Service
 * 
 * This service implements an AI agent that executes tasks from the strategist's plan.
 * It has two tools: browser and filesystem.
 */
import 'dotenv/config';
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import bridgeService from '../bridgeService';

// Get API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Initialize the LLM
const executorModel = new ChatOpenAI({
  openAIApiKey: OPENAI_API_KEY,
  modelName: process.env.EXECUTOR_MODEL || "o4-mini",
});

// Create a prompt template for the executor
const executorPrompt = PromptTemplate.fromTemplate(`
You are an Executor AI agent that executes tasks from a strategy plan.
Your job is to analyze each task and determine which tool to use to execute it.

Task: {task}

You have two tools available:
1. Browser - For web browsing tasks (opening browser, navigating to websites, searching online)
2. Filesystem - For file operations (creating, reading, writing files)

Determine which tool to use for this task and explain your reasoning.
If the task involves browsing or web operations, respond with "TOOL: BROWSER".
If the task involves file operations, respond with "TOOL: FILESYSTEM".

Your response:
`);

// Create a chain for the executor
const executorChain = executorPrompt
  .pipe(executorModel)
  .pipe(new StringOutputParser());

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
    
    // Determine which tool to use
    const toolDecision = await executorChain.invoke({
      task,
    });
    
    console.log(`Tool decision: ${toolDecision}`);
    
    // Extract the tool name from the decision
    const toolMatch = toolDecision.match(/TOOL: (\w+)/);
    if (!toolMatch) {
      console.error(`Invalid tool decision: ${toolDecision}`);
      return {
        success: false,
        message: `Could not determine appropriate tool for task: ${task}`
      };
    }
    
    const toolName = toolMatch[1].toUpperCase();
    
    // Check if the tool exists
    if (!tools[toolName]) {
      console.error(`Unknown tool: ${toolName}`);
      return {
        success: false,
        message: `Unknown tool: ${toolName}`
      };
    }
    
    // Execute the task with the selected tool
    console.log(`Executing task with ${toolName} tool: ${task}`);
    return await tools[toolName].execute(task, chatId);
  } catch (error) {
    console.error('Error executing task:', error);
    return {
      success: false,
      message: `Error executing task: ${error}`
    };
  }
}
