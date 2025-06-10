import React from "react";

interface DocumentPreviewModalProps {
  previewUrl: string;
  onClose: () => void;
  docInfo: {
    filename: string;
  };
}

export default function DocumentPreviewModal({
  previewUrl,
  onClose,
  docInfo,
}: DocumentPreviewModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-gray-900 rounded-lg shadow-lg max-w-7xl w-11/12 h-4/5 flex"
        onClick={(e) => e.stopPropagation()} // prevent closing modal when clicking inside
      >
        {/* Side info panel (1/5 width) */}
        <div className="w-1/5 p-6 text-white border-r border-gray-700 flex flex-col">
          <h2 className="text-lg font-bold mb-4">Document Info</h2>
          <p>
            <strong>Filename:</strong>
          </p>
          <p className="break-words mb-4">
            {docInfo.filename.split("/").pop()}
          </p>
          {/* Add more metadata here if you want */}
          <div className="mt-auto flex flex-col gap-2">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-400 rounded hover:bg-blue-700 text-white transition text-center"
            >
              Download Document
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-400 rounded hover:bg-red-700 text-white transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Preview panel (4/5 width) */}
        <div className="w-4/5">
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(
              previewUrl
            )}&embedded=true`}
            title="Document Preview"
            className="w-full h-full rounded-r-lg"
            frameBorder="0"
          />
        </div>
      </div>
    </div>
  );
}
