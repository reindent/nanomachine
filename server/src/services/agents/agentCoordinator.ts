/**
 * Agent Coordinator Service
 * 
 * Coordinates the strategist and executor agents to handle user requests.
 */
import { generateStrategyPlan } from './strategistAgent';
import { executeTask } from './executorAgent';
import { parseTasks } from './taskParser';

/**
 * Result of a task execution
 */
interface TaskExecutionResult {
  task: string;
  result: any;
}

/**
 * Process a user request through the strategist and executor agents
 * 
 * @param userRequest The user's request message
 * @param chatId The chat ID associated with the request
 * @returns An object with the strategy plan and execution results
 */
export async function processUserRequest(userRequest: string, chatId: string): Promise<{
  strategyPlan: string;
  executionResults: TaskExecutionResult[];
}> {
  try {
    console.log(`Processing user request: ${userRequest}`);
    
    // Generate a strategy plan using the strategist agent
    const strategyPlan = await generateStrategyPlan(userRequest);
    console.log(`Generated strategy plan: ${strategyPlan}`);
    
    // Parse tasks from the strategy plan
    const tasks = parseTasks(strategyPlan);
    console.log(`Parsed ${tasks.length} tasks from strategy plan`);
    
    // Execute each task sequentially
    const executionResults: TaskExecutionResult[] = [];
    
    for (const task of tasks) {
      console.log(`Executing task: ${task}`);
      const result = await executeTask(task, chatId);
      executionResults.push({
        task,
        result
      });
    }
    
    return {
      strategyPlan,
      executionResults
    };
  } catch (error) {
    console.error('Error processing user request:', error);
    throw error;
  }
}
