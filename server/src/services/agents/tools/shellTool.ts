/**
 * Shell Tool
 * 
 * This tool handles shell operations in the Docker container.
 */

// Tool description for use by other agents
export const SHELL_TOOL_DESCRIPTION = {
  name: "Shell Tool",
  description: "Executes shell commands in the Docker container to perform filesystem operations, process data, and interact with the operating system.",
  capabilities: [
    "File creation, reading, and manipulation",
    "Directory operations and navigation",
    "Text processing and data extraction",
    "System information retrieval",
    "Data analysis using command-line tools"
  ],
  bestFor: [
    "File and directory management tasks",
    "Processing and analyzing local data",
    "Simple text manipulation and extraction",
    "System configuration and information gathering"
  ]
};

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
