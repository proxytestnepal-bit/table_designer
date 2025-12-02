
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TableData, AnimationConfig, Theme, AnimationStyle, Layout } from '../types';
import { clsx } from 'clsx';
import { PresentationAudio } from '../utils/audioSynth';

interface TablePreviewProps {
  data: TableData;
  config: AnimationConfig;
  isPlaying: boolean;
  onAnimationComplete: () => void;
  isFullscreen: boolean;
  voicePcm: string | null;
}

const THEME_STYLES: Record<Theme, {
  fontMain: string;
  fontHeader: string;
  bgClass: string;
  textSubject: string;
  textHeader: string;
  textValue: string;
  lineGradient: string;
  progressGradient: string;
}> = {
  [Theme.COSMIC]: {
    fontMain: 'font-sans',
    fontHeader: 'font-sans',
    bgClass: 'bg-gradient-to-br from-slate-950 to-slate-900',
    textSubject: 'text-white',
    textHeader: 'text-slate-400',
    textValue: 'text-yellow-100',
    lineGradient: 'from-purple-500 to-blue-500',
    progressGradient: 'bg-gradient-to-r from-blue-600 to-purple-600'
  },
  [Theme.NEON]: {
    fontMain: 'font-mono',
    fontHeader: 'font-mono',
    bgClass: 'bg-black',
    textSubject: 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]',
    textHeader: 'text-pink-500',
    textValue: 'text-white',
    lineGradient: 'from-green-500 to-pink-500',
    progressGradient: 'bg-gradient-to-r from-green-500 to-pink-500'
  },
  [Theme.LUXE]: {
    fontMain: 'font-serif',
    fontHeader: 'font-sans',
    bgClass: 'bg-neutral-950',
    textSubject: 'text-amber-100',
    textHeader: 'text-stone-500',
    textValue: 'text-amber-400',
    lineGradient: 'from-amber-600 to-amber-700',
    progressGradient: 'bg-gradient-to-r from-amber-700 to-amber-500'
  },
  [Theme.GLASS]: {
    fontMain: 'font-sans',
    fontHeader: 'font-sans',
    bgClass: 'bg-slate-900',
    textSubject: 'text-white',
    textHeader: 'text-cyan-400',
    textValue: 'text-cyan-50',
    lineGradient: 'from-cyan-500 to-blue-500',
    progressGradient: 'bg-gradient-to-r from-cyan-500 to-blue-500'
  }
};

export const TablePreview: React.FC<TablePreviewProps> = ({ 
  data, 
  config, 
  isPlaying, 
  onAnimationComplete,
  isFullscreen,
  voicePcm
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const themeStyle = THEME_STYLES[config.theme];
  
  // Calculate total steps: each cell in the data grid (excluding the subject column if needed, but usually we iterate rows)
  // Logic: We iterate through Data Rows.
  // For each row, we show attributes.
  const numCols = data.columns.length;
  // If we have columns [Subject, Attr1, Attr2], we have 2 attributes per row to show.
  const numAttributes = Math.max(1, numCols - 1);
  const totalSteps = data.data.length * numAttributes;

  const audioSynth = useMemo(() => new PresentationAudio(), []);

  // Audio & Timer Logic
  useEffect(() => {
    let timer: number;
    let startTime: number;
    
    if (isPlaying) {
      if (currentIndex === 0) {
        audioSynth.start();
        if (voicePcm) {
          audioSynth.playSpeech(voicePcm);
        }
      }

      startTime = Date.now();
      const stepDuration = config.durationPerItem * 1000;
      
      const nextStep = () => {
         const now = Date.now();
         const elapsed = now - startTime;
         const nextIdx = Math.floor(elapsed / stepDuration);
         
         if (nextIdx > currentIndex && nextIdx < totalSteps) {
            setCurrentIndex(nextIdx);
            audioSynth.triggerTransition();
         }

         if (nextIdx >= totalSteps) {
             // End
             setCurrentIndex(totalSteps - 1); // Hold last frame
             // Add a small delay before actually stopping to let the viewer see the last item
             setTimeout(() => {
                onAnimationComplete();
                audioSynth.stop();
                setCurrentIndex(0);
             }, 2000);
         } else {
             timer = requestAnimationFrame(nextStep);
         }
      };
      
      timer = requestAnimationFrame(nextStep);
    } else {
       audioSynth.stop();
       setCurrentIndex(0);
    }

    return () => {
      cancelAnimationFrame(timer);
      audioSynth.stop();
    };
  }, [isPlaying, config.durationPerItem, totalSteps, audioSynth, voicePcm]);


  // Derived State for Current Content
  const currentRowIdx = Math.floor(currentIndex / numAttributes);
  const currentAttrIdx = currentIndex % numAttributes;
  const currentColIdx = numCols > 1 ? currentAttrIdx + 1 : 0;

  const currentRow = data.data[currentRowIdx] || [];
  const currentSubject = currentRow[0] || "";
  const currentHeader = data.columns[currentColIdx] || "";
  const currentValue = currentRow[currentColIdx] || "";
  const subjectLabel = data.columns[0];

  const variants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 1.05 }
  };
  
  if (config.style === AnimationStyle.SLIDE_RIGHT) {
      variants.initial = { opacity: 0, y: 0, scale: 1, x: -50 } as any;
      variants.animate = { opacity: 1, y: 0, scale: 1, x: 0 } as any;
      variants.exit = { opacity: 0, y: 0, scale: 1, x: 50 } as any;
  }
  if (config.style === AnimationStyle.POP) {
      variants.initial = { opacity: 0, scale: 0.5, y: 0 } as any;
      variants.animate = { opacity: 1, scale: 1, y: 0 } as any;
      variants.exit = { opacity: 0, scale: 1.5, y: 0 } as any;
  }

  // Neon Grid Background
  const NeonGrid = () => (
    <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
       <div className="w-full h-full" 
            style={{ 
                backgroundImage: `linear-gradient(to right, #4ade80 1px, transparent 1px), linear-gradient(to bottom, #4ade80 1px, transparent 1px)`,
                backgroundSize: '50px 50px'
            }} 
       />
    </div>
  );

  return (
    <div className={clsx(
        "relative overflow-hidden shadow-2xl transition-all duration-500",
        themeStyle.bgClass,
        themeStyle.fontMain,
        // Aspect Ratio Square for accurate preview of video export
        "aspect-square w-full max-w-[600px] rounded-xl border border-white/10"
    )}>
        {/* Background Image */}
        {config.backgroundImage && (
            <div className="absolute inset-0 z-0">
                <img src={config.backgroundImage} className="w-full h-full object-cover opacity-40" alt="Background" />
                <div className="absolute inset-0 bg-black/40" />
            </div>
        )}

        {/* Procedural Backgrounds */}
        {!config.backgroundImage && config.theme === Theme.NEON && <NeonGrid />}
        {!config.backgroundImage && config.theme === Theme.COSMIC && (
             <div className="absolute inset-0 z-0 opacity-30">
                 <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500 rounded-full blur-[80px]" />
                 <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500 rounded-full blur-[80px]" />
             </div>
        )}

        {/* Top Title */}
        <div className="absolute top-0 left-0 right-0 p-6 md:p-8 z-20 text-center">
            <h2 className={clsx(
                "text-xl md:text-3xl font-bold tracking-wide uppercase opacity-80",
                themeStyle.fontHeader,
                themeStyle.textHeader
            )}>
                {data.title}
            </h2>
        </div>

        {/* Main Content Area */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 md:p-12">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={`${currentRowIdx}-${currentAttrIdx}`} // Triggers animation on step change
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={variants}
                    transition={{ duration: 0.4, ease: "backOut" }}
                    className="w-full h-full flex flex-col items-center justify-center"
                >
                    {/* --- LAYOUTS --- */}
                    
                    {config.layout === Layout.STACKED && (
                        <div className="flex flex-col items-center text-center space-y-4 md:space-y-8">
                             <div className="space-y-2">
                                <span className={clsx("text-sm md:text-xl font-bold uppercase tracking-widest", themeStyle.textHeader)}>
                                    {subjectLabel}
                                </span>
                                <h3 className={clsx("text-4xl md:text-7xl font-black leading-tight", themeStyle.textSubject)}>
                                    {currentSubject}
                                </h3>
                             </div>

                             <div className={clsx("w-24 md:w-32 h-1 md:h-2 rounded-full bg-gradient-to-r", themeStyle.lineGradient)} />
                             
                             {numCols > 1 && (
                                <div className="space-y-2 md:space-y-4 bg-black/20 p-4 md:p-6 rounded-xl backdrop-blur-sm border border-white/5 w-full max-w-md">
                                    <div className={clsx("text-lg md:text-2xl italic", themeStyle.textHeader)}>
                                        {currentHeader}
                                    </div>
                                    <div className={clsx("text-3xl md:text-5xl font-bold", themeStyle.textValue)}>
                                        {currentValue}
                                    </div>
                                </div>
                             )}
                        </div>
                    )}

                    {config.layout === Layout.SPLIT && (
                        <div className="flex flex-col h-full w-full">
                            <div className="flex-1 flex flex-col justify-center items-center border-b border-white/10 p-4 relative overflow-hidden group">
                                <span className={clsx("absolute top-4 left-4 text-xs md:text-sm font-bold uppercase opacity-50", themeStyle.textHeader)}>{subjectLabel}</span>
                                <h3 className={clsx("text-4xl md:text-7xl font-black text-center z-10", themeStyle.textSubject)}>
                                    {currentSubject}
                                </h3>
                                <div className={clsx("absolute bottom-0 left-0 h-1 bg-gradient-to-r w-full opacity-50", themeStyle.lineGradient)}/>
                            </div>
                            <div className="flex-1 flex flex-col justify-center items-center p-4 bg-black/10">
                                <div className={clsx("text-lg md:text-3xl italic mb-2 md:mb-4", themeStyle.textHeader)}>
                                    {currentHeader}
                                </div>
                                <div className={clsx("text-3xl md:text-6xl font-bold text-center", themeStyle.textValue)}>
                                    {currentValue}
                                </div>
                            </div>
                        </div>
                    )}

                    {config.layout === Layout.DIAGONAL && (
                        <div className="w-full h-full relative">
                            <div className="absolute top-10 md:top-20 left-4 md:left-10 text-left">
                                <span className={clsx("block text-xs md:text-sm font-bold uppercase opacity-60 mb-1", themeStyle.textHeader)}>
                                    {subjectLabel}
                                </span>
                                <h3 className={clsx("text-4xl md:text-7xl font-black", themeStyle.textSubject)}>
                                    {currentSubject}
                                </h3>
                                <div className={clsx("w-32 md:w-48 h-1 md:h-2 mt-2 md:mt-4 rounded-full bg-gradient-to-r", themeStyle.lineGradient)} />
                            </div>

                            <div className="absolute bottom-16 md:bottom-32 right-4 md:right-10 text-right">
                                <div className={clsx("text-lg md:text-3xl italic mb-1 md:mb-2", themeStyle.textHeader)}>
                                    {currentHeader}
                                </div>
                                <div className={clsx("text-3xl md:text-6xl font-bold", themeStyle.textValue)}>
                                    {currentValue}
                                </div>
                            </div>
                        </div>
                    )}

                    {config.layout === Layout.MAGAZINE && (
                        <div className="flex flex-col items-center justify-center relative w-full h-full">
                            {/* Big Watermark Background */}
                            <h1 className={clsx("absolute opacity-10 text-[120px] md:text-[200px] font-black leading-none select-none overflow-hidden whitespace-nowrap blur-sm", themeStyle.textSubject)}>
                                {currentSubject}
                            </h1>
                            
                            <div className="relative z-10 text-center space-y-6 md:space-y-10">
                                 <div>
                                    <span className={clsx("block text-sm font-bold uppercase tracking-widest mb-2 text-white/50")}>
                                        {subjectLabel}
                                    </span>
                                    <h3 className={clsx("text-5xl md:text-8xl font-black", themeStyle.textSubject)}>
                                        {currentSubject}
                                    </h3>
                                 </div>
                                 <div className="w-16 md:w-24 h-2 bg-white mx-auto opacity-20" />
                                 <div>
                                     <div className={clsx("text-xl md:text-3xl italic mb-2", themeStyle.textHeader)}>
                                        {currentHeader}
                                    </div>
                                    <div className={clsx("text-4xl md:text-6xl font-bold", themeStyle.textValue)}>
                                        {currentValue}
                                    </div>
                                 </div>
                            </div>
                        </div>
                    )}

                    {config.layout === Layout.LOWER_THIRD && (
                        <div className="flex flex-col justify-end h-full w-full pb-16 md:pb-24 px-4 md:px-10">
                            <div className="border-l-4 border-white pl-4 md:pl-6 bg-gradient-to-r from-black/60 to-transparent py-4 md:py-8 backdrop-blur-sm rounded-r-xl">
                                <span className={clsx("block text-xs md:text-sm font-bold uppercase opacity-70 mb-1", themeStyle.textHeader)}>
                                    {subjectLabel}
                                </span>
                                <h3 className={clsx("text-4xl md:text-6xl font-black mb-2", themeStyle.textSubject)}>
                                    {currentSubject}
                                </h3>
                                <div className="flex items-center gap-2 md:gap-4 mt-2 md:mt-4">
                                     <span className={clsx("text-lg md:text-2xl italic opacity-80", themeStyle.textHeader)}>{currentHeader}:</span>
                                     <span className={clsx("text-2xl md:text-4xl font-bold", themeStyle.textValue)}>{currentValue}</span>
                                </div>
                            </div>
                        </div>
                    )}

                </motion.div>
            </AnimatePresence>
        </div>

        {/* Branding / Watermarks */}
        {config.showAppName && (
            <div className="absolute bottom-3 right-3 md:bottom-6 md:right-6 text-right z-30">
                <div className={clsx("text-sm md:text-lg font-bold opacity-80 drop-shadow-md", themeStyle.textSubject)}>
                    LOKSEWA AUTOMATIC
                </div>
            </div>
        )}

        {config.showAiWatermark && (
            <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 z-30">
                 <div className="text-[10px] md:text-xs italic text-white/40 bg-black/20 px-2 py-1 rounded backdrop-blur-sm border border-white/5">
                    AI Generated Content
                 </div>
            </div>
        )}

        {/* Progress Bar */}
        {config.showProgressBar && (
            <div className="absolute bottom-0 left-0 w-full h-1 md:h-2 bg-white/10 z-30">
                <motion.div 
                    className={clsx("h-full", themeStyle.progressGradient)}
                    animate={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
                    transition={{ ease: "linear", duration: 0.2 }}
                />
            </div>
        )}
    </div>
  );
};
