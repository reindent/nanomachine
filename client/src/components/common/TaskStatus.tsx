interface TaskStatusProps {
  taskId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  timestamp?: string;
}

export default function TaskStatus({
  taskId,
  status,
  progress = 0,
  message = '',
  timestamp = new Date().toISOString(),
}: TaskStatusProps) {
  const statusColors = {
    idle: 'bg-gray-200',
    running: 'bg-blue-200',
    completed: 'bg-green-200',
    failed: 'bg-red-200',
  };

  const statusTextColors = {
    idle: 'text-gray-800',
    running: 'text-blue-800',
    completed: 'text-green-800',
    failed: 'text-red-800',
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
      
      <p className="text-sm text-gray-700">{message}</p>
      
      <div className="flex justify-end mt-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusTextColors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
    </div>
  );
}
