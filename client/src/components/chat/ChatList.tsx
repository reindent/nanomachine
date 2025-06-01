import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import socketService from '../../services/socketService';
import { API_URL } from '../../config';

// Define the Chat interface
interface Chat {
  _id: string;
  title: string;
  lastMessageAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChatListProps {
  onChatSelect?: (chatId: string) => void;
  selectedChatId?: string | null;
  onNewChat?: () => void;
}

export default function ChatList({ onChatSelect, selectedChatId, onNewChat }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatTitle, setEditingChatTitle] = useState('');

  // Fetch chats on component mount
  useEffect(() => {
    fetchChats();
    
    // On connect, fetch chats
    socketService.onConnectionStatus((connected) => {
      if (connected) fetchChats();
    });

    // Listen for new chat creation events
    const chatCreatedUnsubscribe = socketService.onChatCreated((chat) => {
      console.log('ChatList received new chat notification:', chat);
      // Refresh the chat list when a new chat is created
      fetchChats();
    });

    // Listen for chat selection events
    const chatSelectedUnsubscribe = socketService.onChatSelected((chatId) => {
      console.log('ChatList received chat selection notification:', chatId);
      // Select the chat in the UI
      if (onChatSelect) {
        onChatSelect(chatId);
      }
      
    });
    
    // Also listen for chat messages - refresh the list when any message is sent
    const chatMessageUnsubscribe = socketService.onChatMessage(() => {
      // This will ensure the chat list is refreshed whenever any message is sent
      fetchChats();
    });
    
    // Clean up the subscriptions when the component unmounts
    return () => {
      chatCreatedUnsubscribe();
      chatMessageUnsubscribe();
      chatSelectedUnsubscribe();
    };
  }, []);

  // Function to fetch chats from the server
  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/chats`);
      setChats(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError('Failed to load chats. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Function to create a new chat
  const createNewChat = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/chats`, {
        title: `New Session ${new Date().toLocaleString()}`
      });
      
      // Refresh the chat list immediately after creating a new chat
      fetchChats();
      
      // If onNewChat callback is provided, use it
      if (onNewChat) {
        onNewChat();
      }
      
      // If onChatSelect callback is provided, use it; otherwise navigate directly
      if (onChatSelect) {
        onChatSelect(response.data._id);
      } else {
        // Navigate to the new chat
        navigate(`/session/${response.data._id}`);
      }
    } catch (err) {
      console.error('Error creating new chat:', err);
      setError('Failed to create a new chat. Please try again later.');
    }
  };

  // Function to delete a chat
  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    
    if (!window.confirm('Are you sure you want to delete this chat?')) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/api/chats/${chatId}`);
      // Refresh the chat list
      fetchChats();
    } catch (err) {
      console.error('Error deleting chat:', err);
      setError('Failed to delete chat. Please try again later.');
    }
  };
  
  // Function to start editing a chat
  const startEditingChat = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking edit
    setEditingChatId(chat._id);
    setEditingChatTitle(chat.title);
  };
  
  // Function to save chat title
  const saveEditedChat = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingChatId || !editingChatTitle.trim()) {
      return;
    }
    
    try {
      await axios.put(`${API_URL}/api/chats/${editingChatId}`, {
        title: editingChatTitle.trim()
      });
      
      // Update local state
      setChats(chats.map(chat => 
        chat._id === editingChatId 
          ? { ...chat, title: editingChatTitle.trim() } 
          : chat
      ));
      
      // Reset editing state
      setEditingChatId(null);
      setEditingChatTitle('');
    } catch (err) {
      console.error('Error updating chat:', err);
      setError('Failed to update chat. Please try again later.');
    }
  };
  
  // Function to cancel editing
  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
    setEditingChatTitle('');
  };

  // Function to handle chat selection
  const handleChatSelect = (chatId: string) => {
    // Emit the chat:select event to the server
    socketService.emit('chat:select', chatId);
    
    // Call the onChatSelect callback if provided
    if (onChatSelect) {
      onChatSelect(chatId);
    } else {
      // Navigate to the chat
      navigate(`/session/${chatId}`);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Filter chats based on search term
  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Use the selectedChatId prop if provided, otherwise try to get from URL
  const currentChatId = selectedChatId || (location.pathname.startsWith('/session/') 
    ? location.pathname.split('/session/')[1]
    : null);

  return (
    <div className="flex flex-col h-full bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
      <div className="p-4 border-gray-200 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-lg font-semibold text-gray-800 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            Your Sessions
          </h1>
          <div className="flex space-x-2">
            <button 
              onClick={fetchChats}
              className="bg-gray-100 hover:bg-gray-200 text-blue-600 p-1.5 rounded-md flex items-center justify-center transition-colors shadow-sm border border-gray-200"
              title="Refresh Chats"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={createNewChat}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm flex items-center transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
          </div>
        </div>
        
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm bg-white"
          />
          {searchTerm ? (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <div className="absolute right-3 top-2.5 text-gray-400 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Chat List */}
      <div className="bg-blue-50 flex-1 overflow-y-auto p-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-3 text-sm shadow-sm">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 shadow-sm">
              {searchTerm ? (
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-gray-600 mb-1">No chats matching</p>
                  <p className="text-blue-600 font-medium">"{searchTerm}"</p>
                </div>
              ) : (
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-gray-600 mb-4">No sessions found</p>
                  <button
                    onClick={createNewChat}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                  >
                    Create your first session
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredChats.map((chat) => 
              editingChatId === chat._id ? (
                // Editing mode
                <form 
                  key={chat._id}
                  onSubmit={saveEditedChat}
                  onClick={(e) => e.stopPropagation()}
                  className={`rounded-lg p-3 border border-blue-300 bg-blue-50 shadow-sm transition-all`}
                >
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={editingChatTitle}
                      onChange={(e) => setEditingChatTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                      autoFocus
                      placeholder="Enter chat title"
                    />
                    <div className="flex ml-2">
                      <button
                        type="submit"
                        className="text-green-600 hover:text-green-800 p-1.5 rounded-full hover:bg-green-50 transition-colors"
                        title="Save changes"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                        title="Cancel"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                // Normal display mode
                <div
                  key={chat._id}
                  onClick={() => handleChatSelect(chat._id)}
                  className={`rounded-lg p-3 cursor-pointer flex justify-between items-center transition-all hover:shadow-sm ${currentChatId === chat._id ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'border border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className="flex-1 min-w-0">
                    <h2 className={`font-medium truncate ${currentChatId === chat._id ? 'text-blue-700' : 'text-gray-800'}`}>
                      {chat.title}
                    </h2>
                    <p className="text-xs text-gray-500 truncate mt-1 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {chat.lastMessageAt ? formatDate(chat.lastMessageAt) : 'No messages yet'}
                    </p>
                  </div>
                  <div className="flex items-center ml-2">
                    {/* Edit button */}
                    <button
                      onClick={(e) => startEditingChat(chat, e)}
                      className="text-gray-400 hover:text-blue-600 p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                      title="Edit chat"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={(e) => deleteChat(chat._id, e)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                      title="Delete chat"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

    </div>
  );
}
