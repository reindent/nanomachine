import Chat from '../models/Chat';
import Message from '../models/Message';
import { Server } from 'socket.io';

let io: Server | undefined;

/**
 * Configure the chat service with Socket.IO
 * @param socketIo Socket.IO server instance
 */
export function configureChatService(socketIo: Server) {
  io = socketIo;
}

/**
 * Add a message to a chat
 * 
 * @param chatId - ID of the chat
 * @param content - Content of the message
 * @param sender - Sender of the message
 * @param timestamp - Optional timestamp for the message
 */
export async function addMessageToChat(chatId: string, content: string, sender: string, keepTyping: boolean): Promise<void> {
  if (!io) {
    console.error('Cannot add message to chat: Socket.IO instance not configured');
    return;
  }

  try {
    // Create a new message record
    const newMessage = new Message({
      chatId,
      content,
      role: sender,
      timestamp: new Date()
    });
    
    // Save the message to the database
    await newMessage.save();
    
    // Update the chat's lastMessageAt timestamp
    await Chat.findByIdAndUpdate(chatId, { lastMessageAt: new Date() });
    
    // Use a simple format that matches what the client expects
    const ioMessage = {
      id: `msg-${Date.now()}`, // Simple ID that doesn't depend on database
      chatId,
      text: content,
      sender,
      keepTyping,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to ALL connected clients without filtering
    io.emit('chat:message', ioMessage);

    console.log(`New message added to chat ${chatId}: ${content} (${sender})`);
  } catch (error) {
    console.error('Error saving message to chat:', error);
  }
}

/**
 * Create a new chat
 * 
 * @returns The ID of the new chat
 */
export async function createChat() {
  if (!io) {
    console.error('Cannot create chat: Socket.IO instance not configured');
    return '';
  }

  console.log('No valid chatId provided, creating new chat');
  const newChat = await Chat.create({
    title: `New Session ${new Date().toLocaleString()}`,
    lastMessageAt: new Date()
  });
  console.log(`Created new chat with ID: ${newChat.id}`);
  
  // Notify all clients that a new chat was created
  io.emit('chat:created', {
    chatId: newChat.id,
    title: newChat.title,
    lastMessageAt: newChat.lastMessageAt,
    isActive: true,
    createdAt: newChat.createdAt,
    updatedAt: newChat.updatedAt
  });
  io.emit('chat:select', newChat.id);

  return newChat;
}
 