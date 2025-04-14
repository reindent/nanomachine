import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  title: string;           // Chat title
  userId?: string;         // Optional user identifier (for future auth)
  isActive: boolean;       // Whether this chat is active
  lastMessageAt: Date;     // Timestamp of the last message
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema: Schema = new Schema(
  {
    title: { 
      type: String, 
      required: true,
      default: 'New Chat'
    },
    userId: { 
      type: String
    },
    isActive: { 
      type: Boolean, 
      default: true,
      index: true
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    }
  },
  { 
    timestamps: true 
  }
);

// Index for efficient querying of active chats
ChatSchema.index({ isActive: 1, lastMessageAt: -1 });

export default mongoose.model<IChat>('Chat', ChatSchema);
