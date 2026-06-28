"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, Sparkles, Flame, Target, BookOpen, 
  FileText, AlertTriangle, ChevronRight, BrainCircuit, 
  Book, Layers, CornerDownLeft, Database
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Subject {
  id: string;
  name: string;
  code: string;
}

const MOCK_SOURCES = [
  { title: "AKTU Quantum - AI Context", type: "RAG Engine", domain: "internal", icon: <Database size={14} className="text-indigo-400" /> },
];

export default function DashboardPage() {
  // --- UI STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // --- DATA STATES ---
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: "18cfdbda-cde1-4d52-937d-feabfab2a95e", name: "Compiler Design", code: "KIT601" } // Fallback baseline
  ]);
  const [activeSubjectId, setActiveSubjectId] = useState('18cfdbda-cde1-4d52-937d-feabfab2a95e');
  const [aiResponse, setAiResponse] = useState('');
  const [activeProvider, setActiveProvider] = useState('');

  // 📡 FETCH LIVE SUBJECTS FROM BACKEND ON MOUNT
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/ai/subjects'); // Create this route or use mock if not ready
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setSubjects(data);
            setActiveSubjectId(data[0].id);
          }
        }
      } catch (err) {
        console.warn("⚠️ Backed subjects route missing, defaulting to static configuration.");
        setActiveSubjectId(subjects[0].id);
      }
    };
    fetchSubjects();
  }, []);

  // 📡 THE BULLETPROOF SSE STREAMING PIPELINE
  const handleAISearch = async (e?: React.FormEvent, overrideQuery?: string, overrideType?: string) => {
    if (e) e.preventDefault();
    
    const finalQuery = overrideQuery || searchQuery;
    const finalType = overrideType || "chat";

    if (!finalQuery.trim()) return;
    
    setSubmittedQuery(finalQuery);
    setIsSearching(true);
    setShowResults(true);
    setAiResponse('');
    setActiveProvider('CONNECTING...');

    try {
      const response = await fetch('http://localhost:5000/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalQuery,
          subjectId: activeSubjectId,
          type: finalType, // 👈 Dynamically pipes 'chat', 'mock_exam', 'revision_notes', etc.
          history: []
        })
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Stream reader failed.");

      const decoder = new TextDecoder();
      let remainingBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        remainingBuffer += decoder.decode(value, { stream: true });
        const lines = remainingBuffer.split('\n');
        remainingBuffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          if (cleanLine.startsWith('data: ')) {
            const rawData = cleanLine.slice(6);
            if (rawData === '[DONE]') {
              setIsSearching(false);
              continue;
            }

            try {
              const parsed = JSON.parse(rawData);
              if (parsed.error) {
                setAiResponse((prev) => prev + `\n\n❌ **Error:** ${parsed.error}`);
                setIsSearching(false);
                break;
              }

              if (parsed.text) {
                setAiResponse((prev) => prev + parsed.text);
              }
              if (parsed.provider) {
                setActiveProvider(parsed.provider);
              }
            } catch (err) {
              // Ignore partial JSON chunks natively
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Stream Crash:", error);
      setAiResponse(`\n\n❌ **System Failure:** Could not establish pipeline. Is the backend running?`);
      setIsSearching(false);
    }
  };

  const resetDashboard = () => {
    setShowResults(false);
    setSearchQuery('');
    setAiResponse('');
  };

  return (
    <div className="w-full min-h-screen bg-[#050505] text-white p-6 md:p-10 pt-16 md:pt-20 font-sans">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* --- DYNAMIC HEADER --- */}
        {!showResults ? (
          <div className="flex flex-col items-center text-center space-y-6 my-12 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-400">
              <BrainCircuit size={14} /> AI Syllabus Engine Active
            </div>
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white">
              Prepare Smarter with <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 font-bold">AI</span>
            </h1>
          </div>
        ) : (
          <div className="border-b border-white/10 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
            <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight flex items-start md:items-center gap-3">
              <Sparkles className="text-indigo-400 shrink-0 mt-1 md:mt-0" size={22} />
              <span className="leading-snug">{submittedQuery}</span>
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase font-mono tracking-widest bg-white/5 border border-white/10 px-2 py-1 rounded text-slate-400">
                Subject ID: {activeSubjectId ? `${activeSubjectId.split('-')[0]}...` : 'NONE'}
              </span>
              <span className={`text-[10px] uppercase font-mono tracking-widest border px-2 py-1 rounded ${activeProvider === 'CACHE_HIT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                {activeProvider || 'INITIALIZING'}
              </span>
            </div>
          </div>
        )}

        {/* --- OMNI SEARCH BAR --- */}
        <div className="w-full max-w-3xl mx-auto relative group z-10">
          <div className="absolute -inset-0.5 bg-linear-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
          <form onSubmit={(e) => handleAISearch(e)} className="relative bg-[#0d0d0d] border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col md:flex-row md:items-center transition-all focus-within:border-indigo-500/50 gap-2 md:gap-0">
            
            {/* INLINE SUBJECT SELECTOR */}
            <div className="flex items-center px-2 md:border-r border-white/10 shrink-0">
              <Book size={16} className="text-slate-500 mr-2" />
              <select 
                value={activeSubjectId}
                onChange={(e) => setActiveSubjectId(e.target.value)}
                className="bg-transparent text-slate-300 text-sm font-medium outline-none cursor-pointer appearance-none pr-4 hover:text-white transition-colors"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id} className="bg-[#111] text-slate-200">
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <Search className="hidden md:block text-slate-500 ml-3 shrink-0" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask anything... (e.g., Explain Section C concepts)"
              className="w-full bg-transparent border-none outline-none text-slate-200 px-4 py-2 md:py-3 text-sm md:text-base placeholder:text-slate-600 font-light"
            />
            <button 
              type="submit"
              disabled={isSearching}
              className="bg-white text-black hover:bg-slate-200 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl px-6 py-2.5 text-xs font-semibold transition-all flex items-center justify-center gap-2 shrink-0 w-full md:w-auto"
            >
              {isSearching ? 'Thinking...' : 'Ask'} <CornerDownLeft size={12} />
            </button>
          </form>
        </div>

        {/* --- DYNAMIC LAYOUT RENDERER --- */}
        {!showResults ? (
          <div className="space-y-10 animate-fade-in">
            {/* POPULAR ACTIONS (Fires Directly with corresponding Types) */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={12} /> Popular Actions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ActionCard 
                  icon={<Flame className="text-orange-500" size={18} />} 
                  title="Most Repeated" 
                  desc="Top AKTU PYQs" 
                  onClick={() => handleAISearch(undefined, "Identify and list the top 5 most repeated questions in this subject from past papers.", "pyq_analysis")}
                />
                <ActionCard 
                  icon={<Target className="text-emerald-500" size={18} />} 
                  title="Predicted Specs" 
                  desc="High probability topics" 
                  onClick={() => handleAISearch(undefined, "Generate high-probability predicted questions and key focus areas for the upcoming end-semester exam.", "prediction")}
                />
                <ActionCard 
                  icon={<FileText className="text-indigo-400" size={18} />} 
                  title="Generate Mock" 
                  desc="Full 70-mark pattern" 
                  onClick={() => handleAISearch(undefined, "Create a full 70-mark sample question paper strictly following the official AKTU structure.", "sample_paper")}
                />
                <ActionCard 
                  icon={<BookOpen className="text-cyan-400" size={18} />} 
                  title="Revision Notes" 
                  desc="Unit-wise AI summaries" 
                  onClick={() => handleAISearch(undefined, "Provide bulleted revision summaries for all units matching this subject's syllabus core rules.", "revision_notes")}
                />
              </div>
            </div>

            {/* PROGRESS & RECOMMENDATIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-6 flex flex-col justify-between space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">Your Progress</h3>
                    <p className="text-xs text-slate-500">Information Technology • Sem 6</p>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
                    12 Day Streak 🔥
                  </div>
                </div>
                <div className="space-y-4">
                  <ProgressRow label="Overall Exam Readiness" value={68} color="bg-indigo-500" />
                  <ProgressRow label="Syllabus Coverage" value={42} color="bg-cyan-500" />
                </div>
              </div>

              <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <AlertTriangle className="text-amber-500" size={18} /> AI Recommendations
                </h3>
                <div className="space-y-3">
                  <RecommendationItem 
                    topic="Bottom-up Parsing" 
                    desc="AKTU repeats this 85% of the time." 
                    onClick={() => handleAISearch(undefined, "Explain Bottom-up Parsing in depth focusing on LR parsers and shift-reduce conflicts as per AKTU trend.", "chat")}
                  />
                  <RecommendationItem 
                    topic="Database Indexing (B+ Trees)" 
                    desc="Highly expected 10-marker for Section B." 
                    onClick={() => handleAISearch(undefined, "Explain B+ Tree indexing structures and why they are optimized for disk systems over standard binary trees.", "chat")}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* EVALUATED CONTEXT */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Layers size={12} /> Evaluated Context
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {MOCK_SOURCES.map((src, idx) => (
                  <div key={idx} className="bg-[#0d0d0d] border border-white/5 p-3 rounded-xl flex flex-col justify-between space-y-2">
                    <div className="flex items-center gap-2">
                      {src.icon}
                      <span className="text-xs font-medium text-slate-200 truncate">{src.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{src.domain} • {src.type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* THE STREAMING RENDER BLOCK */}
            <div className="text-slate-300 text-sm md:text-base leading-relaxed p-6 bg-[#090909] border border-white/5 rounded-2xl shadow-inner min-h-50">
              {aiResponse === '' && isSearching ? (
                 <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50 py-10">
                   <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                   <span className="text-xs tracking-widest uppercase">Connecting to AI Core...</span>
                 </div>
              ) : (
                <div className="prose prose-invert prose-indigo max-w-none prose-pre:bg-[#111] prose-pre:border prose-pre:border-white/10 prose-headings:font-semibold">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {aiResponse}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            <button 
              onClick={resetDashboard}
              className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors pt-2"
            >
              ← Clear & Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- REUSABLE MICRO-COMPONENTS ---
function ActionCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col text-left p-4 bg-[#0d0d0d] border border-white/5 rounded-xl hover:bg-[#151515] hover:border-white/20 transition-all group w-full"
    >
      <div className="bg-white/5 p-2.5 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform">{icon}</div>
      <span className="font-medium text-slate-200 text-sm mb-1">{title}</span>
      <span className="text-xs text-slate-500 leading-snug">{desc}</span>
    </button>
  );
}

function ProgressRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-medium">{value}%</span>
      </div>
      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
        <div className={`${color} h-full rounded-full`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );
}

function RecommendationItem({ topic, desc, onClick }: { topic: string; desc: string; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="flex gap-2 items-start p-2.5 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group w-full"
    >
      <ChevronRight className="text-slate-600 mt-0.5 group-hover:text-indigo-400 transition-colors" size={14} />
      <div>
        <h4 className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">{topic}</h4>
        <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}












// "use client";

// import React, { useState, useEffect } from 'react';
// import { 
//   Search, Sparkles, Flame, Target, BookOpen, 
//   FileText, ArrowRight, TrendingUp, AlertTriangle, 
//   ChevronRight, BrainCircuit, Globe, Book, Layers, CornerDownLeft, Database
// } from 'lucide-react';
// import ReactMarkdown from 'react-markdown';
// import remarkGfm from 'remark-gfm';
// import remarkMath from 'remark-math';
// import rehypeKatex from 'rehype-katex';
// import 'katex/dist/katex.min.css';

// // 🛑 MOCK SUBJECTS: (इसे बाद में अपने बैकएंड/डेटाबेस से फैच कर लेना)
// const AVAILABLE_SUBJECTS = [
//   { id: "18cfdbda-cde1-4d52-937d-feabfab2a95e", name: "Compiler Design" },
//   { id: "12345678-abcd-efgh-ijkl-1234567890ab", name: "DBMS" },
//   { id: "87654321-dcba-hgfe-lkji-ba0987654321", name: "Web Technology" }
// ];

// const MOCK_SOURCES = [
//   { title: "AKTU Quantum - AI Context", type: "RAG Engine", domain: "internal", icon: <Database size={14} className="text-indigo-400" /> },
// ];

// export default function DashboardPage() {
//   // --- UI STATES ---
//   const [searchQuery, setSearchQuery] = useState('');
//   const [submittedQuery, setSubmittedQuery] = useState('');
//   const [isSearching, setIsSearching] = useState(false);
//   const [showResults, setShowResults] = useState(false);
  
//   // --- DATA STATES ---
//   const [activeSubjectId, setActiveSubjectId] = useState(AVAILABLE_SUBJECTS[0].id);
//   const [aiResponse, setAiResponse] = useState('');
//   const [activeProvider, setActiveProvider] = useState('');

//   // 📡 THE BULLETPROOF SSE STREAMING PIPELINE
//   const handleAISearch = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!searchQuery.trim()) return;
    
//     setSubmittedQuery(searchQuery);
//     setIsSearching(true);
//     setShowResults(true);
//     setAiResponse('');
//     setActiveProvider('CONNECTING...');

//     try {
//       const response = await fetch('http://localhost:5000/api/ai/chat/stream', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           prompt: searchQuery,
//           subjectId: activeSubjectId, // 👈 100% Dynamic now!
//           type: "chat",
//           history: []
//         })
//       });

//       if (!response.ok) throw new Error(`Server returned ${response.status}`);

//       const reader = response.body?.getReader();
//       if (!reader) throw new Error("Stream reader failed.");

//       const decoder = new TextDecoder();
//       let remainingBuffer = '';

//       while (true) {
//         const { done, value } = await reader.read();
//         if (done) break;

//         remainingBuffer += decoder.decode(value, { stream: true });
//         const lines = remainingBuffer.split('\n');
//         remainingBuffer = lines.pop() || '';

//         for (const line of lines) {
//           const cleanLine = line.trim();
//           if (!cleanLine) continue;

//           if (cleanLine.startsWith('data: ')) {
//             const rawData = cleanLine.slice(6);
//             if (rawData === '[DONE]') {
//               setIsSearching(false);
//               continue;
//             }

//             try {
//               const parsed = JSON.parse(rawData);
//               if (parsed.error) {
//                 setAiResponse((prev) => prev + `\n\n❌ **Error:** ${parsed.error}`);
//                 setIsSearching(false);
//                 break;
//               }

//               if (parsed.text) {
//                 setAiResponse((prev) => prev + parsed.text);
//               }
//               if (parsed.provider) {
//                 setActiveProvider(parsed.provider);
//               }
//             } catch (err) {
//               // Ignore partial JSON chunks natively
//             }
//           }
//         }
//       }
//     } catch (error: any) {
//       console.error("Stream Crash:", error);
//       setAiResponse(`\n\n❌ **System Failure:** Could not establish pipeline. Is the backend running?`);
//       setIsSearching(false);
//     }
//   };

//   const resetDashboard = () => {
//     setShowResults(false);
//     setSearchQuery('');
//     setAiResponse('');
//   };

//   return (
//     <div className="w-full min-h-screen bg-[#050505] text-white p-6 md:p-10 pt-16 md:pt-20 font-sans">
//       <div className="max-w-4xl mx-auto space-y-10">
        
//         {/* --- DYNAMIC HEADER --- */}
//         {!showResults ? (
//           <div className="flex flex-col items-center text-center space-y-6 my-12 animate-fade-in">
//             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-400">
//               <BrainCircuit size={14} /> AI Syllabus Engine Active
//             </div>
//             <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white">
//               Prepare Smarter with <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 font-bold">AI</span>
//             </h1>
//           </div>
//         ) : (
//           <div className="border-b border-white/10 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
//             <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight flex items-start md:items-center gap-3">
//               <Sparkles className="text-indigo-400 shrink-0 mt-1 md:mt-0" size={22} />
//               <span className="leading-snug">{submittedQuery}</span>
//             </h2>
//             <div className="flex items-center gap-2 shrink-0">
//               <span className="text-[10px] uppercase font-mono tracking-widest bg-white/5 border border-white/10 px-2 py-1 rounded text-slate-400">
//                 Subject ID: {activeSubjectId.split('-')[0]}...
//               </span>
//               <span className={`text-[10px] uppercase font-mono tracking-widest border px-2 py-1 rounded ${activeProvider === 'CACHE_HIT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
//                 {activeProvider || 'INITIALIZING'}
//               </span>
//             </div>
//           </div>
//         )}

//         {/* --- PREMIUM OMNI SEARCH BAR --- */}
//         <div className="w-full max-w-3xl mx-auto relative group z-10">
//           <div className="absolute -inset-0.5 bg-linear-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
//           <form onSubmit={handleAISearch} className="relative bg-[#0d0d0d] border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col md:flex-row md:items-center transition-all focus-within:border-indigo-500/50 gap-2 md:gap-0">
            
//             {/* INLINE SUBJECT SELECTOR (The Pro Move) */}
//             <div className="flex items-center px-2 md:border-r border-white/10 shrink-0">
//               <Book size={16} className="text-slate-500 mr-2" />
//               <select 
//                 value={activeSubjectId}
//                 onChange={(e) => setActiveSubjectId(e.target.value)}
//                 className="bg-transparent text-slate-300 text-sm font-medium outline-none cursor-pointer appearance-none pr-4 hover:text-white transition-colors"
//               >
//                 {AVAILABLE_SUBJECTS.map((sub) => (
//                   <option key={sub.id} value={sub.id} className="bg-[#111] text-slate-200">
//                     {sub.name}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <Search className="hidden md:block text-slate-500 ml-3 shrink-0" size={18} />
//             <input 
//               type="text" 
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               placeholder="Ask anything... (e.g., Explain Section C concepts)"
//               className="w-full bg-transparent border-none outline-none text-slate-200 px-4 py-2 md:py-3 text-sm md:text-base placeholder:text-slate-600 font-light"
//             />
//             <button 
//               type="submit"
//               disabled={isSearching}
//               className="bg-white text-black hover:bg-slate-200 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl px-6 py-2.5 text-xs font-semibold transition-all flex items-center justify-center gap-2 shrink-0 w-full md:w-auto"
//             >
//               {isSearching ? 'Thinking...' : 'Ask'} <CornerDownLeft size={12} />
//             </button>
//           </form>
//         </div>

//         {/* --- DYNAMIC LAYOUT RENDERER --- */}
//         {!showResults ? (
//           <div className="space-y-10 animate-fade-in">
//             {/* POPULAR ACTIONS */}
//             <div className="space-y-4">
//               <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
//                 <Sparkles size={12} /> Popular Actions
//               </h3>
//               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                 <ActionCard icon={<Flame className="text-orange-500" size={18} />} title="Most Repeated" desc="Top AKTU PYQs" />
//                 <ActionCard icon={<Target className="text-emerald-500" size={18} />} title="Predicted Specs" desc="High probability questions" />
//                 <ActionCard icon={<FileText className="text-indigo-400" size={18} />} title="Generate Mock" desc="Full 70-mark pattern" />
//                 <ActionCard icon={<BookOpen className="text-cyan-400" size={18} />} title="Revision Notes" desc="Unit-wise AI summaries" />
//               </div>
//             </div>

//             {/* PROGRESS & RECOMMENDATIONS */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-6 flex flex-col justify-between space-y-6">
//                 <div className="flex justify-between items-start">
//                   <div>
//                     <h3 className="text-lg font-medium text-white mb-1">Your Progress</h3>
//                     <p className="text-xs text-slate-500">Information Technology • Sem 6</p>
//                   </div>
//                   <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
//                     12 Day Streak 🔥
//                   </div>
//                 </div>
//                 <div className="space-y-4">
//                   <ProgressRow label="Overall Exam Readiness" value={68} color="bg-indigo-500" />
//                   <ProgressRow label="Syllabus Coverage" value={42} color="bg-cyan-500" />
//                 </div>
//               </div>

//               <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-6 space-y-4">
//                 <h3 className="text-lg font-medium text-white flex items-center gap-2">
//                   <AlertTriangle className="text-amber-500" size={18} /> AI Recommendations
//                 </h3>
//                 <div className="space-y-3">
//                   <RecommendationItem topic="Bottom-up Parsing" desc="AKTU repeats this 85% of the time." />
//                   <RecommendationItem topic="REST API Optimization" desc="Highly expected 10-marker for Section B." />
//                 </div>
//               </div>
//             </div>
//           </div>
//         ) : (
//           <div className="space-y-6 animate-fade-in">
//             {/* CHECKED SOURCES METADATA */}
//             <div className="space-y-3">
//               <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
//                 <Layers size={12} /> Evaluated Context
//               </h4>
//               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
//                 {MOCK_SOURCES.map((src, idx) => (
//                   <div key={idx} className="bg-[#0d0d0d] border border-white/5 p-3 rounded-xl flex flex-col justify-between space-y-2">
//                     <div className="flex items-center gap-2">
//                       {src.icon}
//                       <span className="text-xs font-medium text-slate-200 truncate">{src.title}</span>
//                     </div>
//                     <span className="text-[10px] text-slate-500">{src.domain} • {src.type}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* THE STREAMING RENDER BLOCK */}
//             <div className="text-slate-300 text-sm md:text-base leading-relaxed p-6 bg-[#090909] border border-white/5 rounded-2xl shadow-inner min-h-50">
//               {aiResponse === '' && isSearching ? (
//                  <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50 py-10">
//                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
//                    <span className="text-xs tracking-widest uppercase">Connecting to AI Core...</span>
//                  </div>
//               ) : (
//                 <div className="prose prose-invert prose-indigo max-w-none prose-pre:bg-[#111] prose-pre:border prose-pre:border-white/10 prose-headings:font-semibold">
//                   <ReactMarkdown 
//                     remarkPlugins={[remarkGfm, remarkMath]}
//                     rehypePlugins={[rehypeKatex]}
//                   >
//                     {aiResponse}
//                   </ReactMarkdown>
//                 </div>
//               )}
//             </div>

//             <button 
//               onClick={resetDashboard}
//               className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors pt-2"
//             >
//               ← Clear & Back to Dashboard
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // --- REUSABLE MICRO-COMPONENTS ---
// function ActionCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
//   return (
//     <button className="flex flex-col text-left p-4 bg-[#0d0d0d] border border-white/5 rounded-xl hover:bg-[#151515] hover:border-white/20 transition-all group">
//       <div className="bg-white/5 p-2.5 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform">{icon}</div>
//       <span className="font-medium text-slate-200 text-sm mb-1">{title}</span>
//       <span className="text-xs text-slate-500 leading-snug">{desc}</span>
//     </button>
//   );
// }

// function ProgressRow({ label, value, color }: { label: string; value: number; color: string }) {
//   return (
//     <div className="space-y-1.5">
//       <div className="flex justify-between text-xs">
//         <span className="text-slate-400">{label}</span>
//         <span className="text-slate-200 font-medium">{value}%</span>
//       </div>
//       <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
//         <div className={`${color} h-full rounded-full`} style={{ width: `${value}%` }}></div>
//       </div>
//     </div>
//   );
// }

// function RecommendationItem({ topic, desc }: { topic: string; desc: string }) {
//   return (
//     <div className="flex gap-2 items-start p-2.5 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
//       <ChevronRight className="text-slate-600 mt-0.5 group-hover:text-indigo-400 transition-colors" size={14} />
//       <div>
//         <h4 className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">{topic}</h4>
//         <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
//       </div>
//     </div>
//   );
// }

