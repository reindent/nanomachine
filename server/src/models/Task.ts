import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  taskId: string;          // Unique task identifier
  prompt: string;          // Original task prompt
  tabId?: number;          // Browser tab ID (if applicable)
  chatId?: string;         // Reference to the chat this task belongs to
  status: string;          // 'pending', 'running', 'completed', 'failed', 'cancelled'
  result?: any;            // Task result (if completed)
  error?: string;          // Error message (if failed)
  archived: boolean;       // Whether this task is archived
  startTime: Date;         // When the task was started
  endTime?: Date;          // When the task was completed/failed/cancelled
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    taskId: { 
      type: String, 
      required: true, 
      unique: true,
      index: true 
    },
    prompt: { 
      type: String, 
      required: true 
    },
    tabId: { 
      type: Number 
    },
    chatId: {
      type: String,
      ref: 'Chat',
      index: true
    },
    status: { 
      type: String, 
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true
    },
    result: { 
      type: Schema.Types.Mixed 
    },
    error: { 
      type: String 
    },
    archived: {
      type: Boolean,
      default: false,
      index: true
    },
    startTime: { 
      type: Date, 
      default: Date.now 
    },
    endTime: { 
      type: Date 
    }
  },
  { 
    timestamps: true 
  }
);

export default mongoose.model<ITask>('Task', TaskSchema);
