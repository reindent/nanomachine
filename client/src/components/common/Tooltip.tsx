import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
  offset?: number;
}

// Global tooltip manager to handle tooltip state
export const TooltipManager = {
  tooltipRoot: null as HTMLDivElement | null,
  
  initialize() {
    if (!this.tooltipRoot && typeof document !== 'undefined') {
      this.tooltipRoot = document.createElement('div');
      this.tooltipRoot.id = 'tooltip-root';
      this.tooltipRoot.style.position = 'fixed';
      this.tooltipRoot.style.top = '0';
      this.tooltipRoot.style.left = '0';
      this.tooltipRoot.style.width = '0';
      this.tooltipRoot.style.height = '0';
      this.tooltipRoot.style.overflow = 'visible';
      this.tooltipRoot.style.pointerEvents = 'none';
      this.tooltipRoot.style.zIndex = '9999';
      document.body.appendChild(this.tooltipRoot);
    }
    return this.tooltipRoot;
  },
  
  getRoot() {
    return this.tooltipRoot || this.initialize();
  }
};

// Tooltip content component that gets rendered in the portal
const TooltipContent: React.FC<{
  content: React.ReactNode;
  position: { top: number; left: number };
  tooltipPosition: 'top' | 'right' | 'bottom' | 'left';
}> = ({ content, position, tooltipPosition }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [finalPosition, setFinalPosition] = useState(position);
  
  // Adjust position after render to prevent overflow
  useEffect(() => {
    if (tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let adjustedPosition = { ...position };
      
      // Prevent horizontal overflow
      if (position.left + tooltipRect.width > viewportWidth) {
        adjustedPosition.left = viewportWidth - tooltipRect.width - 10;
      }
      
      // Prevent vertical overflow
      if (position.top + tooltipRect.height > viewportHeight) {
        adjustedPosition.top = viewportHeight - tooltipRect.height - 10;
      }
      
      setFinalPosition(adjustedPosition);
    }
  }, [position]);
  
  // Calculate transform origin based on tooltip position
  const getTransformOrigin = () => {
    switch (tooltipPosition) {
      case 'top': return 'bottom center';
      case 'right': return 'left center';
      case 'bottom': return 'top center';
      case 'left': return 'right center';
      default: return 'center center';
    }
  };
  
  return (
    <div
      ref={tooltipRef}
      className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-md"
      style={{
        position: 'absolute',
        top: `${finalPosition.top}px`,
        left: `${finalPosition.left}px`,
        opacity: 1,
        transformOrigin: getTransformOrigin(),
        animation: 'tooltip-fade-in 150ms ease-out forwards',
        zIndex: 9999,
        pointerEvents: 'none'
      }}
    >
      {content}
    </div>
  );
};

// Hook to manage tooltip state and positioning
export const useTooltip = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [content, setContent] = useState<React.ReactNode>(null);
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'right' | 'bottom' | 'left'>('top');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const showTooltip = (
    newContent: React.ReactNode,
    targetRect: DOMRect,
    pos: 'top' | 'right' | 'bottom' | 'left' = 'top',
    offset: number = 8,
    delay: number = 0
  ) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setContent(newContent);
    setTooltipPosition(pos);
    
    // Calculate position based on target element and desired tooltip position
    let tooltipPos = { top: 0, left: 0 };
    
    switch (pos) {
      case 'top':
        tooltipPos = {
          top: targetRect.top - offset,
          left: targetRect.left + targetRect.width / 2
        };
        break;
      case 'right':
        tooltipPos = {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + offset
        };
        break;
      case 'bottom':
        tooltipPos = {
          top: targetRect.bottom + offset,
          left: targetRect.left + targetRect.width / 2
        };
        break;
      case 'left':
        tooltipPos = {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left - offset
        };
        break;
    }
    
    setPosition(tooltipPos);
    
    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, delay);
    } else {
      setIsVisible(true);
    }
  };
  
  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };
  
  // Render tooltip through portal if visible
  const renderTooltip = () => {
    if (!isVisible || !content) return null;
    
    const tooltipRoot = TooltipManager.getRoot();
    if (!tooltipRoot) return null;
    
    return ReactDOM.createPortal(
      <TooltipContent
        content={content}
        position={position}
        tooltipPosition={tooltipPosition}
      />,
      tooltipRoot
    );
  };
  
  return {
    showTooltip,
    hideTooltip,
    renderTooltip
  };
};

// Tooltip component that wraps a trigger element
const Tooltip: React.FC<React.PropsWithChildren<TooltipProps>> = ({
  children,
  content,
  position = 'top',
  delay = 0,
  offset = 8
}) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const { showTooltip, hideTooltip, renderTooltip } = useTooltip();
  
  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      showTooltip(content, rect, position, offset, delay);
    }
  };
  
  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={hideTooltip}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>
      {renderTooltip()}
    </>
  );
};

export default Tooltip;
