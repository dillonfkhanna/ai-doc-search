"use client";
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
// --- CHANGE: Import the unified 'Document' interface ---
import { UserStats, Document, generatePreviewUrl } from "../library/api";
import {
  Calendar,
  FileText,
  TrendingUp,
  Eye,
  Clock,
  Sparkles,
  Database,
  ArrowUpRight,
  File,
} from "lucide-react";
import DocumentPreviewModal from "./DocumentPreviewModal";

interface EnhancedWelcomeSectionProps {
  loading: boolean;
  stats: UserStats | null;
  // --- CHANGE: Use the unified 'Document' type for recent files ---
  recentFiles: Document[];
  className?: string;
  onDelete: (deletedDocId: number) => void;
}

// Helper function to format bytes into KB, MB, GB, etc.
const formatBytes = (bytes: number | null | undefined, decimals = 2) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

// Helper to get a user-friendly relative date
const timeAgo = (date: Date | string) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    return "Unknown";
  }
  const now = new Date().getTime();
  const then = dateObj.getTime();
  const seconds = Math.floor((now - then) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
};

// Helper to get file extension icon and styling
const getFileInfo = (filename: string) => {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  const fileTypes: Record<
    string,
    {
      icon: React.ComponentType<{ className?: string }>;
      color: string;
      bgColor: string;
      label: string;
    }
  > = {
    pdf: {
      icon: FileText,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      label: "PDF",
    },
    docx: {
      icon: FileText,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      label: "DOCX",
    },
    doc: {
      icon: FileText,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      label: "DOC",
    },
    txt: {
      icon: File,
      color: "text-gray-400",
      bgColor: "bg-gray-500/10",
      label: "TXT",
    },
    xlsx: {
      icon: FileText,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      label: "XLSX",
    },
    pptx: {
      icon: FileText,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      label: "PPTX",
    },
    jpg: {
      icon: File,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      label: "JPG",
    },
    png: {
      icon: File,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      label: "PNG",
    },
    jpeg: {
      icon: File,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      label: "JPEG",
    },
  };
  return (
    fileTypes[extension] || {
      icon: File,
      color: "text-gray-400",
      bgColor: "bg-gray-500/10",
      label: extension.toUpperCase(),
    }
  );
};

const EnhancedWelcomeSection: React.FC<EnhancedWelcomeSectionProps> = ({
  loading,
  stats,
  recentFiles,
  className = "",
  onDelete,
}) => {
  const { currentUser } = useAuth();

  // --- CHANGE: Modal state now holds the entire Document object ---
  const [selectedDoc, setSelectedDoc] = useState<{
    previewUrl: string;
    doc: Document;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<number | null>(null);

  // --- CHANGE: Function now accepts a 'Document' object ---
  const handlePreviewClick = async (file: Document) => {
    if (!currentUser) return;
    setLoadingPreview(file.id);
    try {
      const token = await currentUser.getIdToken();
      // --- CHANGE: Use file.id to generate the preview URL ---
      const { preview_url } = await generatePreviewUrl(file.id, token);
      setSelectedDoc({
        previewUrl: preview_url,
        doc: file, // Store the entire document object
      });
    } catch (err) {
      console.error("Failed to load document preview.", err);
    } finally {
      setLoadingPreview(null);
    }
  };

  const closeModal = () => {
    setSelectedDoc(null);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getDisplayName = () =>
    currentUser?.displayName || currentUser?.email?.split("@")[0] || "User";

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Welcome Card */}
      <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-green-500/10 to-blue-500/10 rounded-full blur-xl" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">
                  {getGreeting()}, {getDisplayName()}!
                </h2>
              </div>
              <p className="text-gray-400">
                Welcome back to your document workspace
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-xs bg-gray-700/50 px-3 py-1.5 rounded-full">
              <Calendar className="w-3 h-3" />
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group bg-gradient-to-br from-blue-600/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4 hover:border-blue-500/30 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors duration-200">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="text-blue-400 text-2xl font-bold">
                    {loading ? (
                      <div className="animate-pulse bg-blue-500/20 h-8 w-12 rounded" />
                    ) : (
                      stats?.document_count || 0
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">Documents</div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-blue-400/50 group-hover:text-blue-400 transition-colors duration-200" />
              </div>
            </div>

            <div className="group bg-gradient-to-br from-green-600/10 to-green-500/5 border border-green-500/20 rounded-xl p-4 hover:border-green-500/30 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors duration-200">
                  <Database className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="text-green-400 text-2xl font-bold">
                    {loading ? (
                      <div className="animate-pulse bg-green-500/20 h-8 w-16 rounded" />
                    ) : (
                      formatBytes(stats?.total_storage_bytes)
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">Storage Used</div>
                </div>
                <TrendingUp className="w-4 h-4 text-green-400/50 group-hover:text-green-400 transition-colors duration-200" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Files Card */}
      <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            <h4 className="text-lg font-semibold text-white">Recent Uploads</h4>
          </div>
          {recentFiles.length > 0 && (
            <div className="text-xs text-gray-500 bg-gray-700/50 px-2 py-1 rounded-full">
              {recentFiles.length} recent
            </div>
          )}
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 bg-gray-700/40 rounded-lg animate-pulse"
                >
                  <div className="w-8 h-8 bg-gray-600 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-600 rounded w-3/4" />
                    <div className="h-3 bg-gray-600 rounded w-1/2" />
                  </div>
                  <div className="w-8 h-8 bg-gray-600 rounded-lg" />
                </div>
              ))}
            </div>
          ) : recentFiles.length > 0 ? (
            recentFiles.map((file, index) => {
              const fileInfo = getFileInfo(file.display_name);
              const IconComponent = fileInfo.icon;

              return (
                <div
                  key={file.id}
                  onClick={() => handlePreviewClick(file)}
                  className="group flex items-center gap-4 p-3 bg-gray-700/30 hover:bg-gray-700/60 rounded-xl transition-all duration-200 border border-transparent hover:border-gray-600 cursor-pointer"
                  style={{
                    animationName: "fadeInUp",
                    animationDuration: "0.5s",
                    animationTimingFunction: "ease-out",
                    animationFillMode: "forwards",
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 ${fileInfo.bgColor} rounded-lg flex items-center justify-center text-lg group-hover:scale-105 transition-transform duration-200`}
                  >
                    <IconComponent className={`w-5 h-5 ${fileInfo.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate text-sm group-hover:text-blue-300 transition-colors duration-200">
                      {file.display_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <p className="text-gray-400 text-xs">
                        {timeAgo(file.created_at)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewClick(file);
                    }}
                    disabled={loadingPreview === file.id}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Preview document"
                  >
                    {loadingPreview === file.id ? (
                      <div className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full" />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400 text-sm">No recent files yet</p>
              <p className="text-gray-500 text-xs mt-1">
                Upload your first document to get started
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedDoc && (
        <DocumentPreviewModal
          previewUrl={selectedDoc.previewUrl}
          onClose={closeModal}
          doc={selectedDoc.doc}
          onDelete={onDelete}
        />
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default EnhancedWelcomeSection;
