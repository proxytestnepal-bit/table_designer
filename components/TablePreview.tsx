
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { TableData, AnimationConfig, Theme, AnimationStyle, Layout } from '../types';
import { clsx } from 'clsx';
import { PresentationAudio } from '../utils/audioSynth';
import { ExternalLink } from 'lucide-react';

interface TablePreviewProps {
  data: TableData;
  config: AnimationConfig;
  isPlaying: boolean;
  onAnimationComplete: () => void;
  isFullscreen: boolean;
  voicePcm: string | null;
}

// --- Theme Configs ---

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
    bgClass: 'bg-slate-950',
    // Added py-3 to prevent clipping of ascenders/descenders with bg-clip-text
    textSubject: 'text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white py-3',
    textHeader: 'text-slate-400 font-serif italic',
    textValue: 'text-yellow-100',
    lineGradient: 'from-transparent via-purple-500 to-transparent',
    progressGradient: 'from-blue-500 to-purple-600',
  },
  [Theme.NEON]: {
    fontMain: 'font-mono',
    fontHeader: 'font-mono',
    bgClass: 'bg-black',
    textSubject: 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]',
    textHeader: 'text-pink-500 uppercase tracking-widest',
    textValue: 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]',
    lineGradient: 'from-transparent via-green-500 to-transparent',
    progressGradient: 'from-green-500 via-white to-pink-500',
  },
  [Theme.LUXE]: {
    fontMain: 'font-serif',
    fontHeader: 'font-sans',
    bgClass: 'bg-[#0a0a0a]',
    textSubject: 'text-amber-100 drop-shadow-md',
    textHeader: 'text-stone-500 uppercase tracking-widest text-sm',
    textValue: 'text-amber-400 font-serif italic',
    lineGradient: 'from-transparent via-amber-600 to-transparent',
    progressGradient: 'from-amber-700 to-yellow-500',
  },
  [Theme.GLASS]: {
    fontMain: 'font-sans',
    fontHeader: 'font-sans',
    bgClass: 'bg-slate-900',
    textSubject: 'text-white drop-shadow-lg font-black',
    textHeader: 'text-cyan-200 uppercase tracking-widest text-xs font-bold',
    textValue: 'text-transparent bg-clip-text bg-gradient-to-br from-white to-cyan-100 py-3',
    lineGradient: 'from-transparent via-cyan-500 to-transparent',
    progressGradient: 'from-cyan-500 to-blue-600',
  }
};

// --- Animation Variants ---

const getAnimationVariants = (style: AnimationStyle): {
    container: Variants,
    item: Variants
} => {
    switch(style) {
        case AnimationStyle.SLIDE_RIGHT:
            return {
                container: {},
                item: {
                    initial: { x: -100, opacity: 0 },
                    animate: { x: 0, opacity: 1 },
                    exit: { x: 100, opacity: 0 }
                }
            };
        case AnimationStyle.POP:
            return {
                container: {},
                item: {
                    initial: { scale: 0.5, opacity: 0 },
                    animate: { scale: 1, opacity: 1, transition: { type: 'spring', bounce: 0.5 } },
                    exit: { scale: 1.2, opacity: 0 }
                }
            };
        case AnimationStyle.FADE_UP:
        default:
            return {
                container: {},
                item: {
                    initial: { y: 20, opacity: 0, scale: 0.95 },
                    animate: { y: 0, opacity: 1, scale: 1 },
                    exit: { y: -20, opacity: 0, filter: 'blur(5px)' }
                }
            };
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
  const [currentStep, setCurrentStep] = useState(0);
  const audioRef = useRef<PresentationAudio | null>(null);

  // Theme Constants
  const theme = THEME_STYLES[config.theme] || THEME_STYLES[Theme.COSMIC];
  
  // Derived constants
  const numCols = data.columns.length;
  const numAttributes = Math.max(1, numCols - 1); 
  const totalSteps = data.data.length * numAttributes;
  const variants = getAnimationVariants(config.style);

  // Manage Audio Lifecycle
  useEffect(() => {
    if (isPlaying) {
      if (!audioRef.current) {
        audioRef.current = new PresentationAudio(false);
        audioRef.current.start();
        if (voicePcm) {
          audioRef.current.playSpeech(voicePcm);
        }
      }
    } else {
      if (audioRef.current) {
        audioRef.current.stop();
        audioRef.current = null;
      }
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.stop();
        audioRef.current = null;
      }
    };
  }, [isPlaying, voicePcm]); // Added voicePcm to restart if voice changes while playing

  // Timer Logic
  useEffect(() => {
    if (isPlaying) {
      setCurrentStep(0);
      const interval = setInterval(() => {
        setCurrentStep((prev) => {
          const next = prev + 1;
          if (next >= totalSteps) {
            clearInterval(interval);
            setTimeout(onAnimationComplete, config.durationPerItem * 1000 + 1000); // Buffer for audio
            return prev; 
          }
          return next;
        });
      }, config.durationPerItem * 1000);
      return () => clearInterval(interval);
    } else {
        setCurrentStep(0);
    }
  }, [isPlaying, totalSteps, config.durationPerItem, onAnimationComplete]);

  // Trigger Sound Effect
  useEffect(() => {
    if (isPlaying && currentStep > 0 && audioRef.current) {
        audioRef.current.triggerTransition();
    }
  }, [currentStep, isPlaying]);

  // Compute active data
  const activeInfo = useMemo(() => {
    if (!data.data.length) return null;
    const safeStep = Math.min(currentStep, totalSteps - 1);
    const rowIdx = Math.floor(safeStep / numAttributes);
    const attrIdx = safeStep % numAttributes;
    const colIdx = numCols > 1 ? attrIdx + 1 : 0;
    const currentRow = data.data[rowIdx];
    return {
      rowIdx,
      colIdx,
      subject: currentRow?.[0] || "",
      header: data.columns[colIdx] || "",
      value: currentRow?.[colIdx] || "",
      progress: (safeStep + 1) / totalSteps
    };
  }, [currentStep, data, numAttributes, numCols, totalSteps]);

  const SourcesDisplay = () => {
    if (!data.sources || data.sources.length === 0) return null;
    return (
        <div className="flex items-center gap-2 text-[10px] md:text-xs opacity-60 hover:opacity-100 transition-opacity max-w-full overflow-hidden text-slate-500">
            <span className="font-semibold uppercase tracking-wider whitespace-nowrap">Sources:</span>
            <div className="flex flex-wrap gap-x-3">
                {data.sources.map((src, idx) => {
                    let hostname = src;
                    try { hostname = new URL(src).hostname.replace('www.', ''); } catch (e) {}
                    return (
                        <a 
                            key={idx} 
                            href={src} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:underline flex items-center gap-0.5"
                        >
                            {hostname} <ExternalLink size={10} />
                        </a>
                    );
                })}
            </div>
        </div>
    );
  };

  // --------------------------------------------------------------------------
  // Render: Overview Mode (Table)
  // --------------------------------------------------------------------------
  if (!isPlaying) {
    return (
      <div className={clsx(
        "relative w-full overflow-auto flex flex-col items-center p-8 transition-colors duration-500 custom-scrollbar",
        isFullscreen ? "bg-slate-950 h-full justify-center" : "bg-slate-900 rounded-xl shadow-2xl min-h-[500px]"
      )}>
         {/* Background Preview in Overview */}
         {config.backgroundImage && (
             <div className="absolute inset-0 opacity-20 pointer-events-none">
                 <img src={config.backgroundImage} className="w-full h-full object-cover blur-sm" alt="Background" />
             </div>
         )}
         
        <div className="w-full max-w-7xl mx-auto flex flex-col h-full z-10">
             <div className="mb-6 text-center opacity-60 shrink-0">
                <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Table Overview</p>
                {data.title && (
                    <h2 className="text-2xl font-bold text-slate-100 mt-2">{data.title}</h2>
                )}
                {data.summary && (
                   <p className="text-xs text-slate-400 mt-1 max-w-2xl mx-auto italic">"{data.summary}"</p>
                )}
             </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr>
                            {data.columns.map((col, idx) => (
                                <th key={idx} className="p-4 text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700 bg-slate-800/50 sticky top-0 backdrop-blur-sm z-10">
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.data.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                                {row.map((cell, cIdx) => (
                                    <td key={`${rIdx}-${cIdx}`} className={clsx(
                                        "p-4 text-slate-200",
                                        cIdx === 0 ? "font-bold text-white" : ""
                                    )}>
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {data.sources && data.sources.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-800/50 shrink-0">
                    <SourcesDisplay />
                </div>
            )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Content Renderers
  // --------------------------------------------------------------------------
  const renderSubjectBlock = (className = "") => (
    <AnimatePresence mode="wait">
        <motion.div
            key={`subject-${activeInfo?.rowIdx}`}
            variants={variants.item}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={clsx("flex flex-col", className)}
        >
            <motion.span 
                initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} 
                className={clsx("block text-xl md:text-2xl font-bold mb-3 md:mb-5 uppercase tracking-[0.2em] leading-relaxed", "text-blue-300")}
            >
                {data.columns[0]}
            </motion.span>
            <h1 className={clsx("text-6xl md:text-8xl font-black leading-relaxed", theme.textSubject)}>
                {activeInfo?.subject}
            </h1>
        </motion.div>
    </AnimatePresence>
  );

  const renderSeparator = (className = "w-32 md:w-48 h-1 md:h-1.5") => (
    <motion.div 
        key={`line-${activeInfo?.rowIdx}`}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className={clsx("rounded-full bg-gradient-to-r", theme.lineGradient, className)}
    />
  );

  const renderAttributeBlock = (className = "") => (
    <AnimatePresence mode="wait">
        <motion.div
            key={`attr-${activeInfo?.rowIdx}-${activeInfo?.colIdx}`}
            variants={variants.item}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4 }}
            className={clsx("flex flex-col", className)}
        >
            {numCols > 1 && (
                <>
                    <h3 className={clsx("text-3xl md:text-5xl font-medium mb-4", theme.fontHeader, theme.textHeader)}>
                        {activeInfo?.header}
                    </h3>
                    <div className={clsx("text-4xl md:text-6xl lg:text-7xl font-bold leading-relaxed break-words", theme.textValue)}>
                         {activeInfo?.value}
                    </div>
                </>
            )}
        </motion.div>
    </AnimatePresence>
  );


  // --------------------------------------------------------------------------
  // Layout Logic
  // --------------------------------------------------------------------------
  const renderLayout = () => {
    switch (config.layout) {
        case Layout.SPLIT:
            return (
                <div className="relative w-full max-w-7xl mx-auto h-full grid grid-cols-2 items-center gap-12 px-8">
                     <div className="flex flex-col items-end text-right justify-center h-full">
                        {renderSubjectBlock("items-end text-right")}
                     </div>
                     <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-1/2 w-[1px] md:w-[2px] bg-gradient-to-b from-transparent via-slate-500/50 to-transparent" />
                     <div className="flex flex-col items-start text-left justify-center h-full">
                        {renderAttributeBlock("items-start text-left")}
                     </div>
                </div>
            );

        case Layout.DIAGONAL:
             return (
                 <div className="relative w-full max-w-7xl mx-auto h-full p-12">
                     <div className="absolute top-[15%] left-[5%] md:left-[10%] text-left">
                        {renderSubjectBlock("items-start text-left")}
                        {renderSeparator("w-full h-1 mt-6 origin-left")}
                     </div>
                     <div className="absolute bottom-[20%] right-[5%] md:right-[10%] text-right max-w-[60%]">
                        {renderAttributeBlock("items-end text-right")}
                     </div>
                 </div>
             );

        case Layout.MAGAZINE:
             return (
                 <div className="relative w-full max-w-7xl mx-auto h-full overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.15] scale-[2.0] blur-sm">
                         <h1 className={clsx("font-black text-[15rem] leading-none whitespace-nowrap select-none", "text-white")}>
                             {activeInfo?.subject}
                         </h1>
                      </div>
                      <div className="z-10 flex flex-col items-center">
                          {renderSubjectBlock("items-center text-center mb-12 scale-75 md:scale-100")}
                          {renderSeparator("w-24 h-1 mb-12")}
                          {renderAttributeBlock("items-center text-center")}
                      </div>
                 </div>
             );

        case Layout.LOWER_THIRD:
             return (
                 <div className="relative w-full max-w-7xl mx-auto h-full flex flex-col justify-end pb-[15vh]">
                     <div className="flex flex-col md:flex-row md:items-end gap-8 md:gap-16 px-8 md:px-16">
                         <div className="shrink-0">
                            {renderSubjectBlock("items-start text-left")}
                         </div>
                         <div className="hidden md:block w-[1px] h-32 bg-slate-500/30 mb-2"></div>
                         <div className="flex-1">
                            {renderAttributeBlock("items-start text-left")}
                         </div>
                     </div>
                     {renderSeparator("w-full h-[2px] mt-8 mx-8 md:mx-16 max-w-[calc(100%-4rem)]")}
                 </div>
             );

        case Layout.STACKED:
        default:
             return (
                <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center justify-center text-center space-y-4 md:space-y-8">
                    <div className="h-[25vh] flex flex-col items-center justify-center w-full">
                        {renderSubjectBlock("items-center text-center")}
                    </div>
                    {renderSeparator()}
                    <div className="h-[45vh] flex flex-col items-center justify-center w-full">
                        {renderAttributeBlock("items-center text-center max-w-5xl")}
                    </div>
                </div>
             );
    }
  };


  // --------------------------------------------------------------------------
  // Render: Presentation Mode
  // --------------------------------------------------------------------------
  return (
    <div className={clsx(
        "relative w-full flex flex-col items-center justify-center overflow-hidden transition-colors duration-1000",
        isFullscreen ? "h-screen" : "min-h-[600px] rounded-xl shadow-2xl",
        theme.bgClass,
        theme.fontMain
    )}>
        {/* Dynamic Backgrounds */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {config.backgroundImage ? (
                <>
                     <motion.img 
                        initial={{ scale: 1.0 }}
                        animate={{ scale: 1.1 }}
                        transition={{ duration: 30, ease: "linear", repeat: Infinity, repeatType: 'reverse' }}
                        src={config.backgroundImage}
                        className="w-full h-full object-cover opacity-60"
                        alt="Background"
                     />
                     <div className="absolute inset-0 bg-black/50" />
                </>
            ) : (
                /* Fallback Procedural Backgrounds */
                <>
                    {config.theme === Theme.COSMIC && (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-slate-900/40" />
                            <motion.div 
                                animate={{ x: [0, 50, -50, 0], y: [0, -50, 50, 0], scale: [1, 1.2, 0.8, 1] }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" 
                            />
                        </>
                    )}
                    
                    {config.theme === Theme.NEON && (
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px]">
                            <div className="absolute inset-0 bg-gradient-to-t from-green-900/20 to-transparent" />
                        </div>
                    )}
                </>
            )}
            
            {/* Global Overlays */}
             {config.theme === Theme.GLASS && (
                 <>
                    <div className="absolute inset-0 backdrop-blur-3xl" />
                    <div className="absolute inset-4 rounded-3xl border border-white/5 bg-white/[0.02] shadow-[0_0_100px_rgba(0,0,0,0.5)_inset]" />
                 </>
            )}
        </div>

        {/* Persistent Title */}
        {data.title && (
             <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 0.8, y: 0 }}
                className={clsx("absolute top-6 left-0 w-full text-center z-20 px-8", "text-slate-300")}
             >
                 <h2 className="text-lg md:text-xl font-bold uppercase tracking-widest drop-shadow-md">
                     {data.title}
                 </h2>
             </motion.div>
        )}

        {/* Dynamic Layout Content */}
        {renderLayout()}

        {/* Progress Bar */}
        {config.showProgressBar && (
             <div className={clsx("absolute bottom-0 left-0 w-full h-2 md:h-3", "bg-slate-800")}>
                <motion.div 
                    className={clsx("h-full bg-gradient-to-r", theme.progressGradient, config.theme === Theme.NEON && "shadow-[0_0_15px_rgba(74,222,128,0.5)]")}
                    initial={{ width: "0%" }}
                    animate={{ width: `${(activeInfo?.progress || 0) * 100}%` }}
                    transition={{ duration: 0.5, ease: "linear" }}
                />
             </div>
        )}
        
        {/* Pagination */}
        <div className="absolute bottom-8 right-8 flex flex-col items-end gap-2 z-20">
             <div className={clsx("font-mono text-xs md:text-sm", "text-slate-500")}>
                {activeInfo ? (
                    <span>{activeInfo.rowIdx + 1} <span className="opacity-50">/</span> {data.data.length}</span>
                ) : null}
             </div>
        </div>

        {/* Sources */}
        {data.sources && data.sources.length > 0 && (
             <div className="absolute bottom-8 left-8 max-w-[50%] z-20">
                 <SourcesDisplay />
             </div>
        )}
    </div>
  );
};
