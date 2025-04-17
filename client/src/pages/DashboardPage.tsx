import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatInterface from '../components/common/ChatInterface';
import NanomachineCanvas from '../components/dashboard/NanomachineCanvas';
import TaskLog, { Task } from '../components/dashboard/TaskLog';
import SystemStatus from '../components/dashboard/SystemStatus';
import DashboardFooter from '../components/dashboard/DashboardFooter';
import ChatList from '../components/chat/ChatList';
import socketService from '../services/socketService';

// Initial empty state for tasks
const initialTasks: Task[] = [];

export default function DashboardPage() {
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(chatId || null);
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
  
  // Update selectedChatId when URL parameter changes
  useEffect(() => {
    if (chatId) {
      setSelectedChatId(chatId);
    }
  }, [chatId]);
  
  // Function to request task refresh via socket
  const handleRefreshTasks = () => {
    setIsLoading(true);
    socketService.refreshTasks();
  };

  return (
    <div className="flex flex-row h-[calc(100vh-52px)] w-full m-0 p-0">
      {/* Chat List - Left Column */}
      <div className="w-1/4 h-full">
        <div className="bg-gray-100 h-full overflow-y-auto">
          <ChatList 
            onChatSelect={(chatId) => {
              setSelectedChatId(chatId);
              navigate(`/session/${chatId}`, { replace: true });
            }}
            selectedChatId={selectedChatId}
          />
        </div>
      </div>
      
      {/* Chat Interface - Middle Column */}
      <div className="w-1/4 h-full inset-shadow-sm shadow-sm">
        <div className="bg-white h-full overflow-hidden">
          <ChatInterface 
            chatId={selectedChatId}
          />
        </div>
      </div>

      {/* Right Column - Contains NoVNC Canvas, Tasks and System Status */}
      <div className="w-1/2 h-full overflow-y-auto p-3">
        {/* Main Canvas Area */}
        <NanomachineCanvas />

        {/* Task Information */}
        <TaskLog 
          chatId={selectedChatId}
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
