import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

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
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputText.trim() === '') return;

    // Add user message
    const newUserMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: inputText,
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, newUserMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate agent response after a delay
    setTimeout(() => {
      const mockResponses = [
        "I'll handle that for you right away.",
        "Let me check the VCN connection status.",
        "I can navigate to that website for you.",
        "Would you like me to extract data from this page?",
        "I've completed the requested action.",
      ];
      
      const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      
      const newAgentMessage: Message = {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        text: randomResponse,
        timestamp: new Date().toISOString(),
      };

      setMessages(prevMessages => [...prevMessages, newAgentMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
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
            className="flex-grow border border-gray-300 rounded-l text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={inputText.trim() === '' || isTyping}
            className={`px-2 py-1 rounded-r ${inputText.trim() === '' || isTyping ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
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
