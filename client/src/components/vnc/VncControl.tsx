import React from 'react';
import { Socket } from 'socket.io-client';
import { useTooltip } from '../common/Tooltip';

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

interface VncControlProps {
  socket: Socket | null;
  isConnected: boolean;
  hasControl: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  displayDimensions?: { width: number; height: number };
  onTakeControl?: () => void;
  onReleaseControl: () => void;
  children?: React.ReactNode;
}

const VncControl: React.FC<VncControlProps> = ({
  socket,
  isConnected,
  hasControl,
  canvasRef,
  onTakeControl,
  onReleaseControl,
  children
}) => {
  // Initialize tooltip system
  const { showTooltip, hideTooltip, renderTooltip } = useTooltip();
  
  // Mouse event handlers using relative positioning
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!isConnected || !socket || !hasControl || !canvasRef.current) return;
    
    // Calculate relative position (0-1)
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;
    
    // Send relative position to server
    socket.emit('mouse-move', { relativeX, relativeY });
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (!isConnected || !socket || !hasControl || !canvasRef.current) return;
    e.preventDefault(); // Prevent default behavior like text selection
    
    // Calculate relative position (0-1)
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;
    
    // Map mouse buttons to VNC button mask
    let buttonMask = 0;
    if (e.button === 0) buttonMask = 1;      // Left button
    else if (e.button === 1) buttonMask = 2; // Middle button
    else if (e.button === 2) buttonMask = 4; // Right button
    
    // Send mouse down event with relative position
    socket.emit('mouse-button', { 
      relativeX, 
      relativeY, 
      buttonMask,
      isDown: true
    });
  };
  
  const handleMouseUp = (e: React.MouseEvent<HTMLElement>) => {
    if (!isConnected || !socket || !hasControl || !canvasRef.current) return;
    e.preventDefault();
    
    // Calculate relative position (0-1)
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;
    
    // Map mouse buttons to VNC button mask
    let buttonMask = 0;
    if (e.button === 0) buttonMask = 1;      // Left button
    else if (e.button === 1) buttonMask = 2; // Middle button
    else if (e.button === 2) buttonMask = 4; // Right button
    
    // Send mouse up event with relative position
    socket.emit('mouse-button', { 
      relativeX, 
      relativeY, 
      buttonMask,
      isDown: false
    });
  };
  
  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isConnected || !socket || !hasControl) return;
    
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
      socket.emit('key-event', {
        keysym,
        isDown: true
      });
    } else {
      console.log(`Unmapped key: ${e.key}`);
    }
  };
  
  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isConnected || !socket || !hasControl) return;
    
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
      socket.emit('key-event', {
        keysym,
        isDown: false
      });
    }
  };

  return (
    <div 
      className={`relative vnc-container ${hasControl ? 'has-control' : ''}`}
      style={{ outline: 'none' }}
      tabIndex={hasControl ? 0 : -1} // Only focusable when in control
      onKeyDown={hasControl ? handleKeyDown : undefined}
      onKeyUp={hasControl ? handleKeyUp : undefined}
    >
      {/* Render tooltips */}
      {renderTooltip()}
      {/* Take Control button overlay - only visible on hover */}
      {isConnected && !hasControl && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-20 bg-black/5 hover:bg-black/25 group transition-all duration-200"
        >
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling
              
              if (socket && onTakeControl) {
                socket.emit('take-control');
                
                // Listen for control granted response
                socket.once('control-granted', (granted: boolean) => {
                  if (granted) {
                    onTakeControl();
                    
                    // Focus the container after a short delay to ensure it's ready
                    setTimeout(() => {
                      const container = document.querySelector('.vnc-container');
                      if (container instanceof HTMLElement) container.focus();
                    }, 50);
                  }
                });
              }
            }}
            className="cursor-pointer bg-blue-500/90 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 opacity-0 group-hover:opacity-100"
          >
            Take Control
          </button>
        </div>
      )}
      
      {/* Canvas is now a direct child */}
      <div 
        className="w-full h-full"
        onMouseMove={hasControl ? handleMouseMove : undefined}
        onMouseDown={hasControl ? handleMouseDown : undefined}
        onMouseUp={hasControl ? handleMouseUp : undefined}
      >
        {children}
      </div>
    </div>
  );
};

export default VncControl;
