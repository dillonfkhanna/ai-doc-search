import { FileText, Download, Eye } from 'lucide-react';
import { SearchResult } from '../library/api';

interface SearchResultCardProps {
  result: SearchResult;
  onClick: (docu_name: string) => void;
}

// Helper function to get file extension and type info
const getFileInfo = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const fileTypes: Record<string, { icon: string; color: string; label: string }> = {
    pdf: { icon: '📄', color: 'bg-red-500', label: 'PDF' },
    docx: { icon: '📝', color: 'bg-blue-500', label: 'DOCX' },
    doc: { icon: '📝', color: 'bg-blue-500', label: 'DOC' },
    txt: { icon: '📄', color: 'bg-gray-500', label: 'TXT' },
    xlsx: { icon: '📊', color: 'bg-green-500', label: 'XLSX' },
    pptx: { icon: '📊', color: 'bg-orange-500', label: 'PPTX' },
  };
  
  return fileTypes[extension] || { icon: '📄', color: 'bg-gray-500', label: extension.toUpperCase() };
};

// Helper function to format relevance score
const getRelevanceLevel = (score?: number) => {
  if (!score) return { level: 'Unknown', color: 'bg-gray-500', width: '0%' };
  
  const percentage = Math.round(score * 100);
  if (percentage >= 90) return { level: 'Excellent', color: 'bg-green-500', width: `${percentage}%` };
  if (percentage >= 75) return { level: 'Very Good', color: 'bg-blue-500', width: `${percentage}%` };
  if (percentage >= 60) return { level: 'Good', color: 'bg-yellow-500', width: `${percentage}%` };
  return { level: 'Fair', color: 'bg-orange-500', width: `${percentage}%` };
};

export default function SearchResultCard({
  result,
  onClick,
}: SearchResultCardProps) {
  const fileName = result.display_name?.split("/").pop() || "Untitled Document";
  const fileInfo = getFileInfo(fileName);
  const relevance = getRelevanceLevel(result.score);

  return (
    <li
      onClick={() => onClick(result.docu_name)}
      className="group relative p-5 border border-gray-700 rounded-xl bg-gray-800 hover:bg-gray-750 hover:border-gray-600 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick(result.docu_name);
      }}
    >
      {/* Header with file info and actions */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* File type icon */}
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 ${fileInfo.color} rounded-lg flex items-center justify-center text-white text-lg`}>
              {fileInfo.icon}
            </div>
          </div>
          
          {/* File name and type badge */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white text-base mb-1 truncate pr-2">
              {fileName}
            </h4>
            <span className={`inline-block px-2 py-1 text-xs font-medium text-white rounded-md ${fileInfo.color}`}>
              {fileInfo.label}
            </span>
          </div>
        </div>

        {/* Quick action buttons and score */}
        <div className="flex items-center gap-2">
          {/* Large score display */}
          {result.score && (
            <div className="text-right">
              <div className={`text-lg font-bold ${relevance.color.replace('bg-', 'text-')}`}>
                {Math.round((result.score || 0) * 100)}%
              </div>
              <div className="text-xs text-gray-400">relevance</div>
            </div>
          )}
          
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick(result.docu_name);
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors duration-150"
              title="Preview document"
            >
              <Eye size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Relevance score bar */}
      {result.score && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Relevance: {relevance.level}</span>
            <span>{Math.round((result.score || 0) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full ${relevance.color} transition-all duration-300`}
              style={{ width: relevance.width }}
            />
          </div>
        </div>
      )}

      {/* Document snippet */}
      <div className="relative">
        <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
          {result.text}
        </p>
        {/* Fade effect for long text */}
        <div className="absolute bottom-0 right-0 w-8 h-6 bg-gradient-to-l from-gray-800 group-hover:from-gray-750 transition-colors duration-200 pointer-events-none" />
      </div>

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-500/20 transition-colors duration-200 pointer-events-none" />
    </li>
  );
}