import React, { useEffect, useState } from "react";
// Import the unified Document interface and the new delete function
import { Document, deleteDocument } from "../library/api";
// Import hooks and an icon
import { useAuth } from "../contexts/AuthContext";
import { Trash2 } from "lucide-react";

interface DocumentPreviewModalProps {
  previewUrl: string;
  onClose: () => void;
  doc: Document;
  // --- ADD: A callback function to notify the parent when a delete occurs ---
  onDelete: (deletedDocId: number) => void;
}

export default function DocumentPreviewModal({
  previewUrl,
  onClose,
  doc,
  onDelete, // Use the new prop
}: DocumentPreviewModalProps) {
  const { currentUser } = useAuth();

  // --- ADD: State to manage the delete confirmation flow ---
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [truncatedFilename, setTruncatedFilename] = useState(doc.display_name);

  // --- ADD: The delete handler function ---
  const handleDelete = async () => {
    if (!currentUser) {
      setDeleteError("You must be logged in to delete a document.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const token = await currentUser.getIdToken();
      await deleteDocument(doc.id, token);

      // Notify the parent component that the deletion was successful
      onDelete(doc.id);

      // Close the modal
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setDeleteError(errorMessage);
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const maxLength = window.innerWidth < 640 ? 20 : 35;
      setTruncatedFilename(
        doc.display_name.length > maxLength
          ? doc.display_name.substring(0, maxLength - 3) + "..."
          : doc.display_name
      );
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [doc.display_name]);

  // When the modal is closed, reset the delete confirmation state
  useEffect(() => {
    return () => {
      setIsConfirmingDelete(false);
      setDeleteError(null);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-md flex justify-center items-center z-50 animate-in fade-in duration-200 p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-none sm:rounded-2xl shadow-2xl shadow-black/50 w-full h-full sm:max-w-7xl sm:w-11/12 sm:h-4/5 flex flex-col lg:flex-row border-0 sm:border border-slate-700/50 animate-in zoom-in-95 duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full lg:w-1/5 p-4 sm:p-6 lg:p-8 text-white border-b lg:border-b-0 lg:border-r border-slate-700/70 flex flex-col bg-gradient-to-b from-slate-800/80 to-slate-900/80 lg:rounded-l-2xl flex-shrink-0 max-h-48 lg:max-h-none overflow-y-auto lg:overflow-visible">
          <div className="flex items-center mb-4 lg:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Document Info
            </h2>
          </div>
          <div className="space-y-3 sm:space-y-4 flex-1 min-h-0">
            <div className="bg-slate-800/60 rounded-xl p-3 sm:p-4 border border-slate-700/50">
              <p className="text-slate-300 text-xs sm:text-sm font-medium mb-2">
                Filename:
              </p>
              <p
                className="break-words text-white font-medium leading-relaxed text-xs sm:text-sm"
                title={doc.display_name}
              >
                {truncatedFilename}
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 sm:p-4 border border-slate-700/50">
              <p className="text-slate-300 text-xs sm:text-sm font-medium mb-2">
                Upload Date:
              </p>
              <p className="text-white font-medium text-xs sm:text-sm">
                {(() => {
                  try {
                    const date = new Date(doc.created_at);
                    return date.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  } catch {
                    return doc.created_at;
                  }
                })()}
              </p>
            </div>
            
            {deleteError && (
              <div className="bg-red-900/50 text-red-300 p-3 rounded-lg text-xs border border-red-500/50">
                {deleteError}
              </div>
            )}
          </div>

          {/* Action Buttons Section */}
          <div className="mt-4 lg:mt-6 flex flex-row lg:flex-col gap-2 lg:gap-3 shrink-0">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 lg:flex-none px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-200 text-center font-medium shadow-lg hover:shadow-blue-500/25 hover:scale-105 transform flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              <svg
                className="w-3 h-3 sm:w-4 sm:h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>

              <span className="truncate">Download</span>
            </a>

            <button
              onClick={onClose}
              className="flex-1 lg:flex-none px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl hover:from-slate-700 hover:to-slate-800 text-white transition-all duration-200 font-medium shadow-lg hover:shadow-slate-500/25 hover:scale-105 transform flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              <svg
                className="w-3 h-3 sm:w-4 sm:h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>

              <span className="truncate">Close</span>
            </button>

            <div className="border-t border-slate-700/50 pt-3">
              {!isConfirmingDelete ? (
                <button
                  onClick={() => setIsConfirmingDelete(true)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-red-900/50 text-red-300 rounded-xl hover:bg-red-900/80 hover:text-red-200 transition-all duration-200 font-medium flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span>Delete Document</span>
                </button>
              ) : (
                <div className="space-y-2 text-center p-2 bg-red-900/30 rounded-lg">
                  <p className="text-xs text-red-200">
                    Are you sure? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all text-xs sm:text-sm font-bold disabled:bg-red-800 disabled:cursor-wait"
                    >
                      {isDeleting ? "Deleting..." : "Confirm Delete"}
                    </button>
                    <button
                      onClick={() => setIsConfirmingDelete(false)}
                      disabled={isDeleting}
                      className="flex-1 px-3 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-all text-xs sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-4/5 bg-white lg:rounded-r-2xl overflow-hidden flex-1 min-h-0 relative">
          <div className="w-full h-full pt-8 lg:pt-0 overflow-auto">
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(
                previewUrl
              )}&embedded=true`}
              title="Document Preview"
              className="w-full min-h-full lg:h-full lg:rounded-r-2xl border-0"
              style={{ minHeight: "calc(100vh - 12rem)", height: "100%" }}
              frameBorder="0"
              scrolling="yes"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
