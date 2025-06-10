'use client';
import { useState } from 'react';
import { Search, Bell, Settings, HelpCircle, Menu, X, FileText, BarChart3, Users } from 'lucide-react';

interface User {
  displayName?: string | null;
  email?: string | null;
}

interface EnhancedNavbarProps {
  currentUser: User;
  onLogout: () => void | Promise<void>;
}

export default function EnhancedNavbar({ currentUser, onLogout }: EnhancedNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications] = useState(3); // Mock notification count

  return (
    <>
      {/* Enhanced Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left section with logo and search */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">DocSearch</h1>
              </div>
              
            </div>

            {/* Center navigation items (for future use) */}
            <div className="hidden lg:flex items-center space-x-8">
              <button className="text-gray-300 hover:text-white transition-colors flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Documents</span>
              </button>
              <button className="text-gray-300 hover:text-white transition-colors flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </button>
              <button className="text-gray-300 hover:text-white transition-colors flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Team</span>
              </button>
            </div>
            
            {/* Right section with actions and profile */}
            <div className="flex items-center space-x-4">
              {/* Mobile search button */}
              <button className="md:hidden text-gray-300 hover:text-white transition-colors">
                <Search className="w-5 h-5" />
              </button>
              
              {/* Notifications */}
              <div className="relative">
                <button className="text-gray-300 hover:text-white transition-colors relative">
                  <Bell className="w-5 h-5" />
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {notifications}
                    </span>
                  )}
                </button>
              </div>

              {/* Help */}
              <button className="hidden sm:block text-gray-300 hover:text-white transition-colors">
                <HelpCircle className="w-5 h-5" />
              </button>

              {/* Settings */}
              <button className="hidden sm:block text-gray-300 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              
              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-3 hover:bg-gray-700 rounded-lg p-2 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-gray-600">
                    <span className="text-white text-sm font-medium">
                      {currentUser.displayName 
                        ? currentUser.displayName.charAt(0).toUpperCase()
                        : currentUser.email?.charAt(0).toUpperCase()
                      }
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-white">
                      {currentUser.displayName || 'User'}
                    </p>
                    <p className="text-xs text-gray-400">{currentUser.email}</p>
                  </div>
                </button>

                {/* Profile dropdown menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-lg border border-gray-600 z-50">
                    <div className="py-2">
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white flex items-center space-x-2">
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white flex items-center space-x-2">
                        <HelpCircle className="w-4 h-4" />
                        <span>Help & Support</span>
                      </button>
                      <hr className="border-gray-600 my-2" />
                      <button
                        onClick={onLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-600 hover:text-red-300"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden text-gray-300 hover:text-white transition-colors"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="lg:hidden bg-gray-700 border-t border-gray-600">
              <div className="px-4 py-4 space-y-3">
                {/* Mobile search */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search documents..."
                    className="w-full bg-gray-600 text-white placeholder-gray-400 pl-10 pr-4 py-2 rounded-lg border border-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                
                {/* Mobile navigation items */}
                <button className="w-full text-left text-gray-300 hover:text-white py-2 flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Documents</span>
                </button>
                <button className="w-full text-left text-gray-300 hover:text-white py-2 flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </button>
                <button className="w-full text-left text-gray-300 hover:text-white py-2 flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Team</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Click outside to close dropdowns */}
      {(isProfileOpen || isMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsProfileOpen(false);
            setIsMenuOpen(false);
          }}
        />
      )}
    </>
  );
}