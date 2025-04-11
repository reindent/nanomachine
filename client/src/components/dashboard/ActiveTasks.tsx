import React from 'react';
import TaskStatus from '../common/TaskStatus';
import LoadingSpinner from '../common/LoadingSpinner';

export interface Task {
  id: string;
  status: 'completed' | 'running' | 'idle';
  message: string;
  timestamp: string;
  progress?: number;
}

interface ActiveTasksProps {
  tasks: Task[];
  isLoading: boolean;
  onRefresh: () => void;
}

const ActiveTasks: React.FC<ActiveTasksProps> = ({ tasks, isLoading, onRefresh }) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm uppercase tracking-wider text-gray-500 font-medium">Active Tasks</h2>
        <button 
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center justify-center p-1.5 bg-blue-500 text-white hover:bg-blue-600 transition-colors text-xs"
        >
          {isLoading ? (
            <LoadingSpinner size="sm" color="text-white" />
          ) : (
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
          )}
        </button>
      </div>
      
      <div className="bg-white p-3">
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskStatus
              key={task.id}
              taskId={task.id}
              status={task.status}
              progress={task.progress}
              message={task.message}
              timestamp={task.timestamp}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActiveTasks;
