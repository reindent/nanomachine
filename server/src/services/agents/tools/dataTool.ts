/**
 * Data Tool for processing and synthesizing data
 * 
 * This tool handles data processing tasks such as cleaning, deduplication,
 * ranking, and presentation of data collected from previous tasks.
 */
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { taskContextManager } from '../contextManager';
import { Tool, ToolResponse } from '../executorAgent';

// Get API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

/**
 * Data tool for processing and synthesizing data
 */
export
const dataTool = async (enrichedTask: string, params?: any): Promise<ToolResponse> => {
  console.log(`Executing data task: ${enrichedTask}`);
  
  const { context } = params;
  
  try {
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
        content: `Task: ${enrichedTask}
        
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
    
    // Return the processed data
    return {
      success: true,
      message: `Data processed successfully: ${JSON.stringify(processedData)}`,
      data: processedData,
    };
  } catch (error) {
    console.error('Error processing data:', error);
    return {
      success: false,
      message: `Error processing data: ${error}`
    };
  }
};
