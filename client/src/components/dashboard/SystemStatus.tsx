import React from 'react';

interface SystemStatusProps {
  websocketStatus: 'connected' | 'disconnected';
  nanomachineClientVersion: string;
  nanobrowserVersion: string;
  serverStatus: 'online' | 'offline';
  activeSessions: number;
}

const SystemStatus: React.FC<SystemStatusProps> = ({
  websocketStatus,
  nanomachineClientVersion,
  nanobrowserVersion,
  serverStatus,
  activeSessions
}) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm uppercase tracking-wider text-gray-500 font-medium">System Status</h2>
      </div>
      <div className="bg-white p-3">
        <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Server Status:</span>
          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${
            serverStatus === 'online' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {serverStatus === 'online' ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">WebSocket Connection:</span>
          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${
            websocketStatus === 'connected' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {websocketStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Nanomachine Client Version:</span>
          <span className="text-gray-800">{nanomachineClientVersion}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Nanobrowser Version:</span>
          <span className="text-gray-800">{nanobrowserVersion}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Active Sessions:</span>
          <span className="text-gray-800">{activeSessions}</span>
        </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;
