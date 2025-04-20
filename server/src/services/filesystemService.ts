/**
 * Filesystem Service
 * 
 * Provides operations for interacting with the filesystem in the VM
 */
import bridgeService from './bridgeService';

/**
 * Opens a terminal with an optional command
 * @param command Optional command to execute in the terminal
 */
export async function openTerminal(command?: string): Promise<void> {
  try {
    // Use bridge service to open a terminal
    // We'll use sendPrompt to send the terminal command to the bridge
    await bridgeService.sendPrompt(command ? `Open a terminal and run: ${command}` : 'Open a terminal');
    console.log(`Terminal opened${command ? ` with command: ${command}` : ''}`);
  } catch (error) {
    console.error('Error opening terminal:', error);
    throw error;
  }
}

export default {
  openTerminal
};
