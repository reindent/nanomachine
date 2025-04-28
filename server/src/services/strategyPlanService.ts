/**
 * Strategy Plan Service
 * 
 * Simple service for creating and managing strategy plans
 */
import StrategyPlan, { IStrategyPlan, IStrategyStep, IStrategyVersion } from '../models/StrategyPlan';
import { v4 as uuidv4 } from 'uuid';
import { parseTasks } from './agents/taskParser';

/**
 * Create a new strategy plan or update an existing one
 * 
 * @param chatId The chat ID to create/update the plan for
 * @param planText The raw strategy plan text from the strategist
 * @returns The created/updated strategy plan
 */
export async function saveStrategyPlan(chatId: string, planText: string): Promise<IStrategyPlan> {
  try {
    // Parse the tasks from the plan text
    const tasks = parseTasks(planText);
    
    // Convert tasks to strategy steps
    const steps: IStrategyStep[] = tasks.map((task, index) => {
      // Determine the tool type from the task text
      let tool: 'BROWSER' | 'SHELL' | 'DATA' = 'BROWSER'; // Default
      if (task.toLowerCase().includes('shell') || task.toLowerCase().includes('command')) {
        tool = 'SHELL';
      } else if (task.toLowerCase().includes('data') || task.toLowerCase().includes('synthesize')) {
        tool = 'DATA';
      }
      
      return {
        id: uuidv4(),
        stepNumber: index + 1,
        tool,
        description: task,
        taskIds: [],
        isCompleted: false,
        lastModified: new Date()
      };
    });
    
    // Check if a strategy plan already exists for this chat
    let strategyPlan = await StrategyPlan.findOne({ chatId });
    
    if (strategyPlan) {
      // Create a new version
      const newVersionNumber = strategyPlan.currentVersion + 1;
      
      // Set all existing versions to inactive
      strategyPlan.versions.forEach(version => {
        version.isActive = false;
      });
      
      // Add the new version
      const newVersion: IStrategyVersion = {
        versionNumber: newVersionNumber,
        steps,
        createdAt: new Date(),
        createdBy: 'agent',
        isActive: true
      };
      strategyPlan.versions.push(newVersion);
      
      // Update the current version
      strategyPlan.currentVersion = newVersionNumber;
    } else {
      // Create a new strategy plan
      const initialVersion: IStrategyVersion = {
        versionNumber: 1,
        steps,
        createdAt: new Date(),
        createdBy: 'agent',
        isActive: true
      };
      
      strategyPlan = new StrategyPlan({
        chatId,
        versions: [initialVersion],
        currentVersion: 1,
        executionCount: 0
      });
    }
    
    // Save and return the strategy plan
    await strategyPlan.save();
    return strategyPlan;
  } catch (error) {
    console.error('Error saving strategy plan:', error);
    throw error;
  }
}
