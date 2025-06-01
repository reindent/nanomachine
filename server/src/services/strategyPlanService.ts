/**
 * Strategy Plan Service
 * 
 * Simple service for creating and managing strategy plans
 */
import StrategyPlan, { IStrategyPlan, IStrategyVersion } from '../models/StrategyPlan';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Server } from 'socket.io';

export const StrategyPlanSchema = z.object({
  plan: z.array(z.object({
    tool: z.enum(['BROWSER', 'SHELL', 'DATA']),
    task: z.string()
  })),
  description: z.string().describe('Description of the strategy plan'),
});

let io: Server | undefined;

export function configureStrategyPlanService(socketIo: Server) {
  io = socketIo;
}

/**
 * Create a new strategy plan or update an existing one
 * 
 * @param chatId The chat ID to create/update the plan for
 * @param generatedPlan The generated strategy plan to save
 * @returns The created/updated strategy plan
 */
export async function saveStrategyPlan(chatId: string, generatedPlan: z.infer<typeof StrategyPlanSchema>): Promise<IStrategyPlan> {
  try {
    let strategyPlan: IStrategyPlan;
    const existingPlan = await StrategyPlan.findOne({ chatId });

    // Create a new version of the strategy plan
    const newVersion: IStrategyVersion = {
      versionNumber: 1,
      description: generatedPlan.description,
      steps: generatedPlan.plan.map((step, index) => ({
        id: uuidv4(),
        stepNumber: index + 1,
        tool: step.tool,
        description: step.task,
        taskIds: [],
        lastModified: new Date()
      })),
      createdAt: new Date(),
      createdBy: 'agent',
    };

    if (existingPlan) {
      strategyPlan = existingPlan;
      newVersion.versionNumber = strategyPlan.versions.length + 1;
      strategyPlan.currentVersion = newVersion.versionNumber;
      strategyPlan.description = newVersion.description;
      strategyPlan.versions.push(newVersion);
    } else {
      strategyPlan = await StrategyPlan.create({
        chatId,
        description: generatedPlan.description,
        versions: [newVersion],
        currentVersion: 1,
        executionCount: 0
      });
    }
    
    await strategyPlan.save();

    // Notify all clients that a new strategy plan was created
    if (io) io.emit('strategy:update', { chatId, plan: generatedPlan });

    return strategyPlan;
  } catch (error) {
    console.error('Error saving strategy plan:', error);
    throw error;
  }
}

/**
 * Get the latest strategy plan for a chat
 * 
 * @param chatId The chat ID to get the strategy plan for
 * @returns The latest strategy plan or null if none exists
 */
export async function getLatestStrategyPlan(chatId: string): Promise<IStrategyPlan | null> {
  try {
    const strategyPlan = await StrategyPlan.findOne({ chatId });
    
    if (strategyPlan) {
      // Convert to the format expected by the client
      const currentVersion = strategyPlan.versions[strategyPlan.currentVersion - 1];
      const planData = {
        description: currentVersion.description,
        plan: currentVersion.steps.map(step => ({
          tool: step.tool,
          task: step.description
        }))
      };
      
      if (io) io.emit('strategy:update', { chatId, plan: planData });
    }
    
    return strategyPlan;
  } catch (error) {
    console.error('Error getting strategy plan:', error);
    return null;
  }
}

/**
 * Turn a IStrategyPlan into a string representation
 * 
 * @param plan The strategy plan to convert
 * @returns A string representation of the strategy plan
 * 
 * Example:
 * [BROWSER] Go to Hacker News
 * [SHELL] Find the latest AI agents
 * [DATA] Return a summary of the latest AI agents
 */
export function strategyPlanToString(plan: IStrategyPlan): string {
  return plan.versions[plan.currentVersion - 1].steps.map(step => `[${step.tool}] ${step.description}`).join('\n');
}