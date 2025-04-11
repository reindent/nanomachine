import React, { useRef, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = '#ffffff';
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
      console.log('Received frame update:', frame.x, frame.y, frame.width, frame.height, 'bpp:', frame.bpp);
      
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          try {
            // For raw RGB/RGBA data
            const binary = atob(frame.data);
            console.log('Decoded binary data length:', binary.length);
            
            // Create array for pixel data (always RGBA for browser)
            const array = new Uint8ClampedArray(frame.width * frame.height * 4);
            
            // Process the pixel data based on bits per pixel
            const bytesPerPixel = frame.bpp ? frame.bpp / 8 : 4;
            console.log('Bytes per pixel:', bytesPerPixel);
            
            if (bytesPerPixel === 4) {
              // 32-bit color (BGRA or similar)
              for (let i = 0, j = 0; i < binary.length && j < array.length; i += bytesPerPixel, j += 4) {
                // Get color values
                const b = binary.charCodeAt(i);
                const g = binary.charCodeAt(i + 1);
                const r = binary.charCodeAt(i + 2);
                const a = binary.charCodeAt(i + 3);
                
                // Store as RGBA
                array[j] = r;     // Red
                array[j + 1] = g; // Green
                array[j + 2] = b; // Blue
                array[j + 3] = a !== undefined ? a : 255; // Alpha
              }
            } else if (bytesPerPixel === 3) {
              // 24-bit color (BGR)
              for (let i = 0, j = 0; i < binary.length && j < array.length; i += bytesPerPixel, j += 4) {
                // Get color values
                const b = binary.charCodeAt(i);
                const g = binary.charCodeAt(i + 1);
                const r = binary.charCodeAt(i + 2);
                
                // Store as RGBA
                array[j] = r;     // Red
                array[j + 1] = g; // Green
                array[j + 2] = b; // Blue
                array[j + 3] = 255; // Alpha (opaque)
              }
            } else if (bytesPerPixel === 2) {
              // 16-bit color (typically 5-6-5 RGB)
              for (let i = 0, j = 0; i < binary.length && j < array.length; i += bytesPerPixel, j += 4) {
                // Get 16-bit pixel value (2 bytes)
                const pixelValue = (binary.charCodeAt(i) << 8) | binary.charCodeAt(i + 1);
                
                // Extract RGB components based on shifts if provided
                let r, g, b;
                if (frame.redShift !== undefined) {
                  // Use provided color shifts
                  r = ((pixelValue >> frame.redShift) & 0xFF);
                  g = ((pixelValue >> frame.greenShift) & 0xFF);
                  b = ((pixelValue >> frame.blueShift) & 0xFF);
                } else {
                  // Assume standard 5-6-5 format
                  r = ((pixelValue >> 11) & 0x1F) << 3; // 5 bits red
                  g = ((pixelValue >> 5) & 0x3F) << 2;  // 6 bits green
                  b = (pixelValue & 0x1F) << 3;         // 5 bits blue
                }
                
                // Store as RGBA
                array[j] = r;     // Red
                array[j + 1] = g; // Green
                array[j + 2] = b; // Blue
                array[j + 3] = 255; // Alpha (opaque)
              }
            } else {
              console.error('Unsupported bytes per pixel:', bytesPerPixel);
              return;
            }
            
            // Create ImageData and put it on the canvas
            try {
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
                  
                  // Clear the main display canvas
                  ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                  
                  // Draw the full frame canvas to the display canvas with proper scaling
                  ctx.drawImage(
                    fullFrameCanvasRef.current,
                    0, 0, fullFrameCanvasRef.current.width, fullFrameCanvasRef.current.height,  // Source rectangle
                    0, 0, canvasRef.current.width, canvasRef.current.height  // Destination rectangle (scaled)
                  );
                }
              }
              
              console.log('Frame rendered successfully');
            } catch (imgErr) {
              console.error('Error creating ImageData:', imgErr, 'width:', frame.width, 'height:', frame.height, 'data length:', array.length);
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
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          try {
            // Copy rectangle from source to destination
            const imageData = ctx.getImageData(rect.srcX, rect.srcY, rect.width, rect.height);
            ctx.putImageData(imageData, rect.x, rect.y);
            console.log('CopyRect rendered successfully');
          } catch (err) {
            console.error('Error processing CopyRect:', err);
          }
        }
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
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = '#ffffff';
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

  // Clean up socket connection when component unmounts
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center w-full" ref={containerRef}>
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-4 w-full" style={{ overflow: 'hidden' }}>
        <canvas 
          ref={canvasRef} 
          width={displayDimensions.width} 
          height={displayDimensions.height}
          className="rounded border-2 border-gray-700 mx-auto block"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
          style={{ maxWidth: '100%', display: 'block' }}
        />
      </div>
      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}
      <div className="flex space-x-4">
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
      </div>
    </div>
  );
}
