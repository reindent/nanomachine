/**
 * Shell Tool
 * 
 * A simple tool for executing shell commands in the Docker VM
 */
import { Tool } from '../executorAgent';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Execute a command in the Docker container
 * @param command The command to execute
 * @returns The command output
 */
async function executeInDocker(command: string): Promise<string> {
  try {
    // Simple docker exec command to run the script in the container
    const dockerCommand = `docker exec nanomachine-vm bash -c "${command.replace(/"/g, '\\"')}"`;
    console.log(`Executing in Docker: ${dockerCommand}`);
    
    const { stdout, stderr } = await execPromise(dockerCommand);
    
    if (stderr) {
      console.error(`Docker command stderr: ${stderr}`);
    }
    
    return stdout;
  } catch (error) {
    console.error('Error executing command in Docker:', error);
    throw error;
  }
}

/**
 * Shell tool implementation
 */
export const shellTool: Tool = {
  name: 'SHELL',
  async execute(task: string, chatId: string, params?: any): Promise<any> {
    console.log(`Executing shell task: ${task}`);
    try {
      // Extract the script from the response
      const script = params?.script || task;
      
      // Execute the script in Docker
      const output = await executeInDocker(script);
      
      return {
        success: true,
        message: `Command executed successfully`,
        output
      };
    } catch (error) {
      console.error('Error executing shell task:', error);
      return {
        success: false,
        message: `Error executing shell task: ${error}`
      };
    }
  }
};

export default shellTool;
