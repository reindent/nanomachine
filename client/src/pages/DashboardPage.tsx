import { useState, useEffect } from 'react';
import ChatInterface from '../components/common/ChatInterface';
import NanomachineCanvas from '../components/dashboard/NanomachineCanvas';
import ActiveTasks, { Task } from '../components/dashboard/ActiveTasks';
import SystemStatus from '../components/dashboard/SystemStatus';
import DashboardFooter from '../components/dashboard/DashboardFooter';
import socketService from '../services/socketService';

// Initial empty state for tasks
const initialTasks: Task[] = [];

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<{
    websocketStatus: 'connected' | 'disconnected',
    nanomachineClientVersion: string,
    nanobrowserVersion: string,
    serverStatus: 'online' | 'offline',
    activeSessions: number
  }>({
    websocketStatus: 'disconnected',
    nanomachineClientVersion: '',
    nanobrowserVersion: '',
    serverStatus: 'offline',
    activeSessions: 0
  });

  // Connect to socket service when component mounts
  useEffect(() => {
    // Connect to the socket server
    socketService.connect();
    
    // Register event listeners
    const taskUnsubscribe = socketService.onTaskUpdate((updatedTasks) => {
      setTasks(updatedTasks);
      setIsLoading(false);
    });
    
    const statusUnsubscribe = socketService.onStatusUpdate((status) => {
      setSystemStatus(status);
    });
    
    // Cleanup on unmount
    return () => {
      taskUnsubscribe();
      statusUnsubscribe();
      socketService.disconnect();
    };
  }, []);
  
  // Function to request task refresh via socket
  const handleRefreshTasks = () => {
    setIsLoading(true);
    socketService.refreshTasks();
  };

  return (
    <div className="flex flex-row gap-4 h-[calc(100vh-52px)] w-full m-0 p-0">
      {/* Chat Interface - Left Column */}
      <div className="w-1/3 h-full">
        <div className="bg-white p-3 h-full overflow-hidden">
          <ChatInterface />
        </div>
      </div>

      {/* Right Column - Contains NoVNC Canvas, Tasks and System Status */}
      <div className="w-2/3 h-full overflow-y-auto p-3">
        {/* Main Canvas Area */}
        <NanomachineCanvas width={800} height={450} />

        {/* Task Information */}
        <ActiveTasks 
          tasks={tasks}
          isLoading={isLoading}
          onRefresh={handleRefreshTasks}
        />

        {/* System Status */}
        <SystemStatus 
          websocketStatus={systemStatus.websocketStatus}
          nanomachineClientVersion={systemStatus.nanomachineClientVersion}
          nanobrowserVersion={systemStatus.nanobrowserVersion}
          serverStatus={systemStatus.serverStatus}
          activeSessions={systemStatus.activeSessions}
        />
        
        {/* Footer */}
        <DashboardFooter />
      </div>
    </div>
  );
}
