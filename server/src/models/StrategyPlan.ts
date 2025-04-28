/**
 * StrategyPlan Model
 * 
 * Represents a strategy plan with versioning for a chat session.
 * Each plan can have multiple versions, with only one active at a time.
 */
import mongoose, { Schema, Document } from 'mongoose';

// Interface for a single step in the strategy
export interface IStrategyStep {
  id: string;
  stepNumber: number;
  tool: 'BROWSER' | 'SHELL' | 'DATA';
  description: string;
  taskIds: string[]; // IDs of tasks created when this step was executed
  isCompleted: boolean;
  lastModified: Date;
}

// Interface for a version of the strategy plan
export interface IStrategyVersion {
  versionNumber: number;
  steps: IStrategyStep[];
  createdAt: Date;
  createdBy: 'user' | 'agent'; // Track if this version was created by the user or the AI
  isActive: boolean; // Only one version can be active at a time
}

// Main StrategyPlan interface
export interface IStrategyPlan extends Document {
  chatId: string;
  versions: IStrategyVersion[];
  currentVersion: number;
  lastExecutedAt?: Date;
  executionCount: number;
}

// Schema for a step
const StrategyStepSchema = new Schema({
  id: { type: String, required: true },
  stepNumber: { type: Number, required: true },
  tool: { type: String, enum: ['BROWSER', 'SHELL', 'DATA'], required: true },
  description: { type: String, required: true },
  taskIds: [{ type: String }],
  isCompleted: { type: Boolean, default: false },
  lastModified: { type: Date, default: Date.now }
});

// Schema for a version
const StrategyVersionSchema = new Schema({
  versionNumber: { type: Number, required: true },
  steps: [StrategyStepSchema],
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, enum: ['user', 'agent'], default: 'agent' },
  isActive: { type: Boolean, default: true }
});

// Main schema
const StrategyPlanSchema = new Schema({
  chatId: { type: String, required: true, unique: true },
  versions: [StrategyVersionSchema],
  currentVersion: { type: Number, default: 1 },
  lastExecutedAt: { type: Date },
  executionCount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<IStrategyPlan>('StrategyPlan', StrategyPlanSchema);
