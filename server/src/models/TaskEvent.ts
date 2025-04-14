import mongoose, { Schema, Document } from 'mongoose';

export interface ITaskEvent extends Document {
  taskId: string;          // Reference to parent task
  actor: string;           // 'planner', 'navigator', 'validator'
  state: string;           // Event state (e.g., 'task.start', 'step.ok', 'task.error')
  timestamp: Date;         // When the event occurred
  data: {
    step: number;          // Current step number
    maxSteps: number;      // Maximum steps
    details: string;       // Event details/message
  };
  createdAt: Date;
}

const TaskEventSchema: Schema = new Schema(
  {
    taskId: { 
      type: String, 
      required: true,
      ref: 'Task',
      index: true
    },
    actor: { 
      type: String, 
      required: true,
      enum: ['planner', 'navigator', 'validator'],
      index: true
    },
    state: { 
      type: String, 
      required: true,
      index: true
    },
    timestamp: { 
      type: Date, 
      default: Date.now,
      index: true
    },
    data: {
      step: { 
        type: Number,
        default: 0
      },
      maxSteps: { 
        type: Number,
        default: 0
      },
      details: { 
        type: String,
        default: ''
      }
    }
  },
  { 
    timestamps: true 
  }
);

// Compound index for efficient querying of events for a specific task
TaskEventSchema.index({ taskId: 1, timestamp: 1 });

export default mongoose.model<ITaskEvent>('TaskEvent', TaskEventSchema);
