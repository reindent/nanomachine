import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;  // Reference to parent chat
  role: string;                     // 'user' or 'assistant'
  content: string;                  // Message content
  timestamp: Date;                  // When the message was sent
  metadata?: {                      // Optional metadata
    taskId?: string;                // Associated task ID if relevant
    tokens?: number;                // Token count if available
    model?: string;                 // Model used for generation
    [key: string]: any;             // Other metadata
  };
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    chatId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Chat',
      required: true,
      index: true
    },
    role: { 
      type: String, 
      required: true,
      enum: ['user', 'assistant', 'system'],
      index: true
    },
    content: { 
      type: String, 
      required: true 
    },
    timestamp: { 
      type: Date, 
      default: Date.now,
      index: true
    },
    metadata: {
      taskId: { type: String },
      tokens: { type: Number },
      model: { type: String },
      type: Schema.Types.Mixed
    }
  },
  { 
    timestamps: true 
  }
);

// Compound index for efficient querying of messages in a chat
MessageSchema.index({ chatId: 1, timestamp: 1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
