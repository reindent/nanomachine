/**
 * Task Context Manager
 * 
 * This service maintains context between task executions, allowing information
 * to be shared across multiple steps in a strategy plan.
 */

/**
 * Manages context storage and retrieval for task execution
 */
export class TaskContextManager {
  private contextStore: Map<string, Record<string, any>> = new Map();
  
  /**
   * Store context for a specific chat session
   * 
   * @param chatId The chat ID to store context for
   * @param key The context key
   * @param value The context value
   */
  storeContext(chatId: string, key: string, value: any): void {
    const chatContext = this.contextStore.get(chatId) || {};
    chatContext[key] = value;
    this.contextStore.set(chatId, chatContext);
    console.log(`Stored context for chat ${chatId}, key: ${key}`);
  }
  
  /**
   * Store multiple context values for a chat session
   * 
   * @param chatId The chat ID to store context for
   * @param contextData Object containing key-value pairs to store
   */
  storeMultipleContext(chatId: string, contextData: Record<string, any>): void {
    const chatContext = this.contextStore.get(chatId) || {};
    this.contextStore.set(chatId, { ...chatContext, ...contextData });
    console.log(`Stored multiple context values for chat ${chatId}`);
  }
  
  /**
   * Retrieve context for a specific chat session
   * 
   * @param chatId The chat ID to retrieve context for
   * @param key Optional specific context key to retrieve
   * @returns The context value(s)
   */
  getContext(chatId: string, key?: string): any {
    const chatContext = this.contextStore.get(chatId) || {};
    return key ? chatContext[key] : chatContext;
  }
  
  /**
   * Check if context exists for a chat session
   * 
   * @param chatId The chat ID to check
   * @param key Optional specific context key to check
   * @returns True if context exists
   */
  hasContext(chatId: string, key?: string): boolean {
    const chatContext = this.contextStore.get(chatId);
    if (!chatContext) return false;
    return key ? key in chatContext : Object.keys(chatContext).length > 0;
  }
  
  /**
   * Clear context for a specific chat session
   * 
   * @param chatId The chat ID to clear context for
   */
  clearContext(chatId: string): void {
    this.contextStore.delete(chatId);
    console.log(`Cleared context for chat ${chatId}`);
  }
}

// Create a singleton instance
export const taskContextManager = new TaskContextManager();
