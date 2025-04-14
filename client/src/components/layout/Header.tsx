import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-gray-900 text-white shadow-md">
      <div className="px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link to="/" className="flex items-center group relative">
            <div className="flex items-center">
              <div className="mr-2 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Terminal window */}
                  <rect x="2" y="4" width="16" height="12" rx="1" stroke="#3B82F6" strokeWidth="1.5"/>
                  {/* Command prompt symbol */}
                  <path d="M5 10L7 12L5 14" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  {/* AI circuit node */}
                  <circle cx="13" cy="12" r="2" fill="#3B82F6"/>
                </svg>
              </div>
              <span className="text-lg font-medium">
                <span className="text-blue-500 font-semibold">Nano</span><span className="text-blue-400">machine</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6">
          <Link to="/" className="hover:text-blue-400 transition-colors">
            Dashboard
          </Link>
          <Link to="/tasks" className="hover:text-blue-400 transition-colors">
            Tasks
          </Link>
          <Link to="/sessions" className="hover:text-blue-400 transition-colors">
            Sessions
          </Link>
          <Link to="/settings" className="hover:text-blue-400 transition-colors">
            Settings
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-800">
          <div className="px-4 py-2 flex flex-col space-y-2">
            <Link
              to="/"
              className="block py-2 hover:text-blue-400 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              to="/tasks"
              className="block py-2 hover:text-blue-400 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Tasks
            </Link>
            <Link
              to="/sessions"
              className="block py-2 hover:text-blue-400 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Sessions
            </Link>
            <Link
              to="/settings"
              className="block py-2 hover:text-blue-400 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Settings
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
