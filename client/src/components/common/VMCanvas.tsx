import { useRef, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface VMCanvasProps {
  width?: number;
  height?: number;
}

export default function VMCanvas({ width = 800, height = 600 }: VMCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize canvas with a disconnected message
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VNC Disconnected', width / 2, height / 2);
      }
    }
  }, [width, height]);

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
          
          // Clear canvas with a background color to indicate connection
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, status.width, status.height);
            ctx.fillStyle = '#333';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Connected to VNC - Waiting for first frame...', status.width / 2, status.height / 2);
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
          // Create an ImageData object from the raw pixel data
          try {
            // For raw RGB/RGBA data
            const binary = atob(frame.data);
            const array = new Uint8ClampedArray(binary.length);
            
            // Process the pixel data - VNC uses BGR format, we need RGB
            for (let i = 0; i < binary.length; i += 4) {
              // Get BGR values
              const b = binary.charCodeAt(i);
              const g = binary.charCodeAt(i + 1);
              const r = binary.charCodeAt(i + 2);
              const a = binary.charCodeAt(i + 3);
              
              // Store as RGBA
              array[i] = r;     // Red
              array[i + 1] = g; // Green
              array[i + 2] = b; // Blue
              array[i + 3] = a !== undefined ? a : 255; // Alpha
            }
            
            // Create ImageData and put it on the canvas
            const imageData = new ImageData(array, frame.width, frame.height);
            ctx.putImageData(imageData, frame.x, frame.y);
          } catch (err) {
            console.error('Error processing VNC frame:', err);
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
    
    // Clear canvas and show disconnected message
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VNC Disconnected', width / 2, height / 2);
      }
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



  return (
    <div className="flex flex-col items-center">
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-4">
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={height}
          className="rounded border-2 border-gray-700"
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
