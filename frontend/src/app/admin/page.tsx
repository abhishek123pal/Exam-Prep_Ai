"use client";

import React, { useState } from 'react';
import { BookOpen, FileText, Layers, PlusCircle, CheckCircle2 } from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'subject' | 'syllabus' | 'pyq'>('subject');
  const [status, setStatus] = useState({ success: false, message: '' });

  // 1. Subject Form State
  const [subjectForm, setSubjectForm] = useState({ code: '', name: '', semester: '6', branch: 'IT' });
  // 2. Syllabus Form State
  const [syllabusForm, setSyllabusForm] = useState({ subjectId: '', unitNumber: '1', title: '', topics: '' });
  // 3. PYQ Form State
  const [pyqForm, setPyqForm] = useState({ subjectId: '', year: '2026', examType: 'Regular', fileUrl: '', content: '' });

  const showNotification = (msg: string, isSuccess = true) => {
    setStatus({ success: isSuccess, message: msg });
    setTimeout(() => setStatus({ success: false, message: '' }), 4000);
  };

  const handleAdminSubmit = async (e: React.FormEvent, endpoint: string, bodyData: any) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/api/admin/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });
      const result = await res.json();
      if (result.success) {
        showNotification(`${endpoint.toUpperCase()} added successfully! 🎉`);
      } else {
        showNotification(`Error: ${result.error}`, false);
      }
    } catch (err: any) {
      showNotification(`Backend Connection Failed!`, false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background p-6 md:p-10 pt-16 md:pt-24">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <PlusCircle className="text-indigo-400" /> ExamPrep AI Control Panel
          </h1>
          <p className="text-sm text-slate-500">Seed university subjects, curriculum units, and raw PYQ contexts directly into Supabase.</p>
        </div>

        {/* Status Toast */}
        {status.message && (
          <div className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-2 animate-fade-in ${
            status.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <CheckCircle2 size={16} /> {status.message}
          </div>
        )}

        {/* Admin Navigation Tabs */}
        <div className="flex border-b border-white/5 gap-2">
          <TabButton active={activeTab === 'subject'} onClick={() => setActiveTab('subject')} icon={<BookOpen size={14} />} label="Add Subject" />
          <TabButton active={activeTab === 'syllabus'} onClick={() => setActiveTab('syllabus')} icon={<Layers size={14} />} label="Populate Syllabus" />
          <TabButton active={activeTab === 'pyq'} onClick={() => setActiveTab('pyq')} icon={<FileText size={14} />} label="Upload PYQ Context" />
        </div>

        {/* Dynamic Forms Container */}
        <div className="bg-surface border border-white/5 rounded-2xl p-6 shadow-xl">
          
          {/* TAB 1: ADD SUBJECT */}
          {activeTab === 'subject' && (
            <form onSubmit={(e) => handleAdminSubmit(e, 'subjects', subjectForm)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Subject Code" placeholder="e.g., KIT601" value={subjectForm.code} onChange={(v) => setSubjectForm({...subjectForm, code: v})} />
                <InputGroup label="Subject Name" placeholder="e.g., Computer Networks" value={subjectForm.name} onChange={(v) => setSubjectForm({...subjectForm, name: v})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Semester" placeholder="6" type="number" value={subjectForm.semester} onChange={(v) => setSubjectForm({...subjectForm, semester: v})} />
                <InputGroup label="Branch" placeholder="IT or CS" value={subjectForm.branch} onChange={(v) => setSubjectForm({...subjectForm, branch: v})} />
              </div>
              <SubmitButton label="Publish Subject to Database" />
            </form>
          )}

          {/* TAB 2: POPULATE SYLLABUS */}
          {activeTab === 'syllabus' && (
            <form onSubmit={(e) => handleAdminSubmit(e, 'syllabus', syllabusForm)} className="space-y-4">
              <InputGroup label="Subject UUID (From Database)" placeholder="Paste Subject ID here..." value={syllabusForm.subjectId} onChange={(v) => setSyllabusForm({...syllabusForm, subjectId: v})} />
              <div className="grid grid-cols-3 gap-4 items-end">
                <div className="col-span-1">
                  <InputGroup label="Unit Number" placeholder="1" type="number" value={syllabusForm.unitNumber} onChange={(v) => setSyllabusForm({...syllabusForm, unitNumber: v})} />
                </div>
                <div className="col-span-2">
                  <InputGroup label="Unit Title" placeholder="e.g., Transport Layer Protocols" value={syllabusForm.title} onChange={(v) => setSyllabusForm({...syllabusForm, title: v})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Unit Topics (Comma Separated)</label>
                <textarea 
                  value={syllabusForm.topics}
                  onChange={(e) => setSyllabusForm({...syllabusForm, topics: e.target.value})}
                  placeholder="TCP, UDP, Congestion Control, 3-Way Handshake"
                  className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm text-slate-200 outline-none focus:border-primary/50 h-24 resize-none font-light"
                />
              </div>
              <SubmitButton label="Inject Syllabus Node" />
            </form>
          )}

          {/* TAB 3: UPLOAD PYQ CONTEXT */}
          {activeTab === 'pyq' && (
            <form onSubmit={(e) => handleAdminSubmit(e, 'pyq', pyqForm)} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <InputGroup label="Subject UUID" placeholder="Paste Subject ID..." value={pyqForm.subjectId} onChange={(v) => setPyqForm({...pyqForm, subjectId: v})} />
                </div>
                <InputGroup label="Year" placeholder="2026" type="number" value={pyqForm.year} onChange={(v) => setPyqForm({...pyqForm, year: v})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Exam Type" placeholder="Regular / CarryOver" value={pyqForm.examType} onChange={(v) => setPyqForm({...pyqForm, examType: v})} />
                <InputGroup label="Material/PDF URL" placeholder="Cloudinary S3 Link..." value={pyqForm.fileUrl} onChange={(v) => setPyqForm({...pyqForm, fileUrl: v})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Raw Paper Text (For AI Embeddings Context)</label>
                <textarea 
                  value={pyqForm.content}
                  onChange={(e) => setPyqForm({...pyqForm, content: e.target.value})}
                  placeholder="Paste the full parsed text contents of the question paper here..."
                  className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm text-slate-200 outline-none focus:border-primary/50 h-32 resize-none font-light"
                />
              </div>
              <SubmitButton label="Sync Study Material with RAG Engine" />
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

// --- Reusable Internal Components ---
function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
        active ? 'border-primary text-indigo-400 bg-white/2' : 'border-transparent text-slate-500 hover:text-slate-300'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function InputGroup({ label, placeholder, value, onChange, type = "text" }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="w-full space-y-2">
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-primary/50 font-light"
      />
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  return (
    <button type="submit" className="w-full bg-white text-black hover:bg-slate-200 font-semibold text-sm py-3 rounded-xl transition-all shadow-lg mt-2">
      {label}
    </button>
  );
}