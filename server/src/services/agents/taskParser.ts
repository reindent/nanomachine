/**
 * Task Parser
 * 
 * Utility to parse tasks from a strategy plan.
 */

/**
 * Parse tasks from a strategy plan
 * 
 * @param strategyPlan The strategy plan as a string
 * @returns An array of individual tasks
 */
export function parseTasks(strategyPlan: string): string[] {
  // Split the plan into lines
  const lines = strategyPlan.split('\n');
  
  // Extract tasks (lines that match the pattern "[ ] Task description")
  const tasks: string[] = [];
  
  for (const line of lines) {
    // Match checkbox pattern: "[ ] Task description" or "- [ ] Task description"
    const checkboxMatch = line.match(/(?:-\s*)?\[ \]\s*(.*)/);
    if (checkboxMatch && checkboxMatch[1]) {
      tasks.push(checkboxMatch[1].trim());
    }
    // Also match numbered list items or bullet points that look like tasks
    else if (line.match(/^(?:\d+\.|[-•*])\s+(.+)$/)) {
      const taskMatch = line.match(/^(?:\d+\.|[-•*])\s+(.+)$/);
      if (taskMatch && taskMatch[1]) {
        tasks.push(taskMatch[1].trim());
      }
    }
  }
  
  return tasks;
}
