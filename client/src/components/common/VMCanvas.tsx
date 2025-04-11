import { useRef, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { processVncFrame, handleCopyRect } from '../vnc/pixelUtils';
import VncControl from '../vnc/VncControl';
import Tooltip, { useTooltip } from './Tooltip';

interface VMCanvasProps {
  width?: number;
  height?: number;
  maxWidth?: number; // Maximum width to scale to
}

export default function VMCanvas({ width = 800, height = 600, maxWidth }: VMCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize tooltip system
  const { showTooltip, hideTooltip, renderTooltip } = useTooltip();
  
  // Track VNC server dimensions for relative mouse positioning
  const vncDimensionsRef = useRef({ width: 800, height: 600 });
  
  // Track display dimensions (scaled) - used for canvas scaling
  const [displayDimensions, setDisplayDimensions] = useState({ width, height });
  
  // Reference to the container div for measuring available space
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Reference to the full frame canvas (stores the complete screen)
  const fullFrameCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize canvas with a disconnected message
  useEffect(() => {
    // Update display dimensions based on initial size
    updateDisplayDimensions(width, height);
    
    // Create the full frame canvas for storing the complete screen
    fullFrameCanvasRef.current = document.createElement('canvas');
    fullFrameCanvasRef.current.width = width;
    fullFrameCanvasRef.current.height = height;
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.fillStyle = '#000000'; // Black background
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Nanomachine Disconnected', canvasRef.current.width / 2, canvasRef.current.height / 2);
      }
    }
  }, [width, height, maxWidth]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (vncDimensionsRef.current) {
        updateDisplayDimensions(vncDimensionsRef.current.width, vncDimensionsRef.current.height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Connect to VNC server
  const handleConnect = () => {
    setIsLoading(true);
    setError(null);
    
    // Create Socket.IO connection to VNC namespace
    console.log('Connecting to VNC server...');
    const socket = io('http://' + window.location.hostname + ':3100/vnc', {
      transports: ['websocket', 'polling']
    });
    console.log('Socket created:', socket);
    socketRef.current = socket;
    
    // Handle connection status
    socket.on('connect', () => {
      console.log('Socket connected!');
    });
    
    // Listen for control status updates
    socket.on('control-status', (status: { hasControl: boolean, clientId: string | null }) => {
      console.log('Received control status update:', status);
      // If control was released by another client (like on disconnect)
      if (!status.hasControl && hasControl) {
        setHasControl(false);
      }
    });
    
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('Connection error: ' + err.message);
      setIsLoading(false);
    });
    
    socket.on('vnc-status', (status) => {
      console.log('Received VNC status:', status);
      if (status.connected) {
        setIsConnected(true);
        setIsLoading(false);
        setError(null); // Clear any previous errors
        
        // Resize canvas if needed
        if (status.width && status.height && canvasRef.current) {
          console.log(`Setting canvas size to ${status.width}x${status.height}`);
          canvasRef.current.width = status.width;
          canvasRef.current.height = status.height;
          
          // Store VNC dimensions for relative mouse positioning
          vncDimensionsRef.current = {
            width: status.width,
            height: status.height
          };
          
          // Calculate scaled dimensions to fit available space
          updateDisplayDimensions(status.width, status.height);
          
          // Clear canvas with a background color to indicate connection
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.fillStyle = '#333';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Connected to VNC - Waiting for first frame...', canvasRef.current.width / 2, canvasRef.current.height / 2);
          }
        }
      } else {
        setIsConnected(false);
        setIsLoading(false);
        if (status.error) {
          setError(status.error);
        }
      }
    });
    
    // Handle frame updates
    socket.on('vnc-frame', (frame) => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          try {
            // Process the pixel data using our utility function
            const array = processVncFrame(frame);
            
            // Create the image data from the array
            const imageData = new ImageData(array, frame.width, frame.height);
            
            // If this is a full frame update, update our canvas dimensions
            if (frame.x === 0 && frame.y === 0 && frame.width > 100 && frame.height > 100) {
              // Update display dimensions based on the frame size
              updateDisplayDimensions(frame.width, frame.height);
              
              // Resize the full frame canvas to match the VNC screen size
              if (fullFrameCanvasRef.current) {
                fullFrameCanvasRef.current.width = frame.width;
                fullFrameCanvasRef.current.height = frame.height;
              }
            }
            
            // Update the full frame canvas with this frame data
            if (fullFrameCanvasRef.current) {
              const fullCtx = fullFrameCanvasRef.current.getContext('2d');
              if (fullCtx) {
                // Draw this frame update to the full frame canvas
                fullCtx.putImageData(imageData, frame.x, frame.y);
                
                // Fill the main display canvas with white background first
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                
                // Draw the full frame canvas to the display canvas with proper scaling
                ctx.drawImage(
                  fullFrameCanvasRef.current,
                  0, 0, fullFrameCanvasRef.current.width, fullFrameCanvasRef.current.height,  // Source rectangle
                  0, 0, canvasRef.current.width, canvasRef.current.height  // Destination rectangle (scaled)
                );
              }
            }
          } catch (err) {
            console.error('Error processing VNC frame:', err);
          }
        }
      }
    });
    
    // Handle CopyRect encoding
    socket.on('vnc-copyrect', (rect) => {
      console.log('Received CopyRect:', rect);
      if (canvasRef.current) {
        handleCopyRect(rect, canvasRef.current);
      }
    });
    
    // Request connection to VNC server
    socket.emit('connect-vnc');
  };

  // Disconnect from VNC server
  const handleDisconnect = () => {
    if (socketRef.current) {
      socketRef.current.emit('disconnect-vnc');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setIsConnected(false);
    
    // Reset the full frame canvas
    if (fullFrameCanvasRef.current) {
      const fullCtx = fullFrameCanvasRef.current.getContext('2d');
      if (fullCtx) {
        fullCtx.clearRect(0, 0, fullFrameCanvasRef.current.width, fullFrameCanvasRef.current.height);
      }
    }
    
    // Clear canvas and show disconnected message
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = '#333333';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Nanomachine Disconnected', canvasRef.current.width / 2, canvasRef.current.height / 2);
      }
    }
  };


  // Calculate display dimensions based on available space
  const updateDisplayDimensions = (sourceWidth: number, sourceHeight: number) => {
    // Get the container width - use parent container width to maximize space usage
    let containerWidth = 0;
    if (containerRef.current) {
      // Get the parent container width (minus padding)
      const parentWidth = containerRef.current.parentElement?.clientWidth || 0;
      containerWidth = parentWidth - 32; // Account for padding (16px on each side)
    } else {
      containerWidth = maxWidth || width || 800;
    }
    
    // Calculate height while maintaining aspect ratio
    const aspectRatio = sourceHeight / sourceWidth;
    const scaledWidth = Math.min(containerWidth, 1200); // Cap at reasonable max width
    const scaledHeight = Math.round(scaledWidth * aspectRatio);
    
    console.log(`Scaling display: ${sourceWidth}x${sourceHeight} -> ${scaledWidth}x${scaledHeight} (container: ${containerWidth})`);
    
    // Store original dimensions in the VNC dimensions ref for mouse positioning
    vncDimensionsRef.current = {
      width: sourceWidth,
      height: sourceHeight
    };
    
    // Update canvas dimensions
    if (canvasRef.current) {
      canvasRef.current.width = scaledWidth;
      canvasRef.current.height = scaledHeight;
    }
    
    // Update state with the scaled dimensions
    setDisplayDimensions({ width: scaledWidth, height: scaledHeight });
  };
  
  // Track control state
  const [hasControl, setHasControl] = useState(false);
  
  // Clean up socket connection when component unmounts
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="flex flex-col w-full" ref={containerRef}>
      {/* Render tooltips */}
      {renderTooltip()}
      {/* VMware-style control bar */}
      <div className="flex-1 space-x-2 bg-gray-800 text-white flex items-center px-2 py-1 rounded-t-md relative">
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
              disabled={isLoading}
              className={`p-1 rounded transition-colors ${isLoading ? 'opacity-50 cursor-wait' : 'hover:bg-gray-700'}`}
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
              {/* Different icons for connect and disconnect */}
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
          
          {/* Control Toggle with tooltip */}
          {isConnected && (
            <div>
              <button
                onClick={() => {
                  if (hasControl) {
                    // Release control
                    if (socketRef.current) {
                      socketRef.current.emit('release-control');
                      setHasControl(false);
                    }
                  } else {
                    // Take control
                    if (socketRef.current) {
                      console.log('VMCanvas: Emitting take-control event');
                      socketRef.current.emit('take-control');
                      socketRef.current.once('control-granted', (granted: boolean) => {
                        console.log('VMCanvas: Received control-granted response:', granted);
                        if (granted) {
                          console.log('VMCanvas: Setting hasControl to true');
                          setHasControl(true);
                          setTimeout(() => {
                            const container = document.querySelector('.vnc-container');
                            if (container instanceof HTMLElement) {
                              container.focus();
                            }
                          }, 50);
                        }
                      });
                    }
                  }
                }}
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
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 text-xs p-1">
          {error}
        </div>
      )}
      
      {/* VNC Control and Canvas */}
      <div className="relative">
        <VncControl
          socket={socketRef.current}
          isConnected={isConnected}
          hasControl={hasControl}
          canvasRef={canvasRef}
          displayDimensions={displayDimensions}
          onTakeControl={() => {
            console.log('VMCanvas: onTakeControl called from VncControl');
            setHasControl(true);
          }}
          onReleaseControl={() => setHasControl(false)}
        >
          <canvas 
            ref={canvasRef} 
            width={displayDimensions.width} 
            height={displayDimensions.height} 
            className="vnc-canvas w-full h-auto"
            onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
          />
        </VncControl>
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-black bg-white/90 p-2 rounded-md shadow-md text-sm font-medium">
              Connecting...
            </div>
          </div>
        )}
      </div>
      
      {/* Status text - small and unobtrusive */}
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
}
