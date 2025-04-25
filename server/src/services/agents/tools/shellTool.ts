/**
 * Shell Tool
 * 
 * A simple tool for executing shell commands in the Docker VM
 */
import { Tool, ToolResponse } from '../executorAgent';
import { exec } from 'child_process';
import { promisify } from 'util';

const NANOMACHINE_CONTAINER_NAME = 'nanomachine-vm';
const execPromise = promisify(exec);

/**
 * Execute a command in the Docker container
 * @param command The command to execute
 * @returns The command output
 */
async function executeInDocker(command: string): Promise<string> {
  try {
    // Simple docker exec command to run the script in the container
    const dockerCommand = `docker exec ${NANOMACHINE_CONTAINER_NAME} bash -c "${command.replace(/"/g, '\\"')}"`;
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
export
const shellTool = async (task: string, options: any = {}): Promise<ToolResponse> => {
  console.log(`Executing shell task: ${task}`);
  
  try {
    // Extract the script from the response
    const script = options.script || task;

    // Execute the script in Docker
    const output = await executeInDocker(script);
  
    const result = {
      success: true,
      message: `Command executed successfully: ${JSON.stringify(output)}`,
      data: output
    };

    return result;
  } catch (error) {
    console.error('Error executing shell task:', error);

    return {
      success: false,
      message: `Error executing shell task: ${error}`
    };
  }
};

export default shellTool;
