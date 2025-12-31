
import React, { useState } from 'react';
import { Message } from '../types';
import QuizWidget from './QuizWidget';
import { geminiService } from '../services/geminiService';

interface ChatMessageProps {
  message: Message;
  onSuggestionClick: (prompt: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSuggestionClick }) => {
  const isAssistant = message.role === 'assistant';
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeech = async () => {
    if (!message.content || isPlaying) return;
    setIsPlaying(true);
    try {
      await geminiService.generateSpeech(message.content);
    } catch (error) {
      console.error("TTS failed:", error);
    } finally {
      setIsPlaying(false);
    }
  };

  const renderContent = (content: string) => {
    // Basic Terminal formatting for code-like sections or Phasen
    const lines = content.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('```') || line.startsWith('Phase')) {
        return <div key={i} className="bg-black/60 font-mono text-green-400 p-3 my-2 border-l-4 border-green-500 text-xs">{line}</div>;
      }
      return <p key={i} className="mb-2 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className={`flex w-full mb-10 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[95%] md:max-w-[85%] ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex-shrink-0 w-12 h-12 border-4 border-white flex items-center justify-center shadow-[4px_4px_0px_#000] ${
          isAssistant ? 'bg-[#ff00ff] text-white mr-4' : 'bg-[#00ffff] text-black ml-4'
        }`}>
          {isAssistant ? <i className="fa-solid fa-hat-cowboy"></i> : <i className="fa-solid fa-user-secret"></i>}
        </div>
        
        <div className="flex flex-col">
          <div className={`p-6 border-4 border-white shadow-[10px_10px_0px_rgba(0,0,0,0.4)] relative group ${
            isAssistant ? 'bg-[#111] text-white' : 'bg-white text-black'
          }`}>
            {isAssistant && message.content && (
              <button 
                onClick={handleSpeech}
                disabled={isPlaying}
                className="absolute -top-3 -right-3 w-8 h-8 bg-black border-2 border-[#00ffff] text-[#00ffff] flex items-center justify-center hover:bg-[#00ffff] hover:text-black transition-all"
              >
                <i className={`fa-solid ${isPlaying ? 'fa-volume-high animate-pulse' : 'fa-volume-low'}`}></i>
              </button>
            )}

            {message.imageUrl && (
              <div className="mb-4 border-4 border-black bg-black">
                <img src={message.imageUrl} className="w-full max-h-80 object-contain" alt="Visual Intel" />
              </div>
            )}

            {message.videoUrl && (
              <div className="mb-4 border-4 border-black bg-black aspect-video overflow-hidden">
                <video src={message.videoUrl} controls className="w-full h-full object-contain" />
              </div>
            )}

            <div className="font-bold text-sm md:text-base tracking-tight italic">
              {renderContent(message.content)}
            </div>

            {message.quiz && <div className="mt-8"><QuizWidget data={message.quiz} /></div>}
            
            {isAssistant && !message.content && !message.quiz && !message.videoUrl && !message.imageUrl && (
              <div className="flex gap-2 p-2">
                <div className="w-2 h-2 bg-[#ff00ff] animate-ping"></div>
                <div className="w-2 h-2 bg-[#00ffff] animate-ping delay-75"></div>
              </div>
            )}
          </div>

          {/* Suggested Actions */}
          {isAssistant && message.suggestions && message.suggestions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {message.suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => onSuggestionClick(s.prompt)}
                  className="bg-black border-2 border-[#ff00ff] text-white text-[10px] font-black px-3 py-2 uppercase italic hover:bg-[#ff00ff] hover:text-black transition-all flex items-center gap-2"
                >
                  <i className={`fa-solid ${s.icon}`}></i>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <div className={`mt-2 flex items-center gap-3 ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
             <span className="text-[10px] font-black uppercase text-white/50">{isAssistant ? 'MAESTRO' : 'SOLDAT'}</span>
             <span className="text-[10px] text-white/20 font-bold">{message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
