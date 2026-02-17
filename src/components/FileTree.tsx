import React from "react";
import { FileCode, Folder } from "lucide-react";

interface FileTreeProps {
  title: string;
  files: string[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  title,
  files,
  selectedFile,
  onSelectFile,
}) => {
  const sortedFiles = [...files].sort();

  return (
    <div className="flex flex-col h-full bg-slate-50 border rounded-lg overflow-hidden">
      <div className="bg-slate-100 px-3 py-2 border-b flex items-center gap-2">
        <Folder className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">
          {title}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {sortedFiles.length === 0 ? (
          <p className="text-[10px] text-slate-400 italic text-center py-4">
            No files loaded.
          </p>
        ) : (
          sortedFiles.map((path) => (
            <button
              key={path}
              onClick={() => onSelectFile(path)}
              className={`w-full text-left px-2 py-1.5 rounded text-[11px] flex items-center gap-2 transition-colors ${
                selectedFile === path
                  ? "bg-blue-100 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              <FileCode
                className={`w-3.5 h-3.5 shrink-0 ${selectedFile === path ? "text-blue-600" : "text-slate-400"}`}
              />
              <span className="truncate">{path}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
