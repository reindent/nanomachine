import React, { useRef, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { processVncFrame, handleCopyRect } from '../vnc/pixelUtils';

// VNC keysym mappings for common keys
// Based on X11 keysyms used by the RFB protocol
const KEYSYMS: Record<string, number> = {
  // Control keys
  'Backspace': 0xff08,
  'Tab': 0xff09,
  'Enter': 0xff0d,
  'Escape': 0xff1b,
  'Home': 0xff50,
  'End': 0xff57,
  'PageUp': 0xff55,
  'PageDown': 0xff56,
  'ArrowLeft': 0xff51,
  'ArrowUp': 0xff52,
  'ArrowRight': 0xff53,
  'ArrowDown': 0xff54,
  'Insert': 0xff63,
  'Delete': 0xffff,
  'F1': 0xffbe,
  'F2': 0xffbf,
  'F3': 0xffc0,
  'F4': 0xffc1,
  'F5': 0xffc2,
  'F6': 0xffc3,
  'F7': 0xffc4,
  'F8': 0xffc5,
  'F9': 0xffc6,
  'F10': 0xffc7,
  'F11': 0xffc8,
  'F12': 0xffc9,
  'Shift': 0xffe1,
  'Control': 0xffe3,
  'Alt': 0xffe9,
  'Meta': 0xffeb,
  'CapsLock': 0xffe5,
  ' ': 0x0020,  // Space
};

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
  
  // Track VNC server dimensions for relative mouse positioning
  const vncDimensionsRef = useRef({ width: 800, height: 600 });
  
  // Track display dimensions (scaled)
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
        ctx.fillStyle = '#ffffff'; // White background
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = '#333333';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VNC Disconnected', canvasRef.current.width / 2, canvasRef.current.height / 2);
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
        ctx.fillText('VNC Disconnected', canvasRef.current.width / 2, canvasRef.current.height / 2);
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
  
  // Mouse event handlers using relative positioning
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isConnected || !socketRef.current || !canvasRef.current) return;
    
    // Calculate relative position (0-1)
    const canvas = canvasRef.current; // Store reference to avoid null checks
    const rect = canvas.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;
    
    // Debug mouse movement
    console.log(`Mouse move: ${relativeX.toFixed(3)}, ${relativeY.toFixed(3)}`);
    
    // Send relative position to server
    socketRef.current.emit('mouse-move', { relativeX, relativeY });
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isConnected || !socketRef.current || !canvasRef.current) return;
    e.preventDefault(); // Prevent default behavior like text selection
    
    // Calculate relative position (0-1)
    const canvas = canvasRef.current; // Store reference to avoid null checks
    const rect = canvas.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;
    
    // Map mouse buttons to VNC button mask
    // Left: 1, Middle: 2, Right: 4
    let buttonMask = 0;
    if (e.button === 0) buttonMask = 1;      // Left button
    else if (e.button === 1) buttonMask = 2; // Middle button
    else if (e.button === 2) buttonMask = 4; // Right button
    
    // Debug mouse button
    console.log(`Mouse down: ${relativeX.toFixed(3)}, ${relativeY.toFixed(3)}, button: ${e.button}, mask: ${buttonMask}`);
    
    // Send mouse down event with relative position
    socketRef.current.emit('mouse-button', { 
      relativeX, 
      relativeY, 
      buttonMask,
      isDown: true
    });
  };
  
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isConnected || !socketRef.current || !canvasRef.current) return;
    e.preventDefault();
    
    // Calculate relative position (0-1)
    const canvas = canvasRef.current; // Store reference to avoid null checks
    const rect = canvas.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;
    
    // Map mouse buttons to VNC button mask
    let buttonMask = 0;
    if (e.button === 0) buttonMask = 1;      // Left button
    else if (e.button === 1) buttonMask = 2; // Middle button
    else if (e.button === 2) buttonMask = 4; // Right button
    
    // Debug mouse button
    console.log(`Mouse up: ${relativeX.toFixed(3)}, ${relativeY.toFixed(3)}, button: ${e.button}, mask: ${buttonMask}`);
    
    // Send mouse up event with relative position
    socketRef.current.emit('mouse-button', { 
      relativeX, 
      relativeY, 
      buttonMask,
      isDown: false
    });
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isConnected || !socketRef.current) return;
    
    // Prevent default browser behavior for most keys
    if (e.key !== 'F5' && e.key !== 'F12') {
      e.preventDefault();
    }
    
    // Get the keysym for this key
    let keysym = KEYSYMS[e.key];
    
    // If it's a printable ASCII character, use the charCode
    if (!keysym && e.key.length === 1) {
      const charCode = e.key.charCodeAt(0);
      if (charCode >= 32 && charCode <= 126) {
        keysym = charCode;
      }
    }
    
    // If we have a valid keysym, send the key event
    if (keysym) {
      console.log(`Key down: ${e.key}, keysym: ${keysym}`);
      socketRef.current.emit('key-event', {
        keysym,
        isDown: true
      });
    } else {
      console.log(`Unmapped key: ${e.key}`);
    }
  };
  
  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isConnected || !socketRef.current) return;
    
    // Prevent default browser behavior for most keys
    if (e.key !== 'F5' && e.key !== 'F12') {
      e.preventDefault();
    }
    
    // Get the keysym for this key
    let keysym = KEYSYMS[e.key];
    
    // If it's a printable ASCII character, use the charCode
    if (!keysym && e.key.length === 1) {
      const charCode = e.key.charCodeAt(0);
      if (charCode >= 32 && charCode <= 126) {
        keysym = charCode;
      }
    }
    
    // If we have a valid keysym, send the key event
    if (keysym) {
      console.log(`Key up: ${e.key}, keysym: ${keysym}`);
      socketRef.current.emit('key-event', {
        keysym,
        isDown: false
      });
    }
  };
  
  // Clean up socket connection when component unmounts
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Track control state
  const [hasControl, setHasControl] = useState(false);

  return (
    <div className="flex flex-col items-center w-full" ref={containerRef}>
      <div 
        className={`p-4 rounded-lg shadow-lg mb-4 w-full relative vnc-container ${hasControl ? 'bg-gray-700' : 'bg-gray-800'} transition-colors duration-300`}
        style={{ overflow: 'hidden', outline: 'none' }}
        tabIndex={hasControl ? 0 : -1} // Only focusable when in control
        onKeyDown={hasControl ? handleKeyDown : undefined}
        onKeyUp={hasControl ? handleKeyUp : undefined}
      >
        <canvas 
          ref={canvasRef} 
          width={displayDimensions.width} 
          height={displayDimensions.height}
          className="rounded border-2 border-gray-700 mx-auto block"
          onMouseMove={hasControl ? handleMouseMove : undefined}
          onMouseDown={hasControl ? handleMouseDown : undefined}
          onMouseUp={hasControl ? handleMouseUp : undefined}
          onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
          style={{ maxWidth: '100%', display: 'block' }}
        />
        
        {/* Take Control button overlay - completely transparent except for the button */}
        {isConnected && !hasControl && (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
            <button 
              onClick={() => {
                setHasControl(true);
                // Focus the container after a short delay to ensure it's ready
                setTimeout(() => {
                  const container = document.querySelector('.vnc-container');
                  if (container instanceof HTMLElement) {
                    container.focus();
                  }
                }, 50);
              }}
              className="bg-blue-500 bg-opacity-80 hover:bg-opacity-100 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 pointer-events-auto"
            >
              Take Control
            </button>
          </div>
        )}
      </div>
      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}
      <div className="flex flex-col space-y-2">
        <div className="flex space-x-4 items-center">
          <button
            onClick={handleConnect}
            disabled={isConnected || isLoading}
            className={`px-4 py-2 rounded-md font-medium ${
              isConnected 
                ? 'bg-gray-400 cursor-not-allowed' 
                : isLoading 
                  ? 'bg-blue-300 cursor-wait' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
          <button
            onClick={handleDisconnect}
            disabled={!isConnected || isLoading}
            className={`px-4 py-2 rounded-md font-medium ${
              !isConnected 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            Disconnect
          </button>
          
          {/* Control buttons outside the video feed */}
          {isConnected && hasControl && (
            <>
              <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-md font-medium ml-2">
                Control Active
              </div>
              <button 
                onClick={() => setHasControl(false)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md shadow-md text-sm ml-auto"
              >
                Release Control
              </button>
            </>
          )}
        </div>
        {isConnected && (
          <div className="text-sm text-gray-500">
            {hasControl ? (
              <span className="text-green-500 font-medium">✓ You have control of the machine</span>
            ) : (
              <span>Click "Take Control" to interact with the machine</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
