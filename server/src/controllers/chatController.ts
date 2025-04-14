import { Request, Response } from 'express';
import { Chat, Message } from '../models';

// Get all chats
export const getChats = async (req: Request, res: Response): Promise<void> => {
  try {
    const chats = await Chat.find({ isActive: true })
      .sort({ lastMessageAt: -1 })
      .limit(50);
    
    res.status(200).json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

// Get a single chat by ID
export const getChatById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const chat = await Chat.findById(id);
    
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }
    
    res.status(200).json(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
};

// Create a new chat
export const createChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title = 'New Chat', userId } = req.body;
    
    const chat = new Chat({
      title,
      userId,
      lastMessageAt: new Date()
    });
    
    await chat.save();
    res.status(201).json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
};

// Update a chat
export const updateChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, isActive } = req.body;
    
    const chat = await Chat.findById(id);
    
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }
    
    if (title !== undefined) chat.title = title;
    if (isActive !== undefined) chat.isActive = isActive;
    
    await chat.save();
    res.status(200).json(chat);
  } catch (error) {
    console.error('Error updating chat:', error);
    res.status(500).json({ error: 'Failed to update chat' });
  }
};

// Delete a chat (soft delete by setting isActive to false)
export const deleteChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const chat = await Chat.findById(id);
    
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }
    
    chat.isActive = false;
    await chat.save();
    
    res.status(200).json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
};
