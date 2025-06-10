import React, { useState, useEffect } from 'react';
import { useAuth } from "../contexts/AuthContext";

import { 
  FileText, 
  TrendingUp, 
  Calendar,
  Star
} from 'lucide-react';

interface User {
  displayName?: string;
  email?: string;
  uid?: string;
}

interface EnhancedWelcomeSectionProps {
  documentCount?: number;
  storageUsed?: string;
  fileTypes?: number;
  className?: string;
}

const EnhancedWelcomeSection: React.FC<EnhancedWelcomeSectionProps> = ({ 
  documentCount = 0,
  storageUsed = "0 MB",
  fileTypes = 0,
  className = ""
}) => {
  const [animatedCount, setAnimatedCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { currentUser } = useAuth();
  // Animate document count on mount
  useEffect(() => {
    if (documentCount > 0) {
      const duration = 1000;
      const steps = 30;
      const increment = documentCount / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= documentCount) {
          setAnimatedCount(documentCount);
          clearInterval(timer);
        } else {
          setAnimatedCount(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }
  }, [documentCount]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getDisplayName = () => {
    return currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  };

  return (
    <div className={`bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white mb-1">
            {getGreeting()}, {getDisplayName()}!
          </h2>
          <p className="text-gray-400">
            Ready to search through your documents with AI-powered insights.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-gray-500 text-xs">
          <Calendar className="w-3 h-3" />
          {currentTime.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Document Count */}
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 hover:bg-blue-600/15 transition-colors">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-blue-400 text-2xl font-bold">{animatedCount}</div>
              <div className="text-gray-400 text-sm">Documents</div>
            </div>
          </div>
        </div>

        {/* Storage Used */}
        <div className="bg-green-600/10 border border-green-500/20 rounded-lg p-4 hover:bg-green-600/15 transition-colors">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <div>
              <div className="text-green-400 text-2xl font-bold">{storageUsed}</div>
              <div className="text-gray-400 text-sm">Storage Used</div>
            </div>
          </div>
        </div>

        {/* File Types */}
        <div className="bg-purple-600/10 border border-purple-500/20 rounded-lg p-4 hover:bg-purple-600/15 transition-colors">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-purple-400 text-2xl font-bold">{fileTypes}</div>
              <div className="text-gray-400 text-sm">File Types</div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-gray-700/30 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-gray-300 text-sm">System Status: Online</span>
          </div>
          <span className="text-gray-500 text-xs">
            Last sync: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedWelcomeSection;