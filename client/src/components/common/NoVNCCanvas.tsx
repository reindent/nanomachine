import { useRef, useEffect, useState } from 'react';

interface NoVNCCanvasProps {
  width?: number;
  height?: number;
}

export default function NoVNCCanvas({ width = 800, height = 600 }: NoVNCCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock function to simulate connection
  const handleConnect = () => {
    setIsLoading(true);
    // Simulate connection delay
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          drawMockInterface(ctx);
        }
      }
    }, 1500);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('NoVNC Disconnected', width / 2, height / 2);
      }
    }
  };

  // Draw a mock interface on the canvas
  const drawMockInterface = (ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);
    
    // Draw mock browser window
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(50, 50, width - 100, height - 100);
    
    // Draw browser header
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(50, 50, width - 100, 40);
    
    // Draw browser controls
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(70, 70, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(95, 70, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(120, 70, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw address bar
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(150, 60, width - 250, 20);
    
    // Draw mock content
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(70, 110, width - 140, 40);
    
    // Draw mock text
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Nanobrowser Remote Session', width / 2, 135);
    
    // Draw mock content blocks
    const colors = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(70 + (i * (width - 140) / 4), 170, (width - 140) / 4 - 10, 100);
    }
    
    // Draw mock sidebar
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(70, 290, 150, height - 340);
    
    // Draw mock main content
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(230, 290, width - 300, height - 340);
    
    // Draw mock text in main content
    ctx.fillStyle = '#1f2937';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    for (let i = 0; i < 8; i++) {
      ctx.fillText(`Mock content line ${i + 1}`, 250, 320 + i * 25);
    }
    
    // Draw status indicator
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(width - 70, height - 70, 10, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('Connected', width - 90, height - 65);
  };

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        // Initial canvas state
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('NoVNC Disconnected', width / 2, height / 2);
      }
    }
  }, [width, height]);

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
