"use client";
import { useAuth } from "../contexts/AuthContext";
import Login from "../components/Login";
import FileUploader from "../components/FileUploader";
import FileGrid from "../components/FileGrid";
import SearchDocuments from "@/components/SearchDocuments";
import EnhancedNavbar from "@/components/EnhancedNavbar";
import { useState, useEffect } from "react";
import EnhancedWelcomeSection from "../components/EnhancedWelcomeSection";

import {
  fetchUserStats,
  UserStats,
  fetchUserFiles,
  queryDocuments,
  Document, 
  generatePreviewUrl,
} from "../library/api";
import { useFileRefresh } from "../contexts/FileRefreshContext";
import SearchResultCard from "@/components/SearchResultCard";
import DocumentPreviewModal from "@/components/DocumentPreviewModal";

export default function Home() {
  const { currentUser, logout } = useAuth();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [files, setFiles] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchResults, setSearchResults] = useState<Document[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedDocument, setSelectedDocument] = useState<{
    previewUrl: string;
    doc: Document; 
  } | null>(null);

  const { onRefresh } = useFileRefresh();
  const refreshKey = onRefresh();

  useEffect(() => {
    const loadPageData = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const token = await currentUser.getIdToken();
        const [statsData, allFiles] = await Promise.all([
          fetchUserStats(token),
          fetchUserFiles(token),
        ]);
        setStats(statsData);
        setFiles(allFiles); 
      } catch (error) {
        console.error("Failed to load page data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadPageData();
  }, [currentUser, refreshKey]);

  
  const handleSearch = async (query: string) => {
    if (!query.trim() || !currentUser) return;
    setSearchQuery(query);
    setIsSearching(true);
    setSearchResults([]); 
    try {
      const token = await currentUser.getIdToken();
      const results = await queryDocuments(query, token);
      setSearchResults(results); 
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchResults(null);
    setSearchQuery("");
  };

  const handleDocumentClick = async (doc: Document) => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const previewResponse = await generatePreviewUrl(doc.id, token);

      setSelectedDocument({
        previewUrl: previewResponse.preview_url,
        doc: doc, 
      });
    } catch (error) {
      console.error("Failed to generate preview URL:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const handleDocumentDeleted = async (deletedDocId: number) => {
    if (!currentUser) return;

    setFiles(prevFiles => prevFiles.filter(file => file.id !== deletedDocId));

    try {
      const token = await currentUser.getIdToken();
      const newStats = await fetchUserStats(token);
      setStats(newStats); 
      
      console.log(`Document ${deletedDocId} removed and stats have been refreshed.`);

    } catch (error) {
      console.error("Failed to refresh stats after deletion:", error);
    }
  };

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <EnhancedNavbar currentUser={currentUser} onLogout={handleLogout} />

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <aside className="lg:col-span-1 space-y-8">
            <EnhancedWelcomeSection
              loading={loading}
              stats={stats}
              recentFiles={files.slice(0, 3)}
              onDelete={handleDocumentDeleted}
            />
            <FileUploader />
          </aside>

          <div className="lg:col-span-2 space-y-6">
            <SearchDocuments
              onSearch={handleSearch}
              onClear={clearSearch}
              isSearching={isSearching}
            />

            <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
              {searchResults !== null ? (
                
                <SearchResultsDisplay
                  results={searchResults}
                  isSearching={isSearching}
                  searchQuery={searchQuery}
                  onDocumentClick={handleDocumentClick} 
                />
              ) : (
                
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Your Files
                  </h3>
                  <FileGrid loading={loading} files={files} onDelete={handleDocumentDeleted} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Document Preview Modal */}
      {selectedDocument && (
        <DocumentPreviewModal
          previewUrl={selectedDocument.previewUrl}
          doc={selectedDocument.doc}
          onClose={() => setSelectedDocument(null)}
          onDelete={handleDocumentDeleted}
        />
      )}
    </div>
  );
}

interface SearchResultsDisplayProps {
  results: Document[];
  isSearching: boolean;
  searchQuery: string;
  onDocumentClick: (doc: Document) => void; 
}

const SearchResultsDisplay = ({
  results,
  isSearching,
  searchQuery,
  onDocumentClick,
}: SearchResultsDisplayProps) => {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-400 text-lg">Searching documents...</p>
        <p className="text-gray-500 text-sm mt-2">
          Finding relevant content for &quot;{searchQuery}&quot;
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <svg
            className="w-16 h-16 mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.41-1.007-5.849-2.618M16.5 17.5h-9A2.5 2.5 0 015 15V9a2.5 2.5 0 012.5-2.5h9A2.5 2.5 0 0119 9v6a2.5 2.5 0 01-2.5 2.5z"
            />
          </svg>
        </div>
        <h4 className="text-xl font-semibold text-white mb-2">
          No Results Found
        </h4>
        <p className="text-gray-400 mb-4">
          No documents match your search for &quot;{searchQuery}&quot;
        </p>
        <div className="text-sm text-gray-500 space-y-1">
          <p>Try:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Using different keywords</li>
            <li>Checking your spelling</li>
            <li>Using more general terms</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search Results Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">Search Results</h3>
          <p className="text-gray-400 text-sm mt-1">
            Found {results.length} result{results.length !== 1 ? "s" : ""} for
            &quot;{searchQuery}&quot;
          </p>
        </div>

        {/* Results count badge */}
        <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
          {results.length} {results.length === 1 ? "result" : "results"}
        </div>
      </div>

      {/* Search Results List */}
      <ul className="space-y-4">
        {results.map((result, index) => (
          <SearchResultCard
            key={`${result.id}-${index}`} 
            result={result}
            onClick={onDocumentClick} 
          />
        ))}
      </ul>
    </div>
  );
};
