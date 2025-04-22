/**
 * Agent Coordinator Service
 * 
 * Coordinates the strategist and executor agents to handle user requests.
 */
import { generateStrategyPlan } from './strategistAgent';
import { executeTask } from './executorAgent';
import { parseTasks } from './taskParser';
import bridgeService from '../bridgeService';
import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { taskContextManager } from './contextManager';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';

// Socket.io instance reference
let io: Server;

// Get API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Initialize the LLM for context extraction
const contextProcessor = new ChatOpenAI({
  openAIApiKey: OPENAI_API_KEY,
  modelName: process.env.EXECUTOR_MODEL || "o4-mini",
});

/**
 * Configure the agent coordinator with the Socket.IO server instance
 * @param socketIo The Socket.IO server instance
 */
export function configureAgentCoordinator(socketIo: Server) {
  io = socketIo;
}

/**
 * Result of a task execution
 */
export interface TaskExecutionResult {
  task: string;
  result: any;
}

/**
 * Creates a promise that will resolve when a task is completed
 * This uses the bridge service event system instead of polling
 * @param taskId The task ID to wait for
 * @returns A promise that resolves when the task is completed
 */
function createTaskCompletionPromise(taskId: string): Promise<void> {
  return new Promise((resolve) => {
    // One-time event listener for task completion
    const taskUpdateListener = (update: any) => {
      if (update.taskId === taskId && (update.type === 'task_result' || update.type === 'task_error')) {
        // Task has completed or errored out, clean up listener and resolve
        bridgeService.onTaskUpdate(taskUpdateListener);
        console.log(`Task ${taskId} completed with status: ${update.type}`);
        resolve();
      }
    };
    
    // Register the listener
    bridgeService.onTaskUpdate(taskUpdateListener);
    console.log(`Waiting for completion of task ${taskId}...`);
  });
}

/**
 * Extract meaningful information from a task result
 * 
 * @param task The task that was executed
 * @param result The result of the task execution
 * @returns Extracted context as a key-value object
 */
async function extractContextFromResult(task: string, result: any): Promise<Record<string, any>> {
  // Skip extraction for unsuccessful tasks
  if (!result || !result.success) {
    return {};
  }
  
  try {
    // For browser tasks, use the finalResult if available
    const resultToProcess = result.finalResult ? result.finalResult : result;
    
    // Create messages for the context extraction
    const messages = [
      {
        role: 'system' as const,
        content: `You are an AI assistant that extracts key information from task results.
        Your job is to identify important data points that might be needed for future tasks.
        Extract information in a structured JSON format with descriptive keys.
        Focus on extracting specific, concrete values that would be useful for subsequent tasks.`
      },
      {
        role: 'user' as const,
        content: `Task: ${task}
        
        Task result: ${JSON.stringify(resultToProcess, null, 2)}
        
        Extract key information from this result that might be useful for future tasks.
        Return your extraction as a valid JSON object with descriptive keys.
        For example: { "topWebsites": ["site1.com", "site2.com"], "searchTerm": "AI agents" }
        
        Make sure to include specific URLs, names, identifiers, and other concrete data points.
        Return ONLY a valid JSON object.`
      }
    ];
    
    // Get the extracted context
    const response = await contextProcessor.pipe(new StringOutputParser()).invoke(messages);
    console.log(`Raw context extraction response: ${response}`);
    
    // Parse the JSON response
    try {
      // First attempt: Try parsing the raw response directly
      const extractedContext = JSON.parse(response.trim());
      console.log(`Extracted context from task result: ${JSON.stringify(extractedContext)}`);
      return extractedContext;
    } catch (parseError) {
      console.error('Error parsing context JSON:', parseError);
      
      // Second attempt: Try extracting JSON from markdown code blocks
      try {
        const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          const jsonStr = codeBlockMatch[1].trim();
          const extractedContext = JSON.parse(jsonStr);
          console.log(`Extracted context from code block: ${JSON.stringify(extractedContext)}`);
          return extractedContext;
        }
      } catch (codeBlockError) {
        console.error('Error extracting from code block:', codeBlockError);
      }
      
      // Fallback: Return a simple object with the raw response
      return { rawResponse: response };
    }
  } catch (error) {
    console.error('Error extracting context:', error);
    return {};
  }
}

/**
 * Generate a final response to the user based on task execution results
 * 
 * @param userRequest The original user request
 * @param executionResults Results of all executed tasks
 * @param chatId The chat ID associated with the request
 * @returns A final response message to the user
 */
async function generateFinalResponse(userRequest: string, executionResults: TaskExecutionResult[], chatId: string): Promise<string> {
  try {
    // Get the complete context from all tasks
    const context = taskContextManager.getContext(chatId);
    
    // Create a summary of task execution results
    const taskSummary = executionResults.map((result, index) => {
      const success = result.result && result.result.success ? 'Succeeded' : 'Failed';
      const message = result.result && result.result.message ? result.result.message : 'No result message';
      return `Task ${index + 1}: ${result.task}\nStatus: ${success}\nResult: ${message}`;
    }).join('\n\n');
    
    // Create messages for the response generation
    const messages = [
      {
        role: 'system' as const,
        content: `You are an AI assistant that creates a final response to the user based on task execution results.
        Your job is to assess the level of success in completing the user's request and provide a helpful response.
        Be concise, direct, and informative. If tasks failed, explain what went wrong and suggest alternatives.
        If tasks succeeded, summarize the key findings or results. Do not mention the internal task structure.`
      },
      {
        role: 'user' as const,
        content: `Original user request: "${userRequest}"
        
        Task execution results:
        ${taskSummary}
        
        Available context:
        ${JSON.stringify(context, null, 2)}
        
        Create a final response to the user that addresses their original request based on the task results.`
      }
    ];
    
    // Generate the final response
    const response = await contextProcessor.pipe(new StringOutputParser()).invoke(messages);
    return response;
  } catch (error) {
    console.error('Error generating final response:', error);
    return 'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.';
  }
}

/**
 * Process a user request through the strategist and executor agents
 * 
 * @param userRequest The user's request message
 * @param chatId The chat ID associated with the request
 * @returns An object with the strategy plan, execution results, and final response
 */
export async function processUserRequest(userRequest: string, chatId: string): Promise<{
  strategyPlan: string;
  executionResults: TaskExecutionResult[];
  finalResponse: string;
}> {
  try {
    console.log(`Processing user request: ${userRequest}`);
    
    // Clear any existing context for this chat session
    taskContextManager.clearContext(chatId);
    
    // Store the original user request in context
    // NOTE: commented to test what happens if the user request is not stored
    // taskContextManager.storeContext(chatId, 'userRequest', userRequest);
    
    // Generate a strategy plan using the strategist agent
    const strategyPlan = await generateStrategyPlan(userRequest);
    console.log(`Generated strategy plan: ${strategyPlan}`);
    
    // Store the strategy plan in context
    // NOTE: commented to test what happens if the strategy plan is not stored
    // taskContextManager.storeContext(chatId, 'strategyPlan', strategyPlan);
    
    // Send the strategy plan as a message to the client if io is available
    if (io) {
      io.emit('chat:message', {
        id: `strategy-${Date.now()}`,
        chatId,
        text: `**Strategy Plan:**\n\n${strategyPlan}`,
        sender: 'agent',
        timestamp: new Date().toISOString()
      });
    }
    
    // Parse tasks from the strategy plan
    const tasks = parseTasks(strategyPlan);
    console.log(`Parsed ${tasks.length} tasks from strategy plan`);
    
    // Execute each task sequentially
    const executionResults: TaskExecutionResult[] = [];
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      console.log(`Executing task ${i+1}/${tasks.length}: ${task}`);
      
      // Execute the task with the current context
      const result = await executeTask(task, chatId);
      
      // If this is a browser task with a taskId, the browser tool will handle waiting internally
      // For other tools that might return a taskId, we need to wait for completion
      if (result.taskId && !result.success) {
        console.log(`Task ${result.taskId} started, waiting for completion event...`);
        await createTaskCompletionPromise(result.taskId);
        console.log(`Task ${result.taskId} completed, continuing execution`);
      }
      
      // Extract and store context from the result
      const extractedContext = await extractContextFromResult(task, result);
      if (Object.keys(extractedContext).length > 0) {
        taskContextManager.storeMultipleContext(chatId, extractedContext);
      }
      
      // Store this task's result directly in context
      taskContextManager.storeContext(chatId, `taskResult_${i}`, result);
      
      executionResults.push({
        task,
        result
      });
    }
    
    // After all tasks are completed, store the original user request in context
    // This is only done at the end to avoid influencing task execution
    taskContextManager.storeContext(chatId, 'userRequest', userRequest);
    
    // Generate the final response based on task results and context
    const finalResponse = await generateFinalResponse(userRequest, executionResults, chatId);
    
    return {
      strategyPlan,
      executionResults,
      finalResponse
    };
  } catch (error) {
    console.error('Error processing user request:', error);
    throw error;
  }
}
