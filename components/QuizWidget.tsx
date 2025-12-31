
import React, { useState } from 'react';
import { QuizData } from '../types';

interface QuizWidgetProps {
  data: QuizData;
}

const QuizWidget: React.FC<QuizWidgetProps> = ({ data }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  const currentQuestion = data.questions[currentQuestionIndex];

  const handleOptionClick = (index: number) => {
    if (showFeedback) return;
    setSelectedOption(index);
    setShowFeedback(true);
    
    if (index === currentQuestion.correctIndex) {
      setScore(prev => prev + 1);
    }

    // Verzögerung für die Erklärung, um dem visuellen Feedback (Bordern) Raum zu geben
    setTimeout(() => {
      setShowExplanation(true);
    }, 700);
  };

  const handleNext = () => {
    if (currentQuestionIndex < data.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowFeedback(false);
      setShowExplanation(false);
    } else {
      setQuizComplete(true);
    }
  };

  if (quizComplete) {
    const passed = score >= data.questions.length / 2;
    return (
      <div className="bg-black border-4 border-white p-6 text-center animate-in fade-in zoom-in duration-500">
        <h3 className={`text-5xl gta-title italic mb-2 ${passed ? 'text-[#00ff00]' : 'text-[#ff0000]'}`}>
          {passed ? 'MISSION PASSED' : 'MISSION FAILED'}
        </h3>
        <p className="text-2xl font-black mb-4 uppercase text-white">RESPECT +{score * 100}</p>
        <div className="bg-white text-black p-4 font-black mb-6 text-xl">
          SCORE: {score} / {data.questions.length}
        </div>
        <button 
          onClick={() => {
            setCurrentQuestionIndex(0);
            setSelectedOption(null);
            setShowFeedback(false);
            setShowExplanation(false);
            setScore(0);
            setQuizComplete(false);
          }}
          className="w-full bg-[#00ffff] text-black font-black py-4 border-4 border-black hover:bg-white transition-colors uppercase italic shadow-[6px_6px_0px_#ff00ff] active:shadow-none active:translate-x-1 active:translate-y-1"
        >
          Nochmal versuchen, Boss
        </button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border-4 border-white p-6 shadow-[12px_12px_0px_#ff00ff] relative overflow-hidden">
      <div className="flex justify-between items-center mb-6 relative z-10">
        <span className="bg-yellow-400 text-black px-3 py-1 text-xs font-black uppercase italic">Objective {currentQuestionIndex + 1}</span>
        <span className="text-xs font-bold text-white/50 tracking-widest">{currentQuestionIndex + 1} / {data.questions.length}</span>
      </div>
      
      <h4 className="text-2xl font-black uppercase italic mb-8 leading-tight text-white relative z-10">{currentQuestion.question}</h4>
      
      <div className="space-y-4 mb-8 relative z-10">
        {currentQuestion.options.map((option, idx) => {
          const isCorrect = idx === currentQuestion.correctIndex;
          const isSelected = idx === selectedOption;
          
          let btnClass = "w-full text-left p-4 border-4 font-black uppercase italic transition-all duration-300 flex items-center relative ";
          
          if (showFeedback) {
            if (isCorrect) {
              btnClass += "bg-[#00ff00] text-black border-[#00ff00] scale-[1.02] z-20 shadow-[0_0_20px_rgba(0,255,0,0.4)]";
            } else if (isSelected) {
              btnClass += "bg-[#ff0000] text-white border-[#ff0000] z-20";
            } else {
              btnClass += "bg-black text-white/20 border-white/5 opacity-50";
            }
          } else {
            btnClass += "bg-black text-white border-white hover:bg-white hover:text-black hover:-translate-y-1";
          }

          return (
            <button 
              key={idx} 
              onClick={() => handleOptionClick(idx)}
              disabled={showFeedback}
              className={btnClass}
            >
              <span className={`mr-4 text-lg ${showFeedback && !isCorrect && !isSelected ? 'opacity-0' : 'opacity-40'}`}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1">{option}</span>
              
              {showFeedback && isCorrect && (
                <span className="absolute right-4 animate-bounce">
                  <i className="fa-solid fa-check-double text-xl"></i>
                </span>
              )}
              {showFeedback && isSelected && !isCorrect && (
                <span className="absolute right-4">
                  <i className="fa-solid fa-skull text-xl"></i>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="animate-in slide-in-from-bottom-8 fade-in duration-500 relative z-10">
          <div className={`p-5 border-4 border-white mb-6 ${selectedOption === currentQuestion.correctIndex ? 'bg-[#00ff00]/10 border-[#00ff00]/50' : 'bg-[#ff0000]/10 border-[#ff0000]/50'}`}>
             <div className="flex items-center gap-3 mb-2">
                <i className={`fa-solid ${selectedOption === currentQuestion.correctIndex ? 'fa-bullseye text-[#00ff00]' : 'fa-bolt text-[#ff0000]'}`}></i>
                <p className="text-xs font-black uppercase italic tracking-widest">
                  {selectedOption === currentQuestion.correctIndex ? 'Direkt ins Schwarze, Boss!' : 'Wasted! Das war daneben.'}
                </p>
             </div>
             <p className="text-sm font-bold text-white/90 leading-snug">{currentQuestion.explanation}</p>
          </div>
          <button 
            onClick={handleNext}
            className="w-full bg-white text-black font-black py-4 border-4 border-black hover:bg-[#ff00ff] hover:text-white transition-all uppercase italic shadow-[6_6_0px_#000] active:translate-y-1 active:shadow-none"
          >
            Nächstes Ziel infiltrieren <i className="fa-solid fa-arrow-right ml-2"></i>
          </button>
        </div>
      )}

      {/* Background Decor */}
      <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none">
        <i className="fa-solid fa-skull-crossbones text-[200px] text-white rotate-12"></i>
      </div>
    </div>
  );
};

export default QuizWidget;
