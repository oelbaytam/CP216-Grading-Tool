import React, { useState, useEffect, useMemo } from "react";
import JSZip from "jszip";
import {
  Code,
  FileArchive,
  PlusCircle,
  Search,
  BookOpen,
  Loader2,
  AlertCircle,
  User,
  Hash,
  Terminal,
  Save,
  Trash2
} from "lucide-react";
import { parseStudentInfo } from "./utils/parsers";
import { StudentSubmission } from "./types";
import { FileTree } from "./components/FileTree";
import { 
  saveSubmissionsToStorage, 
  loadSubmissionsFromStorage, 
  saveReferencesToStorage, 
  loadReferencesFromStorage,
  saveViewState,
  loadViewState,
  clearAllStorage
} from "./utils/storage";

const App: React.FC = () => {
  const [submissions, setSubmissions] = useState<Record<string, StudentSubmission>>({});
  const [referenceFiles, setReferenceFiles] = useState<Record<string, string>>({});
  
  // Selection State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSubmissionFilePath, setSelectedSubmissionFilePath] = useState<string | null>(null);
  const [selectedReferenceFilePath, setSelectedReferenceFilePath] = useState<string | null>(null);
  
  // UI State
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true); // Start true to load storage
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // 1. INITIAL LOAD: Restore from Storage
  useEffect(() => {
    const restoreSession = async () => {
      try {
        setStatusMsg("Restoring previous session...");
        const [savedSubs, savedRefs, savedView] = await Promise.all([
          loadSubmissionsFromStorage(),
          loadReferencesFromStorage(),
          loadViewState()
        ]);

        if (savedSubs) setSubmissions(savedSubs);
        if (savedRefs) setReferenceFiles(savedRefs);
        
        if (savedView) {
          // Only restore ID if it actually exists in the loaded submissions
          if (savedView.selectedId && savedSubs && savedSubs[savedView.selectedId]) {
            setSelectedId(savedView.selectedId);
            setSelectedSubmissionFilePath(savedView.selectedSubmissionFile);
            setSelectedReferenceFilePath(savedView.selectedReferenceFile);
          }
        }
      } catch (err) {
        console.error("Failed to load session", err);
        setError("Could not restore previous session.");
      } finally {
        setIsLoading(false);
        setStatusMsg("");
      }
    };
    restoreSession();
  }, []);

  // 2. AUTO-SAVE: View State
  useEffect(() => {
    if (!isLoading) {
      saveViewState({
        selectedId,
        selectedSubmissionFile: selectedSubmissionFilePath,
        selectedReferenceFile: selectedReferenceFilePath
      });
    }
  }, [selectedId, selectedSubmissionFilePath, selectedReferenceFilePath, isLoading]);

  const handleClearStorage = async () => {
    if (window.confirm("Are you sure? This will delete all saved files and submissions.")) {
      setIsLoading(true);
      await clearAllStorage();
      setSubmissions({});
      setReferenceFiles({});
      setSelectedId(null);
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "zip" | "ref") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      if (type === "ref") {
        setStatusMsg("Processing references...");
        // Create new object to overwrite existing
        const newRefs: Record<string, string> = {};
        for (const file of Array.from(files)) {
          const content = await file.text();
          newRefs[file.name] = content;
        }
        
        // OVERWRITE STATE & STORAGE
        setReferenceFiles(newRefs);
        await saveReferencesToStorage(newRefs);
        setStatusMsg("References saved.");

      } else if (type === "zip") {
        setStatusMsg("Unzipping submissions...");
        const zip = new JSZip();
        const mainZip = await zip.loadAsync(files[0]);
        const submissionMap: Record<string, StudentSubmission> = {}; // Start fresh (Overwrite)

        const filePromises = Object.keys(mainZip.files).map(async (filename) => {
          if (filename.toLowerCase().endsWith(".zip")) {
            
            const { id, name, code } = parseStudentInfo(filename);
            
            const studentId = id || `unknown-${Math.random().toString(36).substr(2, 5)}`;
            const studentName = name || "Unknown Student";
            const studentCode = code || "N/A";

            try {
              const zipContent = await mainZip.files[filename].async("blob");
              const innerZip = new JSZip();
              const studentZip = await innerZip.loadAsync(zipContent);
              const studentFiles: Record<string, string> = {};

              const innerPromises = Object.keys(studentZip.files).map(async (innerPath) => {
                if (!studentZip.files[innerPath].dir) {
                  const ext = innerPath.split('.').pop()?.toLowerCase();
                  if (['txt', 'md', 'c', 'cpp', 'h', 'hpp', 'java', 'py', 'js', 'ts', 'json', 'xml', 'html', 'css', 's', 'asm'].includes(ext || '')) {
                     const content = await studentZip.files[innerPath].async("string");
                     studentFiles[innerPath] = content;
                  }
                }
              });
              
              await Promise.all(innerPromises);
              
              submissionMap[studentId] = { 
                studentId, 
                studentName,
                studentCode,
                zipFilename: filename, 
                rawZipBlob: zipContent, 
                files: studentFiles 
              };
            } catch (innerErr) {
              console.warn(`Failed to open inner zip for ${studentName}`, innerErr);
            }
          }
        });

        await Promise.all(filePromises);
        
        // OVERWRITE STATE & STORAGE
        setSubmissions(submissionMap);
        setStatusMsg("Saving to local database...");
        await saveSubmissionsToStorage(submissionMap);
        setStatusMsg("Done!");
      }
    } catch (err) {
      console.error(err);
      setError(`Error processing file: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMsg(""), 2000); // Clear status after 2s
      e.target.value = "";
    }
  };

  const studentList = useMemo(() => {
    return Object.values(submissions).filter(s => 
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.studentId.includes(searchTerm) ||
      s.studentCode.includes(searchTerm)
    ).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [submissions, searchTerm]);

  const currentSubmission = selectedId ? submissions[selectedId] : null;

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Code className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Grading Workspace</h1>
            {statusMsg && <p className="text-[10px] text-blue-600 font-medium animate-pulse">{statusMsg}</p>}
          </div>
        </div>

        <div className="flex gap-3">
          <button 
             onClick={handleClearStorage}
             className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-md text-xs font-bold hover:bg-red-100 transition-colors"
             title="Clear all saved data"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Data
          </button>
          <div className="w-px h-8 bg-slate-200 mx-1"></div>
          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-md text-xs font-medium cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
            <PlusCircle className="w-4 h-4 text-orange-500" />
            <span>Load References</span>
            <input type="file" className="hidden" multiple onChange={(e) => handleFileUpload(e, "ref")} />
          </label>
          <label className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-md text-xs font-medium cursor-pointer hover:bg-slate-800 transition-all shadow-sm">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
            <span>Load Submissions (ZIP)</span>
            <input type="file" className="hidden" accept=".zip" onChange={(e) => handleFileUpload(e, "zip")} disabled={isLoading} />
          </label>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r bg-white flex flex-col shrink-0 z-0">
          <div className="p-4 border-b bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, ID, or code..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="mt-2 flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {studentList.length} Students
              </span>
              <span className="text-[9px] font-medium text-slate-300 flex items-center gap-1">
                {submissions && Object.keys(submissions).length > 0 ? <Save className="w-3 h-3" /> : null}
                {submissions && Object.keys(submissions).length > 0 ? "Saved locally" : "No data"}
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="p-3 m-2 bg-red-50 border border-red-100 rounded text-xs text-red-600 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            
            {studentList.length === 0 && !isLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {searchTerm ? "No matches found." : "No students found. Load a ZIP file to begin."}
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {studentList.map((s) => (
                  <li key={s.studentId}>
                    <button
                      onClick={() => { setSelectedId(s.studentId); setSelectedSubmissionFilePath(null); }}
                      className={`w-full text-left px-5 py-3 hover:bg-slate-50 transition-all border-l-4 group ${
                        selectedId === s.studentId 
                          ? "bg-blue-50 border-l-blue-600" 
                          : "border-l-transparent"
                      }`}
                    >
                      <div className={`text-sm font-bold flex items-center gap-2 ${selectedId === s.studentId ? "text-blue-700" : "text-slate-700"}`}>
                        <User className="w-3.5 h-3.5 opacity-50" />
                        {s.studentName}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          <Hash className="w-2.5 h-2.5" />
                          {s.studentId}
                        </div>
                        {s.studentCode && s.studentCode !== "N/A" && (
                          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            <Terminal className="w-2.5 h-2.5" />
                            {s.studentCode}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Main Workspace */}
        <section className="flex-1 flex flex-col bg-slate-100 overflow-hidden relative">
          {!selectedId ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 pointer-events-none">
              <Code className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-sm font-medium uppercase tracking-widest">Select a student to start grading</p>
            </div>
          ) : (
            <div className="flex-1 flex gap-4 p-4 overflow-hidden">
              
              {/* Left Pane: Student Submission */}
              <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b px-4 py-2 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <FileArchive className="w-3.5 h-3.5 text-blue-500" />
                      Student Submission
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                       {currentSubmission?.studentCode}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-300 truncate max-w-[150px]">{currentSubmission?.zipFilename}</span>
                </div>
                
                <div className="flex-1 flex overflow-hidden">
                  <div className="w-48 shrink-0 border-r bg-slate-50/50">
                    <FileTree 
                      title="Files" 
                      files={Object.keys(currentSubmission?.files || {})} 
                      selectedFile={selectedSubmissionFilePath} 
                      onSelectFile={setSelectedSubmissionFilePath} 
                    />
                  </div>
                  <div className="flex-1 overflow-auto bg-white p-0">
                    {selectedSubmissionFilePath ? (
                      <pre className="p-4 text-xs font-mono leading-relaxed text-slate-800 whitespace-pre tab-4">
                        {currentSubmission?.files[selectedSubmissionFilePath]}
                      </pre>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-300 text-xs uppercase tracking-widest">
                        Select a file to view
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Pane: Reference Solution */}
              <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b px-4 py-3 flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                    Reference Solution
                  </span>
                </div>

                <div className="flex-1 flex overflow-hidden">
                  <div className="w-48 shrink-0 border-r bg-slate-50/50">
                     <FileTree 
                      title="References" 
                      files={Object.keys(referenceFiles)} 
                      selectedFile={selectedReferenceFilePath} 
                      onSelectFile={setSelectedReferenceFilePath} 
                    />
                  </div>
                  <div className="flex-1 overflow-auto bg-[#fffaf5] p-0">
                     {selectedReferenceFilePath ? (
                      <pre className="p-4 text-xs font-mono leading-relaxed text-slate-800 whitespace-pre tab-4">
                        {referenceFiles[selectedReferenceFilePath]}
                      </pre>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-300 text-xs uppercase tracking-widest">
                        No reference selected
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
