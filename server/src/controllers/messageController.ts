import { Request, Response } from 'express';
import { Message, Chat } from '../models';
import mongoose from 'mongoose';

// Get messages for a chat
export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    
    // Validate chatId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      res.status(400).json({ error: 'Invalid chat ID format' });
      return;
    }
    
    // Find messages for the chat, sorted by timestamp
    const messages = await Message.find({ chatId })
      .sort({ timestamp: 1 })
      .limit(100);
    
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Create a new message
export const createMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    const { role, content, metadata } = req.body;
    
    // Validate required fields
    if (!role || !content) {
      res.status(400).json({ error: 'Role and content are required' });
      return;
    }
    
    // Validate chatId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      res.status(400).json({ error: 'Invalid chat ID format' });
      return;
    }
    
    // Check if chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }
    
    // Create and save the message
    const message = new Message({
      chatId,
      role,
      content,
      timestamp: new Date(),
      metadata
    });
    
    await message.save();
    
    // Update the lastMessageAt timestamp in the chat
    chat.lastMessageAt = new Date();
    await chat.save();
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
};

// Delete a message
export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Find and delete the message
    const message = await Message.findByIdAndDelete(id);
    
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    
    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};
