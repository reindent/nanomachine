import { useState, useRef, useEffect } from 'react';
import socketService, { ChatMessage as SocketChatMessage, AgentEvent } from '../../services/socketService';
import { API_URL } from '../../config';

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
  chatId?: string | null; // ID of the chat to display
}

const fallbackChatMessage : Message = {
  id: '0',
  sender: 'agent',
  text: 'Hello! I am Nanomachine, your Virtual Machine AI agent. How can I assist you today?',
  timestamp: new Date().toISOString(),
};

export default function ChatInterface({ chatId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([ fallbackChatMessage ]);
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
      console.log('Received message in client:', message);

      // Always show the message if it's for the current chat
      if (chatId && message.chatId === chatId) {
        if (message.sender === 'agent' || message.sender === 'system') {
          setIsTyping(false);
        }
        
        setMessages(prevMessages => [...prevMessages, message]);
        console.log('Added message to UI');
      }
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
        
        // Stop typing indicator when task completes or errors
        if (['task.ok', 'task.fail'].includes(event.event.state)) {
          console.log(`Task ${event.event.state} received, stopping typing indicator`);
          setIsTyping(false);
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
  }, [chatId]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Load chat history when chatId changes
  useEffect(() => {
    if (chatId) {
      // Reset messages when changing chats
      setMessages([]);
      setAgentEvents([]);
      
      // Fetch chat history
      const fetchChatHistory = async () => {
        try {
          const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`);
          if (response.ok) {
            const data = await response.json();
            // Convert the API response to our Message format
            const chatMessages: Message[] = data.map((msg: any) => ({
              id: msg._id,
              chatId: msg.chatId,
              text: msg.content,
              sender: msg.role,
              timestamp: msg.timestamp
            }));
            
            if (chatMessages.length === 0) {
              // If no messages, add a welcome message
              setMessages([{...fallbackChatMessage, chatId}]);
            } else {
              setMessages(chatMessages);
            }
          }
        } catch (error) {
          console.error('Error fetching chat history:', error);
          // Add a fallback welcome message on error
          setMessages([{ ...fallbackChatMessage, chatId }]);
        }
      };
      
      fetchChatHistory();
    } else {
      // If no chat is selected, show a default welcome message
      setMessages([fallbackChatMessage]);
      setAgentEvents([]);
    }
  }, [chatId]);
  
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
      chatId: chatId || undefined,
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

      {/* Title bar: chat title */}
      <div className="flex items-center px-2 py-1 bg-gray-100 border-b border-gray-200">
        <div className="text-xs font-medium text-gray-600">
          {chatId ? `Session ${chatId}` : 'New Session'}
        </div>
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
