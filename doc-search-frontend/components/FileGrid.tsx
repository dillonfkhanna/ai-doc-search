"use client";
import { useEffect, useState, useMemo } from "react";
import { Search, Grid, List, Eye } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useFileRefresh } from "../contexts/FileRefreshContext";
import DocumentPreviewModal from "./DocumentPreviewModal";
import { fetchUserFiles, generatePreviewUrl, UserFile } from "../library/api";

type FileGridProps = {
  onFileCountUpdate?: (count: number) => void;
};

// Helper function to get file info
const getFileInfo = (filename: string) => {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  const fileTypes: Record<
    string,
    { icon: string; color: string; label: string }
  > = {
    pdf: { icon: "📄", color: "bg-red-600", label: "PDF" },
    docx: { icon: "📝", color: "bg-blue-500", label: "DOCX" },
    doc: { icon: "📝", color: "bg-blue-500", label: "DOC" },
    txt: { icon: "📄", color: "bg-gray-500", label: "TXT" },
    xlsx: { icon: "📊", color: "bg-green-500", label: "XLSX" },
    pptx: { icon: "🎨", color: "bg-orange-500", label: "PPTX" },
    csv: { icon: "📊", color: "bg-emerald-500", label: "CSV" },
  };

  return (
    fileTypes[extension] || {
      icon: "📄",
      color: "bg-gray-500",
      label: extension.toUpperCase(),
    }
  );
};

export default function FileGrid({ onFileCountUpdate }: FileGridProps) {
  const { currentUser } = useAuth();
  const [files, setFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "type" | "date">("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modal state
  const [selectedDoc, setSelectedDoc] = useState<UserFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { onRefresh } = useFileRefresh();
  const refreshKey = onRefresh();

  useEffect(() => {
    const fetchFiles = async () => {
      if (!currentUser) return;

      try {
        const token = await currentUser.getIdToken();
        const userFiles = await fetchUserFiles(token);
        setFiles(userFiles || []);
        onFileCountUpdate?.(userFiles.length || 0);
      } catch (error) {
        console.error("Error fetching files:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [refreshKey, currentUser, onFileCountUpdate]);

  // Handle file click to open modal
  const handleFileClick = async (file: UserFile) => {
    if (!currentUser) return;

    setError(null);
    setLoadingPreview(true);
    setSelectedDoc(file);

    try {
      const token = await currentUser.getIdToken();
      const { preview_url } = await generatePreviewUrl(file.gcs_path, token);
      console.log("Preview URL:", preview_url);
      setPreviewUrl(preview_url);
    } catch (err) {
      setError("Failed to load document preview.");
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setSelectedDoc(null);
    setPreviewUrl(null);
    setError(null);
  };

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = files.filter(file => {
      const matchesSearch = file.filename.toLowerCase().includes(searchTerm.toLowerCase());

      if (selectedFileType === "all") return matchesSearch;

      const fileExt = file.filename.split(".").pop()?.toLowerCase() || "";
      return matchesSearch && fileExt === selectedFileType;
    });

    filtered.sort((a, b) => {

      if (sortBy === "name") {
        return a.filename.localeCompare(b.filename);
      } else if (sortBy === "date") {
        // We can now sort by date!
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else { // Sort by type
        const extA = a.filename.split('.').pop()?.toLowerCase() || '';
        const extB = b.filename.split('.').pop()?.toLowerCase() || '';
        return extA.localeCompare(extB) || a.filename.localeCompare(b.filename);
      }
    });

    return filtered;
  }, [files, searchTerm, selectedFileType, sortBy]);

  // Get unique file types for filter
  const fileTypes = useMemo(() => {
    const types = new Set(
      files.map(file => file.filename.split('.').pop()?.toLowerCase() || '')
    );
    return Array.from(types).filter(Boolean);
  }, [files]);

  if (!currentUser) return null;

  if (loading) return <p className="text-gray-400">Loading files...</p>;

  return (
    <div className="space-y-6">
      {/* Search and Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700 text-white rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
          />
        </div>

        {/* Controls */}
        <div className="flex gap-3 items-center">
          <select
            value={selectedFileType}
            onChange={(e) => setSelectedFileType(e.target.value)}
            className="px-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700 text-white rounded-xl focus:border-blue-500 focus:outline-none transition-all"
          >
            <option value="all">All Files</option>
            {fileTypes.map(type => (
              <option key={type} value={type}>{type.toUpperCase()}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "type" | "date")}
            className="px-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700 text-white rounded-xl focus:border-blue-500 focus:outline-none transition-all"
          >
            <option value="name">Sort by Name</option>
            <option value="date">Sort by Date</option>
            <option value="type">Sort by Type</option>
          </select>

          <div className="flex bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-3 rounded-lg transition-all ${
                viewMode === "grid" 
                  ? "bg-blue-600 text-white shadow-lg" 
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-3 rounded-lg transition-all ${
                viewMode === "list" 
                  ? "bg-blue-600 text-white shadow-lg" 
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-900/30 backdrop-blur-sm border border-red-500/50 text-red-200 px-6 py-4 rounded-xl">
          <p className="font-medium">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 underline mt-2 text-sm transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-gray-400">
        <span className="font-medium text-white">{filteredAndSortedFiles.length}</span> of {files.length} files
        {searchTerm && <span> matching "<span className="text-blue-400">{searchTerm}</span>"</span>}
      </div>

      {/* File grid/list */}
      {filteredAndSortedFiles.length > 0 ? (
        <div className={
          viewMode === "grid" 
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6"
            : "space-y-3"
        }>
          {/* We now map over 'file' objects, not 'filePath' strings */}
          {filteredAndSortedFiles.map((file) => {
            const fileInfo = getFileInfo(file.filename);
            // Check loading state by comparing the unique gcs_path
            const isLoading = loadingPreview && selectedDoc?.gcs_path === file.gcs_path; 
            
            if (viewMode === "list") {
              return (
                <div
                  key={file.gcs_path} // <-- Use a unique identifier from the object
                  onClick={() => handleFileClick(file)} // <-- Pass the entire object to the handler
                  className={`group flex items-center gap-4 p-4 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 hover:border-gray-600 hover:bg-gray-700/50 rounded-xl transition-all cursor-pointer ${
                    isLoading ? 'opacity-75 cursor-wait' : ''
                  }`}
                >
                  <div className={`w-12 h-12 ${fileInfo.color} rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0 shadow-lg`}>
                    {fileInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* <-- Use file properties directly, no more string splitting */}
                    <p className="text-white font-medium truncate text-sm">{file.display_name}</p> 
                    <p className="text-gray-400 text-xs mt-1">{fileInfo.label}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileClick(file); // <-- Pass the object here too
                      }}
                      disabled={loadingPreview}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Preview"
                    >
                      {isLoading ? (
                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>
              );
            }

            // Grid View
            return (
              <div
                key={file.gcs_path} // <-- Use a unique identifier from the object
                onClick={() => handleFileClick(file)} // <-- Pass the entire object to the handler
                className={`group bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 hover:border-gray-600 hover:bg-gray-700/50 p-6 rounded-2xl transition-all cursor-pointer relative hover:shadow-xl hover:scale-[1.02] ${
                  isLoading ? 'opacity-75 cursor-wait' : ''
                }`}
              >
                <div className="flex flex-col items-center text-center h-full">
                  <div className={`w-16 h-16 ${fileInfo.color} rounded-2xl flex items-center justify-center text-white text-2xl mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}>
                    {fileInfo.icon}
                  </div>
                  <div className="flex-1 flex items-center mb-4">
                    <p className="text-white text-sm font-medium leading-tight break-words text-center">
                      {file.display_name}  {/* <-- Use file properties directly */}
                    </p>
                  </div>
                  <div className="mt-auto">
                    <span className={`px-3 py-1.5 text-xs font-semibold text-white rounded-lg ${fileInfo.color} shadow-md`}>
                      {fileInfo.label}
                    </span>
                  </div>
                </div>
                
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileClick(file); // <-- Pass the object here too
                    }}
                    disabled={loadingPreview}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/80 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                    title="Preview"
                  >
                    {isLoading ? (
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>

                {isLoading && (
                  <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-gray-400 text-lg mb-4">
            {searchTerm || selectedFileType !== "all" ? "No files match your filters" : "No files uploaded yet"}
          </div>
          {(searchTerm || selectedFileType !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedFileType("all");
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Modal can now receive richer data */}
      {selectedDoc && previewUrl && (
        <DocumentPreviewModal
          previewUrl={previewUrl}
          onClose={closeModal}
          docInfo={{ filename: selectedDoc.display_name }}
        />
      )}
    </div>
  );
}