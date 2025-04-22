/**
 * Data Tool for processing and synthesizing data
 * 
 * This tool handles data processing tasks such as cleaning, deduplication,
 * ranking, and presentation of data collected from previous tasks.
 */
import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { Server } from 'socket.io';
import { taskContextManager } from '../contextManager';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Tool } from '../executorAgent';

// Get API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Socket.io instance reference
let io: Server;

/**
 * Configure the data tool with the Socket.IO server instance
 * @param socketIo The Socket.IO server instance
 */
export function configureDataTool(socketIo: Server) {
  io = socketIo;
}

/**
 * Data tool for processing and synthesizing data
 */
export const dataTool: Tool = {
  name: 'DATA',
  execute: async (task: string, chatId: string) => {
    console.log(`Executing data task: ${task}`);
    try {
      // Get context from previous tasks
      const context = taskContextManager.getContext(chatId);
      
      if (!taskContextManager.hasContext(chatId)) {
        return {
          success: false,
          message: 'No context available for data processing'
        };
      }
      
      // Create a data processor model
      const dataProcessor = new ChatOpenAI({
        openAIApiKey: OPENAI_API_KEY,
        modelName: process.env.EXECUTOR_MODEL || "o4-mini",
      });
      
      // Create messages for the chat model
      const messages = [
        {
          role: 'system' as const,
          content: `You are an AI assistant that processes and synthesizes data.
          Your job is to analyze, clean, deduplicate, rank, or present data based on the task description.
          Return your results in a well-formatted, structured way.`
        },
        {
          role: 'user' as const,
          content: `Task: ${task}
          
          Available data from previous tasks:
          ${JSON.stringify(context, null, 2)}
          
          Process this data according to the task requirements.
          If the task involves ranking, clearly explain your ranking criteria.
          If the task involves cleaning or deduplication, explain what was removed.
          Format your response in a clear, structured way that's easy to read.`
        }
      ];
      
      // Get the processed data
      const processedData = await dataProcessor.pipe(new StringOutputParser()).invoke(messages);
      
      // Send the processed data as a message to the client if io is available
      if (io && chatId) {
        io.emit('chat:message', {
          id: `data-${Date.now()}`,
          chatId,
          text: processedData,
          sender: 'agent',
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        message: 'Data processed successfully',
        data: processedData
      };
    } catch (error) {
      console.error('Error processing data:', error);
      return {
        success: false,
        message: `Error processing data: ${error}`
      };
    }
  }
};
