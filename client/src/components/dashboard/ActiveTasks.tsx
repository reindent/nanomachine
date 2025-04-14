import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import socketService from '../../services/socketService';

export interface Task {
  taskId: string;
  status: 'completed' | 'running' | 'idle' | 'failed' | 'cancelled' | 'pending';
  prompt: string;
  result?: any;
  error?: string;
  timestamp?: string;
  startTime?: string;
  endTime?: string;
  progress?: number;
}

interface ActiveTasksProps {
  tasks: Task[];
  isLoading: boolean;
  onRefresh: () => void;
}

const ActiveTasks: React.FC<ActiveTasksProps> = ({ tasks, isLoading, onRefresh }) => {
  const handleArchive = (taskId: string) => {
    socketService.archiveTask(taskId);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ', ' + date.toLocaleTimeString();
  };

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Completed</span>;
      case 'running':
        return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Running</span>;
      case 'pending':
        return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Pending</span>;
      case 'failed':
        return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Failed</span>;
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getProgressBar = (task: Task) => {
    if (task.status !== 'running' || typeof task.progress === 'undefined') return null;
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
        <div 
          className="bg-blue-500 h-2.5 rounded-full" 
          style={{ width: `${task.progress}%` }}
        ></div>
      </div>
    );
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm uppercase tracking-wider text-gray-500 font-medium">Task Log</h2>
        <button 
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center justify-center p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
          title="Refresh Tasks"
        >
          {isLoading ? (
            <LoadingSpinner size="sm" color="text-gray-500" />
          ) : (
            <svg 
              className="w-4 h-4" 
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
        {tasks.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No tasks found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.taskId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{task.prompt}</div>
                      {getProgressBar(task)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(task.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(task.startTime || task.timestamp)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(task.endTime)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      {/* TODO: we still do not have stop capabilities */}
                      {false && task.status === 'running' && (
                        <a href="#" className="text-yellow-600 hover:text-yellow-900 mr-4">Stop</a>
                      )}
                      <button 
                        onClick={() => handleArchive(task.taskId)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ActiveTasks;
