"use client";
import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

// This component now receives functions as props from its parent
interface SearchDocumentsProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isSearching: boolean;
}

export default function SearchDocuments({ onSearch, onClear, isSearching }: SearchDocumentsProps) {
  // The search text is now managed inside this component
  const [query, setQuery] = useState("");

  // Auto-clear search when query becomes empty
  useEffect(() => {
    if (query.trim() === "") {
      onClear();
    }
  }, [query, onClear]);

  const handlePerformSearch = () => {
    if (!query.trim()) return;
    onSearch(query);
  };

  const handleClear = () => {
    setQuery("");
    onClear(); // Call the clear function passed from the Home page
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePerformSearch();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    
    // If user deletes all text, automatically clear search results
    if (newValue.trim() === "") {
      onClear();
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">
          Search Documents
        </h3>
        {query && (
          <div className="text-sm text-gray-400">
            Press Enter or click search to find results
          </div>
        )}
      </div>
      
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {/* Show a spinner inside the input when a search is running */}
          {isSearching ? (
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          ) : (
            <Search size={20} />
          )}
        </div>
        
        <input
          type="text"
          placeholder="Search across all documents..."
          className="w-full pl-10 pr-20 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isSearching}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {/* "X" button appears only when there is text */}
          {query && !isSearching && (
            <button
              onClick={handleClear}
              className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-600 rounded-md transition-colors duration-150"
              aria-label="Clear search"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={handlePerformSearch}
            disabled={isSearching || !query.trim()}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md transition-colors duration-150 flex items-center gap-1.5"
            aria-label="Search"
            title="Search documents"
          >
            {isSearching ? (
              <>
                <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
                Searching...
              </>
            ) : (
              <>
                <Search size={14} />
                Search
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Search tips */}
      {!query && (
        <div className="mt-3 text-xs text-gray-500">
          <p>💡 Tip: Try searching for specific terms, topics, or document types</p>
        </div>
      )}
    </div>
  );
}