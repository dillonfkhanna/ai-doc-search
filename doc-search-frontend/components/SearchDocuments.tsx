import React, { useState } from "react";
import {
  queryDocuments,
  generatePreviewUrl,
  SearchResult,
} from "../library/api";
import { useAuth } from "@/contexts/AuthContext";
import SearchResultCard from "@/components/SearchResultCard";
import DocumentPreviewModal from "@/components/DocumentPreviewModal";

export default function SearchDocuments() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const { currentUser } = useAuth();

  const handleSearch = async () => {
    if (!query.trim() || !currentUser) return;
    setLoading(true);
    setError(null);

    try {
      const token = await currentUser.getIdToken();
      const searchResults = await queryDocuments(query, token);
      setResults(searchResults);
    } catch (err: any) {
      setError(err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (gcs_path: string) => {
    if (!currentUser) return;
    setLoadingPreview(true);
    try {
      const token = await currentUser.getIdToken();
      const { preview_url } = await generatePreviewUrl(gcs_path, token);
      setPreviewUrl(preview_url);
      setSelectedDoc(gcs_path);
    } catch (err) {
      setError("Failed to load document preview.");
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const closeModal = () => {
    setSelectedDoc(null);
    setPreviewUrl(null);
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6 mb-8">
      <h3 className="text-xl font-semibold text-white mb-4">
        Search Documents
      </h3>

      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search your documents..."
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            disabled={loading}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition duration-200"
            aria-label="Search"
          >
            <svg
              className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>

        {error && <p className="text-red-400">{error}</p>}

        {loadingPreview && <p className="text-white">Loading preview...</p>}

        {results.length > 0 ? (
          <ul className="flex flex-col gap-4 max-h-72 overflow-y-auto">
            {results.map((r, i) => (
              <SearchResultCard key={i} result={r} onClick={handleCardClick} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-wrap gap-2">
            
          </div>
        )}
      </div>

      {selectedDoc && previewUrl && (
        <DocumentPreviewModal
          previewUrl={previewUrl}
          onClose={closeModal}
          docInfo={{ filename: selectedDoc }}
        />
      )}
    </div>
  );
}
