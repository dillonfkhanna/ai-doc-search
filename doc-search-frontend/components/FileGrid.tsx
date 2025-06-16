"use client";
import React, { useState, useMemo } from 'react';
import { Search, Grid, List, Eye, Calendar, HardDrive, FileText, File, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { generatePreviewUrl, Document } from '../library/api';
import DocumentPreviewModal from './DocumentPreviewModal';

interface FileGridProps {
  loading: boolean;
  files: Document[];
  onDelete: (deletedDocId: number) => void;
}
type IconProps = { className?: string };

const getFileInfo = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const fileTypes: Record<string, { icon: React.ComponentType<IconProps>; color: string; bgColor: string; label: string }> = {
    pdf: { icon: FileText, color: 'text-red-400', bgColor: 'bg-red-500/10', label: 'PDF' },
    docx: { icon: FileText, color: 'text-blue-400', bgColor: 'bg-blue-500/10', label: 'DOCX' },
    doc: { icon: FileText, color: 'text-blue-400', bgColor: 'bg-blue-500/10', label: 'DOC' },
    txt: { icon: File, color: 'text-gray-400', bgColor: 'bg-gray-500/10', label: 'TXT' },
  };
  return fileTypes[extension] || { icon: File, color: 'text-gray-400', bgColor: 'bg-gray-500/10', label: extension.toUpperCase() };
};

const formatFileSize = (bytes: number | undefined) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export default function FileGrid({ loading, files, onDelete }: FileGridProps) {
  const { currentUser } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "type">("date");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === "grid" ? 12 : 16; // 12 for grid, 16 for list

  // --- CHANGE: Update state to use the 'Document' type ---
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- CHANGE: Function now accepts a 'Document' object and uses its 'id' ---
  const handlePreviewClick = async (file: Document) => {
    if (!currentUser) return;
    setError(null);
    setLoadingPreview(true);
    setSelectedDoc(file);
    try {
      const token = await currentUser.getIdToken();
      // Use the document's ID for the API call
      const { preview_url } = await generatePreviewUrl(file.id, token);
      setPreviewUrl(preview_url);
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
    setError(null);
  };

  const filteredAndSortedFiles = useMemo(() => {
    const filtered = files.filter(file => {
      const matchesSearch = (file.display_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (selectedFileType === "all") {
        return matchesSearch;
      }
      const fileExt = file.filename.split(".").pop()?.toLowerCase() || "";
      return matchesSearch && fileExt === selectedFileType;
    });
    filtered.sort((a, b) => {
      if (sortBy === "name") return a.display_name.localeCompare(b.display_name);
      if (sortBy === "date") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      const extA = a.filename.split('.').pop()?.toLowerCase() || '';
      const extB = b.filename.split('.').pop()?.toLowerCase() || '';
      return extA.localeCompare(extB) || a.display_name.localeCompare(b.display_name);
    });
    return filtered;
  }, [files, searchTerm, selectedFileType, sortBy]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedFiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageFiles = filteredAndSortedFiles.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFileType, sortBy, viewMode]);

  const fileTypes = useMemo(() => {
    const types = new Set(files.map(file => file.filename.split('.').pop()?.toLowerCase() || ''));
    return Array.from(types).filter(Boolean);
  }, [files]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Loader - No changes needed */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-800/30 rounded-xl p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-700 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls - No changes needed */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-gray-800/20 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search files..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        
        <div className="flex gap-3 items-center">
          <select 
            value={selectedFileType} 
            onChange={(e) => setSelectedFileType(e.target.value)} 
            className="px-4 py-3 bg-gray-900/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {fileTypes.map(type => (
              <option key={type} value={type}>{type.toUpperCase()}</option>
            ))}
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as "date" | "name" | "type")} 
            className="px-4 py-3 bg-gray-900/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="type">Sort by Type</option>
          </select>
          
          <div className="flex bg-gray-900/50 border border-gray-600/50 rounded-lg overflow-hidden">
            <button 
              onClick={() => setViewMode("grid")} 
              className={`p-3 transition-all duration-200 ${
                viewMode === "grid" 
                  ? "bg-blue-600 text-white" 
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
            >
              <Grid size={18} />
            </button>
            <button 
              onClick={() => setViewMode("list")} 
              className={`p-3 transition-all duration-200 ${
                viewMode === "list" 
                  ? "bg-blue-600 text-white" 
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Error Message - No changes needed */}
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Results Counter with Pagination Info */}
      <div className="text-sm text-gray-400 px-2 flex items-center justify-between">
        <div>
          <span className="font-medium text-white">{filteredAndSortedFiles.length}</span> of {files.length} files
          {filteredAndSortedFiles.length > 0 && (
            <span className="ml-2">
              (showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedFiles.length)} of {filteredAndSortedFiles.length})
            </span>
          )}
        </div>
        {totalPages > 1 && (
          <div className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
        )}
      </div>

      {/* Files Display */}
      {currentPageFiles.length > 0 ? (
        <div className={
          viewMode === "grid" 
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
            : "space-y-3"
        }>
          {currentPageFiles.map((file) => {
            const fileInfo = getFileInfo(file.filename);
            const IconComponent = fileInfo.icon;
            const isLoading = loadingPreview && selectedDoc?.id === file.id;
            
            return viewMode === 'list' ? (
              // List View - No logical changes needed
              <div 
                key={file.id} 
                onClick={() => handlePreviewClick(file)} 
                className="group flex items-center gap-4 p-4 bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 rounded-xl cursor-pointer transition-all duration-200 backdrop-blur-sm"
              >
                <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${fileInfo.bgColor}`}>
                  <IconComponent className={`w-6 h-6 ${fileInfo.color}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                    {file.display_name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {formatFileSize(file.file_size_bytes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(file.created_at)}
                    </span>
                    <span className="px-2 py-1 bg-gray-700/50 rounded text-xs font-medium">
                      {fileInfo.label}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handlePreviewClick(file); 
                  }} 
                  disabled={isLoading}
                  className="flex items-center justify-center w-10 h-10 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all duration-200 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            ) : (
              // Grid View - No logical changes needed
              <div 
                key={file.id} 
                onClick={() => handlePreviewClick(file)} 
                className="group bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 rounded-xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 backdrop-blur-sm flex flex-col min-h-[200px]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${fileInfo.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className={`w-6 h-6 ${fileInfo.color}`} />
                  </div>
                  
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handlePreviewClick(file); 
                    }} 
                    disabled={isLoading}
                    className="flex items-center justify-center w-8 h-8 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all duration-200 disabled:opacity-50 opacity-0 group-hover:opacity-100"
                  >
                    {isLoading ? (
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Eye size={14} />
                    )}
                  </button>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors duration-200 line-clamp-2 leading-tight">
                    {file.display_name}
                  </h3>
                </div>
                
                <div className="flex-1"></div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {formatFileSize(file.file_size_bytes)}
                    </span>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${fileInfo.bgColor} ${fileInfo.color}`}>
                      {fileInfo.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {formatDate(file.created_at)}
                  </div>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
              </div>
            );
          })}
        </div>
      ) : (
        // No files found view
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700/30 rounded-full mb-4">
            <File className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-400 text-lg">No files found</p>
          <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 backdrop-blur-sm"
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {/* Show first page */}
            {currentPage > 3 && (
              <>
                <button
                  onClick={() => goToPage(1)}
                  className="w-10 h-10 flex items-center justify-center bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 rounded-lg text-white transition-all duration-200 backdrop-blur-sm"
                >
                  1
                </button>
                {currentPage > 4 && (
                  <span className="px-2 text-gray-400">...</span>
                )}
              </>
            )}

            {/* Show pages around current page */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              if (pageNum < 1 || pageNum > totalPages) return null;
              if (currentPage > 3 && pageNum === 1) return null;
              if (currentPage < totalPages - 2 && pageNum === totalPages) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`w-10 h-10 flex items-center justify-center border rounded-lg transition-all duration-200 backdrop-blur-sm ${
                    currentPage === pageNum
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800/30 hover:bg-gray-800/50 border-gray-700/50 hover:border-gray-600/50 text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Show last page */}
            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && (
                  <span className="px-2 text-gray-400">...</span>
                )}
                <button
                  onClick={() => goToPage(totalPages)}
                  className="w-10 h-10 flex items-center justify-center bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 rounded-lg text-white transition-all duration-200 backdrop-blur-sm"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 backdrop-blur-sm"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* --- CHANGE: Pass the 'doc' object directly to the modal --- */}
      {selectedDoc && previewUrl && (
        <DocumentPreviewModal
          previewUrl={previewUrl}
          onClose={closeModal}
          doc={selectedDoc}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}