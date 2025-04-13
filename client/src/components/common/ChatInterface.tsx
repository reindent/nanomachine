import { useState, useRef, useEffect } from 'react';
import socketService, { ChatMessage as SocketChatMessage, AgentEvent } from '../../services/socketService';

// Define types for agent event display
interface AgentEventDisplay {
  id: string;
  taskId: string;
  actor: string;
  state: string;
  timestamp: number;
  details?: string;
  step?: number;
  maxSteps?: number;
}

// Use the same interface as the socket service but extend it
type Message = SocketChatMessage;

interface ChatInterfaceProps {
  height?: number; // Not used directly but kept for API consistency
}

export default function ChatInterface({}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-001',
      sender: 'agent',
      text: 'Hello! I am Nanomachine, your Virtual Machine AI agent. How can I assist you today?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [agentEvents, setAgentEvents] = useState<AgentEventDisplay[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Connect to socket service and listen for chat messages
  useEffect(() => {
    // Connect to socket
    socketService.connect();
    
    // Listen for connection status
    const connectionUnsubscribe = socketService.onConnectionStatus((connected) => {
      setIsConnected(connected);
    });
    
    // Listen for chat messages
    const chatUnsubscribe = socketService.onChatMessage((message) => {
      if (message.sender === 'agent') {
        setIsTyping(false);
      }
      setMessages(prevMessages => [...prevMessages, message]);
    });
    
    // Listen for agent events
    const agentEventUnsubscribe = socketService.onAgentEvent((event: AgentEvent) => {
      console.log('Agent event in ChatInterface:', event);
      console.log(`Event details - TaskID: ${event.taskId}, Actor: ${event.event.actor}, State: ${event.event.state}`);
      
      // Add the event to our events display list
      try {
        const newEvent: AgentEventDisplay = {
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          taskId: event.taskId,
          actor: event.event.actor,
          state: event.event.state,
          timestamp: event.event.timestamp,
          details: event.event.data?.details,
          step: event.event.data?.step,
          maxSteps: event.event.data?.maxSteps
        };
        
        console.log('Created new event display object:', newEvent);
        setAgentEvents(prev => {
          const updated = [...prev, newEvent];
          console.log(`Updated agent events array, now has ${updated.length} events`);
          return updated;
        });
        
        // For certain events, we might want to add a chat message too
        if (
          event.event.state === 'task.complete' || 
          event.event.state === 'task.error' || 
          event.event.state === 'task.start' ||
          (event.event.state === 'task.progress' && event.event.data?.details)
        ) {
          // These messages will come from the server, so we don't need to add them here
          // The server converts relevant agent events to chat messages
          console.log('This event type would generate a chat message on the server');
        }
      } catch (error) {
        console.error('Error processing agent event:', error);
      }
    });
    
    // Cleanup on unmount
    return () => {
      connectionUnsubscribe();
      chatUnsubscribe();
      agentEventUnsubscribe();
    };
  }, []);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Auto-scroll to bottom when agent events change
  useEffect(() => {
    if (showEvents && eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentEvents, showEvents]);

  const handleSendMessage = () => {
    if (inputText.trim() === '' || !isConnected) return;

    // Send message via socket
    socketService.sendChatMessage({
      text: inputText,
      sender: 'user'
    });
    
    // Clear input and show typing indicator
    setInputText('');
    setIsTyping(true);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format agent event timestamp
  const formatEventTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Control bar */}
      <div className="flex justify-between items-center px-2 py-1 bg-gray-100 border-b border-gray-200">
        <div className="text-xs font-medium text-gray-600">
          {isConnected ? 
            <span className="text-green-600">● Connected</span> : 
            <span className="text-red-600">● Disconnected</span>}
        </div>
        <button 
          onClick={() => setShowEvents(!showEvents)}
          className="text-xs text-gray-600 px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded"
        >
          {showEvents ? 'Hide Events' : 'Show Events'}
        </button>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-2 pb-12 flex flex-col">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex mb-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded px-2 py-1 ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.sender === 'system'
                    ? 'bg-yellow-100 border border-yellow-300 text-gray-800'
                    : 'bg-gray-200 text-gray-800'
              }`}
            >
              <div className="text-sm">{message.text}</div>
              <div className="text-xs mt-1 text-right opacity-70">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start mb-2">
            <div className="bg-gray-200 text-gray-800 rounded px-2 py-1">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Agent events display */}
        {showEvents && agentEvents.length > 0 && (
          <div className="my-2 p-2 bg-gray-50 rounded border border-gray-200 text-xs">
            <div className="font-medium text-gray-700 mb-1">Agent Events:</div>
            <div className="max-h-32 overflow-y-auto">
              {agentEvents.slice(-10).map((event) => (
                <div key={event.id} className="mb-1 pb-1 border-b border-gray-100 last:border-0">
                  <div className="flex justify-between">
                    <span className="font-medium">{event.actor}</span>
                    <span className="text-gray-500">{formatEventTime(event.timestamp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">{event.state}</span>
                    {event.step !== undefined && event.maxSteps !== undefined && (
                      <span className="text-gray-600">
                        Step {event.step}/{event.maxSteps}
                      </span>
                    )}
                  </div>
                  {event.details && (
                    <div className="text-gray-700 mt-0.5 italic">{event.details}</div>
                  )}
                </div>
              ))}
              {/* Reference for auto-scrolling */}
              <div ref={eventsEndRef} />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input container - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-1 bg-white">
        <form 
          className="flex w-full"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow border border-gray-300 rounded-l text-black text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={inputText.trim() === '' || isTyping || !isConnected}
            className={`px-2 py-1 rounded-r ${inputText.trim() === '' || isTyping || !isConnected ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
