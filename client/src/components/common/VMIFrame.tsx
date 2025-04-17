import React, { useEffect, useState } from 'react';
import { useTooltip } from './Tooltip';
import socketService from '../../services/socketService';

const KASM_VNC_URL = import.meta.env.VITE_VNC_URL || "http://localhost:3201/vnc/index.html?autoconnect=1&resize=remote&enable_perf_stats=0";

const VMIFrame: React.FC = () => {
  // State for iframe visibility and control
  const [isConnected, setIsConnected] = useState(false);
  const [hasControl, setHasControl] = useState(false);
  
  // Initialize tooltip system (same as VMCanvas)
  const { showTooltip, hideTooltip, renderTooltip } = useTooltip();
  
  // Connect handler - show iframe
  const handleConnect = () => {
    setIsConnected(true);
  };
  
  // Disconnect handler - hide iframe
  const handleDisconnect = () => {
    setIsConnected(false);
    setHasControl(false);
  };

  const [iframeUrl, setIframeUrl] = useState('');
  useEffect(() => {
    setIframeUrl(hasControl ? KASM_VNC_URL : `${KASM_VNC_URL}&view_only=1&resize=scale`);
  }, [hasControl]);

  // Listen for task:created event and auto-connect
  useEffect(() => {
    // Subscribe to task:created events
    const unsubscribe = socketService.onTaskCreated(() => {
      // Auto-connect when a task is created
      if (!isConnected) {
        console.log('Task created, auto-connecting to VM');
        handleConnect();
      }
    });
    
    // Cleanup subscription on component unmount
    return () => {
      unsubscribe();
    };
  }, [isConnected]);

  // No need for state to handle hover effect with Tailwind
  
  return (
    <div className="flex flex-col w-full h-full">
      {/* Render tooltips */}
      {renderTooltip()}
      
      {/* VMware-style control bar - more compact than VMCanvas */}
      <div className="flex space-x-2 bg-gray-800 text-white items-center px-2 py-0.5 rounded-t-md relative">
        {/* Status indicator with tooltip */}
        <div 
          className="flex items-center ml-1"
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            showTooltip(
              isConnected ? (hasControl ? "Control Active" : "Connected") : "Disconnected",
              rect,
              'bottom',
              8
            );
          }}
          onMouseLeave={hideTooltip}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? (hasControl ? 'bg-green-500' : 'bg-blue-500') : 'bg-red-500'}`}></span>
        </div>
        <div className="flex-1 text-xs font-medium">Nanomachine</div>
        <div className="flex space-x-1">
          {/* Connect/Disconnect Toggle with tooltip */}
          <div>
            <button
              onClick={isConnected ? handleDisconnect : handleConnect}
              disabled={false}
              className="p-1 rounded transition-colors hover:bg-gray-700"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                showTooltip(
                  isConnected ? "Disconnect" : "Connect",
                  rect,
                  'bottom',
                  8
                );
              }}
              onMouseLeave={hideTooltip}
            >
              {/* Different icons for connect and disconnect - same as VMCanvas */}
              {isConnected ? (
                /* Disconnect icon - plug being unplugged */
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
              ) : (
                /* Connect icon - power symbol */
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v6a1 1 0 11-2 0V3a1 1 0 011-1z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Control Toggle with tooltip - only when connected */}
          {isConnected && (
            <div>
              <button
                onClick={hasControl ? () => setHasControl(false) : () => setHasControl(true)}
                className={`p-1 rounded transition-colors ${hasControl ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-gray-700'}`}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  showTooltip(
                    hasControl ? "Release Control" : "Take Control",
                    rect,
                    'bottom',
                    8
                  );
                }}
                onMouseLeave={hideTooltip}
              >
                {/* Mouse cursor icon - clearly indicates control */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
      

      
      {/* IFrame and Control Overlay */}
      <div className="relative bg-white flex-grow">
        {/* Only render iframe when connected */}
        {isConnected && (
          <iframe 
            src={iframeUrl} 
            width="100%" 
            height="100%" 
            title="VNC Canvas"
            style={{ border: 'none' }}
          />
        )}
        
        {/* Control overlay - shown when connected but not in control */}
        {isConnected && !hasControl && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10 bg-black/5 hover:bg-black/25 group transition-all duration-200"
          >
            <button 
              onClick={() => setHasControl(true)}
              className="cursor-pointer bg-blue-500/90 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 opacity-0 group-hover:opacity-100"
            >
              Take Control
            </button>
          </div>
        )}
        

        
        {/* Placeholder when disconnected */}
        {!isConnected && (
          <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-100 flex-col">
            <button
              onClick={handleConnect}
              className="ml-2 cursor-pointer bg-blue-500/90 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              Connect
            </button>
          </div>
        )}
      </div>
      
      {/* Status text - small and unobtrusive - exactly like VMCanvas */}
      {isConnected && (
        <div className={`text-xs py-1 text-center ${hasControl ? 'bg-green-600 text-white' : 'bg-gray-500 text-gray-100'}`}>
          <span>{hasControl ? 'Control active' : 'Click control icon to interact'}</span>
        </div>
      )}

      {!isConnected && (
        <div className="text-xs py-1 text-center bg-gray-700 text-gray-300">
          <span>Not connected</span>
        </div>
      )}
    </div>
  );
};

export default VMIFrame;
