import React from 'react';
import { LayoutDashboard, Compass, FileText, TrendingUp, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-white/10 hidden md:flex flex-col justify-between p-4 bg-background z-10 h-screen sticky top-0">
      <div>
        <div className="flex items-center gap-2 px-2 mb-8 mt-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-tight text-white text-lg">ExamPrep AI</span>
        </div>
        
        <nav className="space-y-1">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" href="/" active />
          <NavItem icon={<Compass size={18} />} label="Explorer" href="/explorer" />
          <NavItem icon={<FileText size={18} />} label="Mock Tests" href="/exam" />
          <NavItem icon={<TrendingUp size={18} />} label="Analytics" href="/analytics" />
        </nav>
      </div>
      
      <div className="px-2 py-4 border-t border-white/10">
        <NavItem icon={<Settings size={18} />} label="Settings" href="/settings" />
        <div className="mt-4 flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700"></div>
          <div className="text-xs">
            <p className="font-medium text-slate-200">Abhishek P.</p>
            <p className="text-slate-500">B.Tech IT • Sem 6</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn(
      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
      active ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
    )}>
      {icon}
      {label}
    </Link>
  );
}