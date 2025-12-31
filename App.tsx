
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, QuickTool, StudySession, QuizData, CrewMember, SharedMission, CrewTask, TaskStatus, SuggestedAction } from './types';
import { QUICK_TOOLS } from './constants';
import { geminiService } from './services/geminiService';
import Layout from './components/Layout';
import ChatMessage from './components/ChatMessage';

// Removed redundant and conflicting redeclaration of aistudio property.

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const MOCK_CREW: CrewMember[] = [
  { id: '1', name: 'Lara_Croft_Study', status: 'Online', avatarColor: '#ff00ff', reputation: 450 },
  { id: '2', name: 'Niko_Bellic', status: 'Online', avatarColor: '#00ffff', reputation: 1200 },
  { id: '3', name: 'Big_Smoke', status: 'Busy', avatarColor: '#facc15', reputation: 800 },
];

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Moin Soldat. Ich bin Maestro. In dieser Stadt gibt es zwei Arten von Leuten: Die, die Hausaufgaben machen, und die, die im Leben "Wasted" gehen. Ich hab das Intel für deine Missionen. Was steht an? Knacken wir Mathe oder infiltrieren wir Geschichte? Schieß los!',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [respect, setRespect] = useState(30); // Initial respect percentage
  const [crewTasks, setCrewTasks] = useState<CrewTask[]>([]);
  const [taskFilter, setTaskFilter] = useState<TaskStatus | 'All'>('All');
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', assigneeId: MOCK_CREW[0].id });
  // Add state for mandatory API key selection
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mandatory check for API key before accessing the app as required for Veo models
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } catch (err) {
        console.error("Error checking API key:", err);
        setHasApiKey(false);
      }
    };
    checkApiKey();
  }, []);

  // Calculate task form progress
  const getTaskFormProgress = () => {
    let filled = 0;
    if (newTask.title.trim()) filled++;
    if (newTask.description.trim()) filled++;
    if (newTask.assigneeId) filled++;
    return (filled / 3) * 100;
  };

  const isTaskFormComplete = getTaskFormProgress() === 100;

  const handleSendMessage = useCallback(async (content: string, imageUrl?: string) => {
    if (!content.trim() && !imageUrl) return;

    const userMessage: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: content.trim(), 
      timestamp: new Date(), 
      imageUrl: imageUrl || undefined 
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setSelectedImage(null);
    setIsTyping(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

    try {
      const lower = content.toLowerCase();
      
      if (lower.startsWith('generiere einen video-clip von:')) {
        const prompt = content.replace(/generiere einen video-clip von:/i, '').trim();
        const videoUrl = await geminiService.generateVideo(prompt, (msg) => {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: msg } : m));
        });
        setMessages(prev => prev.map(msg => msg.id === assistantId ? { 
          ...msg, 
          content: "Hier ist dein Video-Intel, Boss. Zielobjekt erfasst. Schau dir das an, bevor die Cops kommen.", 
          videoUrl 
        } : msg));
      } else if (lower.startsWith('generiere ein bild von:')) {
        const prompt = content.replace(/generiere ein bild von:/i, '').trim();
        const generatedImageUrl = await geminiService.generateImage(prompt);
        setMessages(prev => prev.map(msg => msg.id === assistantId ? { 
          ...msg, 
          content: "Visual Intel bereit. Sieht scharf aus. Damit knackst du jeden Heist.", 
          imageUrl: generatedImageUrl 
        } : msg));
      } else if (lower.includes('quiz') || lower.includes('fragen')) {
        const quiz = await geminiService.generateQuiz(messages.map(m => m.content).join(' ') + ' ' + content, imageUrl);
        setMessages(prev => prev.map(msg => msg.id === assistantId ? { 
          ...msg, 
          content: "Mission Briefing: Test bereit. Mal sehen, ob du Eier in der Hose hast oder nur ein kleiner Fisch bist.", 
          quiz 
        } : msg));
        setRespect(prev => Math.min(100, prev + 5)); 
      } else {
        let fullContent = '';
        const stream = geminiService.sendMessageStream([...messages, userMessage], imageUrl || undefined);
        
        for await (const chunk of stream) {
          fullContent += chunk;
          setMessages(prev => prev.map(msg => msg.id === assistantId ? { ...msg, content: fullContent } : msg));
        }

        if (fullContent.includes('---')) {
          const parts = fullContent.split('---');
          const textPart = parts[0].trim();
          const jsonPart = parts[1].trim();
          try {
            const suggestions = JSON.parse(jsonPart) as SuggestedAction[];
            setMessages(prev => prev.map(msg => msg.id === assistantId ? { 
              ...msg, 
              content: textPart, 
              suggestions 
            } : msg));
          } catch (e) {
            console.warn("Could not parse suggestions", e);
          }
        }
      }
    } catch (e: any) {
      if (e?.message?.includes("Requested entity was not found.")) {
        setHasApiKey(false);
      }
      setMessages(prev => prev.map(msg => msg.id === assistantId ? { ...msg, content: "Funkstörung! Die Cops stören unser Signal. Versuchs nochmal, Soldat." } : msg));
    } finally { 
      setIsTyping(false); 
    }
  }, [messages]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTaskFormComplete) return;
    const task: CrewTask = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      assigneeId: newTask.assigneeId,
      status: 'To-Do',
      timestamp: new Date()
    };
    setCrewTasks(prev => [task, ...prev]);
    setNewTask({ title: '', description: '', assigneeId: MOCK_CREW.find(m => m.status === 'Online')?.id || MOCK_CREW[0].id });
    setIsTaskFormOpen(false);
  };

  const updateTaskStatus = (id: string, currentStatus: TaskStatus) => {
    const statuses: TaskStatus[] = ['To-Do', 'In Progress', 'Done'];
    const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
    setCrewTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));
  };

  const filteredTasks = crewTasks
    .filter(t => taskFilter === 'All' || t.status === taskFilter)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (hasApiKey === false) {
    return (
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-10 text-center text-white">
        <h1 className="text-6xl gta-title italic text-[#ff00ff] mb-4">ACCESS DENIED</h1>
        <p className="text-xl font-black mb-8 uppercase italic border-y-4 border-white py-4 px-8">Du brauchst eine verifizierte API-Key-Lizenz für Video-Intel, Boss.</p>
        <button 
          onClick={async () => {
            await (window as any).aistudio.openSelectKey();
            setHasApiKey(true);
          }}
          className="bg-[#00ff00] text-black font-black px-12 py-6 border-4 border-black hover:bg-white transition-all uppercase italic shadow-[10px_10px_0px_#ff00ff] text-2xl active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          Key auswählen
        </button>
        <div className="mt-12 text-sm">
          <p className="text-white/40 mb-2 uppercase font-bold tracking-widest">Support Documentation</p>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-[#00ffff] hover:underline uppercase font-black italic">Billing & Setup Info</a>
        </div>
      </div>
    );
  }

  if (hasApiKey === null) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#ff00ff] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#ff00ff] font-black uppercase italic animate-pulse">Checking Credentials...</p>
      </div>
    );
  }

  const sidebarContent = (
    <div className="space-y-10 pb-10">
      <div className="px-2">
        <div className="flex justify-between items-center mb-2">
           <span className="text-[10px] font-black text-white uppercase italic">Respect Level</span>
           <span className="text-[10px] font-black text-[#00ff00] uppercase italic">{respect}%</span>
        </div>
        <div className="h-4 bg-zinc-900 border-2 border-white p-0.5">
           <div className="h-full bg-[#00ff00] transition-all duration-1000" style={{ width: `${respect}%` }}></div>
        </div>
      </div>

      <button onClick={() => setMessages([{ id: 'welcome', role: 'assistant', content: 'Neue Mission gestartet, Boss. Zeit, die Stadt zu übernehmen.', timestamp: new Date() }])} className="w-full flex items-center justify-center gap-3 p-4 bg-[#00ff00] text-black font-black uppercase italic border-4 border-black hover:bg-white transition-all shadow-[6px_6px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1">
        <i className="fa-solid fa-plus text-xl"></i> New Mission
      </button>

      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-[#00ffff] uppercase tracking-[0.3em] px-2 italic">Crew Hub</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center px-2">
            <p className="text-[9px] font-bold text-white/40 uppercase">Assigned Missions</p>
            <button onClick={() => setIsTaskFormOpen(!isTaskFormOpen)} className="text-[9px] font-black text-[#00ff00] uppercase hover:text-white transition-colors">
              {isTaskFormOpen ? 'Cancel' : '+ Assign'}
            </button>
          </div>

          {isTaskFormOpen && (
            <form onSubmit={handleCreateTask} className="p-3 bg-zinc-900 border-2 border-[#00ff00] animate-in slide-in-from-top-2">
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[8px] font-black text-[#00ffff] uppercase italic">Mission Intel</span>
                  <span className={`text-[8px] font-black uppercase italic ${isTaskFormComplete ? 'text-[#00ff00]' : 'text-[#00ffff]'}`}>
                    {isTaskFormComplete ? 'Ready to Deploy' : `${Math.round(getTaskFormProgress())}%`}
                  </span>
                </div>
                <div className="h-1 bg-black border border-white/20">
                  <div 
                    className={`h-full transition-all duration-300 ${isTaskFormComplete ? 'bg-[#00ff00]' : 'bg-[#00ffff]'}`} 
                    style={{ width: `${getTaskFormProgress()}%` }}
                  ></div>
                </div>
              </div>
              
              <input 
                value={newTask.title} 
                onChange={e => setNewTask({...newTask, title: e.target.value})} 
                placeholder="MISSION TITLE" 
                className="w-full bg-black border-none text-[10px] font-bold p-2 mb-2 text-white focus:ring-1 focus:ring-[#00ffff]" 
              />
              <textarea 
                value={newTask.description} 
                onChange={e => setNewTask({...newTask, description: e.target.value})} 
                placeholder="DESCRIPTION" 
                className="w-full bg-black border-none text-[10px] font-bold p-2 mb-2 text-white h-12 focus:ring-1 focus:ring-[#00ffff]" 
              />
              
              <div className="relative mb-3">
                <select 
                  value={newTask.assigneeId} 
                  onChange={e => setNewTask({...newTask, assigneeId: e.target.value})} 
                  className="w-full bg-black border-none text-[10px] font-bold p-2 text-white focus:ring-1 focus:ring-[#00ffff] appearance-none"
                >
                  {MOCK_CREW.map(m => (
                    <option key={m.id} value={m.id} disabled={m.status === 'Busy'}>
                      {m.status === 'Busy' ? `[BUSY] ${m.name}` : m.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-[8px] text-white/30">
                  <i className="fa-solid fa-chevron-down"></i>
                </div>
              </div>

              <div className="flex justify-center h-12 items-center overflow-visible">
                <button 
                  type="submit" 
                  disabled={!isTaskFormComplete}
                  className={`gta-serif text-[11px] py-2.5 uppercase border-2 transition-all duration-300 flex items-center justify-center gap-2
                    ${isTaskFormComplete 
                      ? 'bg-[#ff00ff] text-white border-white hover:bg-[#00ffff] hover:text-black w-1/2 hover:w-full shadow-[4px_4px_0px_#000]' 
                      : 'bg-zinc-800 text-white/30 border-white/10 cursor-not-allowed grayscale w-full'
                    }`}
                >
                  {!isTaskFormComplete && <i className="fa-solid fa-lock text-[8px]"></i>}
                  <span className="whitespace-nowrap">Issue Orders</span>
                </button>
              </div>
            </form>
          )}

          <div className="flex gap-2 px-2 overflow-x-auto pb-2 no-scrollbar">
            {(['All', 'To-Do', 'In Progress', 'Done'] as const).map(f => (
              <button key={f} onClick={() => setTaskFilter(f)} className={`whitespace-nowrap px-2 py-1 text-[8px] font-black uppercase border-2 transition-all ${taskFilter === f ? 'bg-white text-black border-white' : 'border-white/20 text-white/40 hover:border-white/50'}`}>{f}</button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <p className="text-[8px] text-center text-white/20 py-4 italic uppercase">Keine Aufträge in der Liste, Boss.</p>
            ) : filteredTasks.map(task => (
              <div key={task.id} className="p-3 bg-zinc-900 border border-white/10 group hover:border-[#ff00ff] transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-[10px] font-black text-white uppercase italic truncate">{task.title}</p>
                  <button onClick={() => updateTaskStatus(task.id, task.status)} className={`text-[8px] px-1 font-black uppercase border transition-colors ${task.status === 'Done' ? 'text-green-500 border-green-500' : task.status === 'In Progress' ? 'text-blue-400 border-blue-400' : 'text-yellow-500 border-yellow-500'}`}>
                    {task.status}
                  </button>
                </div>
                <p className="text-[8px] text-white/40 uppercase mb-2 line-clamp-2">{task.description}</p>
                <div className="flex justify-between items-center text-[8px] font-bold text-[#00ffff]">
                  <span className="uppercase italic">Assignee: {MOCK_CREW.find(m => m.id === task.assigneeId)?.name}</span>
                  <button onClick={() => setCrewTasks(prev => prev.filter(t => t.id !== task.id))} className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"><i className="fa-solid fa-trash-can"></i></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[9px] font-bold text-white/40 uppercase px-2">Soldiers Online</p>
          {MOCK_CREW.map(member => (
            <div key={member.id} className="flex items-center gap-3 p-2 bg-black border border-white/10 rounded">
              <div className="w-8 h-8 rounded-full border border-white flex items-center justify-center text-[10px] font-black" style={{ backgroundColor: member.avatarColor }}>{member.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase italic truncate">{member.name}</p>
                <p className="text-[8px] font-bold text-white/30 uppercase">{member.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-[#ff00ff] uppercase tracking-[0.3em] px-2 italic">Quick Tools</h3>
        <div className="grid gap-2">
          {QUICK_TOOLS.map(tool => (
            <button key={tool.id} onClick={() => handleSendMessage(tool.prompt)} className="flex items-center gap-3 p-3 bg-black border-2 border-white hover:border-[#00ffff] transition-all text-left group">
              <i className={`fa-solid ${tool.icon} text-sm`}></i>
              <span className="text-[10px] font-black uppercase italic">{tool.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Layout sidebarOpen={isSidebarOpen} setSidebarOpen={setIsSidebarOpen} sidebarContent={sidebarContent}>
      <div className="flex flex-col h-full relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 space-y-8">
          <div className="max-w-4xl mx-auto">
            {messages.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                onSuggestionClick={(prompt) => handleSendMessage(prompt)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        <div className="p-6 bg-black border-t-4 border-white z-20">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue, selectedImage || undefined); }} className="relative">
              <div className="flex items-center gap-3 bg-[#111] border-4 border-white p-3 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] focus-within:shadow-[8px_8px_0px_#00ffff] transition-all duration-300">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-12 h-12 flex items-center justify-center bg-white text-black hover:bg-[#ff00ff] hover:text-white border-2 border-black"><i className="fa-solid fa-camera text-xl"></i></button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Befehl eingeben..." className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-white/20 font-bold text-lg py-2 uppercase italic" disabled={isTyping} />
                <button type="submit" disabled={(!inputValue.trim() && !selectedImage) || isTyping} className="w-14 h-14 bg-white hover:bg-[#00ffff] text-black flex items-center justify-center transition-all border-2 border-black">
                  {isTyping ? <i className="fa-solid fa-skull fa-spin text-xl"></i> : <i className="fa-solid fa-bolt text-2xl"></i>}
                </button>
              </div>
              {selectedImage && (
                <div className="mt-4 flex gap-4">
                  <div className="relative border-2 border-[#ff00ff]">
                    <img src={selectedImage} className="h-20 w-20 object-cover" />
                    <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-600 w-5 h-5 text-[10px] flex items-center justify-center border border-white">X</button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;