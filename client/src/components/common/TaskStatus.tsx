interface TaskStatusProps {
  taskId: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled' | 'pending';
  progress?: number;
  message?: string;
  timestamp?: string;
  prompt?: string;
  result?: any;
  error?: string;
  onArchive?: (taskId: string) => void;
}

export default function TaskStatus({
  taskId,
  status,
  progress = 0,
  message = '',
  timestamp = new Date().toISOString(),
  prompt = '',
  result = null,
  error = '',
  onArchive,
}: TaskStatusProps) {
  const statusColors = {
    idle: 'bg-gray-200',
    running: 'bg-blue-200',
    completed: 'bg-green-200',
    failed: 'bg-red-200',
    cancelled: 'bg-yellow-200',
    pending: 'bg-purple-200',
  };

  const statusTextColors = {
    idle: 'text-gray-800',
    running: 'text-blue-800',
    completed: 'text-green-800',
    failed: 'text-red-800',
    cancelled: 'text-yellow-800',
    pending: 'text-purple-800',
  };

  return (
    <div className={`p-4 rounded-lg ${statusColors[status]} mb-2`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className={`font-medium ${statusTextColors[status]}`}>
          Task: {taskId}
        </h3>
        <span className="text-xs text-gray-600">
          {new Date(timestamp).toLocaleString()}
        </span>
      </div>
      
      {status === 'running' && (
        <div className="w-full bg-gray-300 rounded-full h-2.5 mb-2">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      
      {/* Display prompt */}
      {prompt && (
        <div className="mb-2">
          <p className="text-xs text-gray-500 font-medium">Prompt:</p>
          <p className="text-sm text-gray-700 bg-white bg-opacity-50 p-2 rounded">{prompt}</p>
        </div>
      )}
      
      {/* Display message or error */}
      {(message || error) && (
        <div className="mb-2">
          <p className="text-xs text-gray-500 font-medium">{error ? 'Error:' : 'Message:'}</p>
          <p className="text-sm text-gray-700">{error || message}</p>
        </div>
      )}
      
      {/* Display result if available */}
      {result && status === 'completed' && (
        <div className="mb-2">
          <p className="text-xs text-gray-500 font-medium">Result:</p>
          <p className="text-sm text-gray-700 bg-white bg-opacity-50 p-2 rounded">
            {typeof result === 'object' ? JSON.stringify(result, null, 2) : result.toString()}
          </p>
        </div>
      )}
      
      <div className="flex justify-between items-center mt-2">
        <div>
          {onArchive && (
            <button 
              onClick={() => onArchive(taskId)}
              className="text-xs text-gray-600 hover:text-gray-800 bg-white bg-opacity-50 px-2 py-1 rounded"
            >
              Archive
            </button>
          )}
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusTextColors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
    </div>
  );
}
