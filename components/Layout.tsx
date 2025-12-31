
import React, { useState } from 'react';
import { UserStatus } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarContent: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, sidebarOpen, setSidebarOpen, sidebarContent }) => {
  const [status, setStatus] = useState<UserStatus>('Online');

  const toggleStatus = () => {
    setStatus(prev => prev === 'Online' ? 'Busy' : 'Online');
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-black border-r-4 border-white transition-transform duration-300 transform
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          <div className="p-8 border-b-4 border-white">
            <h1 className="text-4xl gta-title italic leading-none">
              <span className="text-[#ff00ff]">MAESTRO</span><br/>
              <span className="text-[#00ffff]">AI</span>
            </h1>
            <p className="text-[10px] font-bold text-yellow-400 mt-2 tracking-[0.2em]">MISSION: KNOWLEDGE</p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[#111]">
            {sidebarContent}
          </div>
          
          {/* User Profile Section with Status Toggle */}
          <div className="p-6 border-t-4 border-white bg-black group">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-2 border-[#00ffff] bg-pink-600 flex items-center justify-center font-black text-xl shadow-[4px_4px_0px_#fff]">
                  M
                </div>
                {/* Status Indicator */}
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${status === 'Online' ? 'bg-[#00ff00] animate-pulse' : 'bg-[#facc15]'}`}></div>
              </div>
              <div className="text-sm cursor-pointer select-none" onClick={toggleStatus}>
                <p className="font-black uppercase italic text-pink-500 group-hover:text-white transition-colors">Player 1</p>
                <div className="flex items-center gap-2">
                  <p className={`text-[10px] font-bold uppercase ${status === 'Online' ? 'text-white/50' : 'text-yellow-500 italic'}`}>
                    {status === 'Online' ? 'STATUS: UNSTOPPABLE' : 'STATUS: LAYING LOW'}
                  </p>
                  <i className="fa-solid fa-arrows-rotate text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a] relative">
        <header className="h-20 border-b-4 border-white flex items-center justify-between px-6 md:px-10 bg-black/90 sticky top-0 z-30">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 bg-white text-black hover:bg-[#ff00ff] hover:text-white transition-colors"
            >
              <i className="fa-solid fa-bars-staggered text-xl"></i>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-[#00ff00] animate-pulse border border-white"></div>
              <h2 className="text-lg font-black italic uppercase tracking-tighter">Live Intel Feed</h2>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-6">
             <div className="text-right">
                <p className="text-[10px] font-bold text-[#ff00ff]">LOCATION</p>
                <p className="text-sm font-black uppercase">Study City</p>
             </div>
             <div className="w-[2px] h-8 bg-white/20"></div>
             <div className="text-right">
                <p className="text-[10px] font-bold text-[#00ffff]">STREAK</p>
                <p className="text-sm font-black uppercase">5 Missions</p>
             </div>
          </div>
        </header>
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
