import { useState } from 'react';
import ChatInterface from '../components/common/ChatInterface';
import NanomachineCanvas from '../components/dashboard/NanomachineCanvas';
import ActiveTasks, { Task } from '../components/dashboard/ActiveTasks';
import SystemStatus from '../components/dashboard/SystemStatus';
import DashboardFooter from '../components/dashboard/DashboardFooter';

// Mock task data
const mockTasks: Task[] = [
  {
    id: 'task-001',
    status: 'completed' as const,
    message: 'Successfully completed website navigation task',
    timestamp: '2025-04-11T08:30:00Z',
  },
  {
    id: 'task-002',
    status: 'running' as const,
    progress: 65,
    message: 'Processing data extraction from target website',
    timestamp: '2025-04-11T09:15:00Z',
  },
  {
    id: 'task-003',
    status: 'idle' as const,
    message: 'Waiting for execution',
    timestamp: '2025-04-11T09:10:00Z',
  },
];

export default function DashboardPage() {
  const [tasks, setTasks] = useState(mockTasks);
  const [isLoading, setIsLoading] = useState(false);

  // Mock function to simulate refreshing tasks
  const handleRefreshTasks = () => {
    setIsLoading(true);
    setTimeout(() => {
      // Update a random task to show some change
      const updatedTasks = [...tasks];
      const randomIndex = Math.floor(Math.random() * tasks.length);
      
      if (updatedTasks[randomIndex].status === 'running') {
        const currentProgress = updatedTasks[randomIndex].progress || 0;
        const newProgress = Math.min(currentProgress + 15, 100);
        
        if (newProgress === 100) {
          updatedTasks[randomIndex] = {
            ...updatedTasks[randomIndex],
            message: 'Task completed successfully',
            status: 'completed' as const,
            // Remove progress for completed tasks
            progress: undefined
          };
        } else {
          updatedTasks[randomIndex] = {
            ...updatedTasks[randomIndex],
            progress: newProgress,
            message: `Processing data extraction (${newProgress}% complete)`,
          };
        }
      }
      
      setTasks(updatedTasks);
      setIsLoading(false);
    }, 1000);
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
        <NanomachineCanvas width={700} height={500} />

        {/* Task Information */}
        <ActiveTasks 
          tasks={tasks}
          isLoading={isLoading}
          onRefresh={handleRefreshTasks}
        />

        {/* System Status */}
        <SystemStatus 
          websocketStatus="connected"
          nanomachineClientVersion="0.1.4"
          nanobrowserVersion="1.2.0"
          serverStatus="online"
          activeSessions={1}
        />
        
        {/* Footer */}
        <DashboardFooter />
      </div>
    </div>
  );
}
