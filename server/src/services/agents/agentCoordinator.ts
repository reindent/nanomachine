/**
 * Agent Coordinator Service
 * 
 * Coordinates the strategist and executor agents to handle user requests.
 */
import { generateStrategyPlan } from './strategistAgent';
import { executeTask } from './executorAgent';
import { parseTasks } from './taskParser';
import bridgeService from '../bridgeService';
import { Server } from 'socket.io';
import { taskContextManager } from './contextManager';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { addMessageToChat } from '../chatService';
import { saveStrategyPlan } from '../strategyPlanService';

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
    console.log('Generating final response to user request');
    
    // Create a context processor model
    const responseGenerator = new ChatOpenAI({
      openAIApiKey: OPENAI_API_KEY,
      modelName: process.env.EXECUTOR_MODEL || "o4-mini",
    });
    
    // Get context from previous tasks
    const context = taskContextManager.getContext(chatId);
    
    // Create messages for the chat model
    const messages = [
      {
        role: 'system' as const,
        content: `You are an AI assistant that generates helpful, accurate responses to user requests.
        Your job is to synthesize the results of multiple tasks into a coherent, comprehensive answer.
        Be specific and provide concrete information from the task results.`
      },
      {
        role: 'user' as const,
        content: `Original request: ${userRequest}\n\n` +
          `Task results:\n${executionResults.map(result => 
            `Task: ${result.task}\nResult: ${JSON.stringify(result.result, null, 2)}\n`
          ).join('\n')}\n\n` +
          `Available context:\n${JSON.stringify(context, null, 2)}\n\n` +
          `Generate a comprehensive response that directly addresses the original request.
          Incorporate specific details from the task results and context.
          Format your response in a clear, well-structured way.`
      }
    ];
    
    // Generate the final response
    const response = await responseGenerator.pipe(new StringOutputParser()).invoke(messages);
    
    return response;
  } catch (error) {
    console.error('Error generating final response:', error);
    return 'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.';
  }
}

/**
 * Plan a user request using the strategist agent without executing it
 * 
 * @param userRequest The user's request message
 * @param chatId The chat ID associated with the request
 * @returns The strategy plan generated for the request
 */
export async function planUserRequest(userRequest: string, chatId: string): Promise<string> {
  try {
    console.log(`Planning user request: ${userRequest}`);
    
    // Clear any existing context for this chat session
    taskContextManager.clearContext(chatId);
    
    // Generate a strategy plan using the strategist agent
    const strategyPlan = await generateStrategyPlan(userRequest);
    
    // Save the strategy plan to the database
    await saveStrategyPlan(chatId, strategyPlan);
    
    // Emit the plan:created event to the client
    if (io) {
      io.emit('plan:created', {
        chatId,
        plan: strategyPlan,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('Cannot emit plan:created event: Socket.IO instance not configured');
    }
    
    return strategyPlan;
  } catch (error) {
    console.error('Error planning user request:', error);
    throw error;
  }
}

/**
 * Execute a previously generated user plan
 * 
 * @param userRequest The original user's request message
 * @param strategyPlan The strategy plan to execute
 * @param chatId The chat ID associated with the request
 * @returns An object with the execution results and final response
 */
export async function executeUserPlan(userRequest: string, strategyPlan: string, chatId: string): Promise<{
  executionResults: TaskExecutionResult[];
  finalResponse: string;
}> {
  try {
    console.log(`Executing plan for user request: ${userRequest}`);
    
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
      executionResults,
      finalResponse
    };
  } catch (error) {
    console.error('Error processing user request:', error);
    throw error;
  }
}
