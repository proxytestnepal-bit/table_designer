import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Wand2, Maximize2, Minimize2, Loader2, Clock, Film, Shuffle, Sparkles, LayoutTemplate, Database, Palette, ImageIcon, Mic, Volume2, Image as ImageDown } from 'lucide-react';
import { TableData, AnimationConfig, Theme, AnimationStyle, Layout } from './types';
import { DEFAULT_TABLE_DATA, DEFAULT_ANIMATION_CONFIG } from './constants';
import { TablePreview } from './components/TablePreview';
import { Editor } from './components/Editor';
import { generateTableFromPrompt, fixTableJson, generateBackgroundImage, generateVoiceover } from './services/geminiService';
import { renderVideo } from './utils/videoRenderer';
import { renderTableImage } from './utils/imageRenderer';
import { clsx } from 'clsx';

function App() {
  // State
  const [data, setData] = useState<TableData>(DEFAULT_TABLE_DATA);
  const [jsonString, setJsonString] = useState<string>(JSON.stringify(DEFAULT_TABLE_DATA, null, 2));
  const [isValidJson, setIsValidJson] = useState(true);
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [isExporting, setIsExporting] = useState(false); 
  const [exportProgress, setExportProgress] = useState(0);

  const [prompt, setPrompt] = useState("");
  const [showPromptInput, setShowPromptInput] = useState(false);
  
  const [config, setConfig] = useState<AnimationConfig>(DEFAULT_ANIMATION_CONFIG);

  const [sidebarTab, setSidebarTab] = useState<'data' | 'design'>('data');

  // Media State
  const [isGenImage, setIsGenImage] = useState(false);
  const [isGenVoice, setIsGenVoice] = useState(false);
  const [voicePcm, setVoicePcm] = useState<string | null>(null);

  // Refs
  const appContainerRef = useRef<HTMLDivElement>(null);

  // Handlers
  const handleJsonChange = (newJson: string) => {
    setJsonString(newJson);
    try {
      const parsed = JSON.parse(newJson);
      // Basic validation
      if (parsed.columns && Array.isArray(parsed.columns) && parsed.data && Array.isArray(parsed.data)) {
        setData(parsed);
        setIsValidJson(true);
        setJsonError(null);
      } else {
        throw new Error("Missing 'columns' or 'data' array.");
      }
    } catch (e: any) {
      setIsValidJson(false);
      setJsonError(e.message);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const newData = await generateTableFromPrompt(prompt);
      const formatted = JSON.stringify(newData, null, 2);
      setJsonString(formatted);
      setData(newData);
      setIsValidJson(true);
      setShowPromptInput(false);
      // Reset voice and bg on new data to avoid mismatch
      setVoicePcm(null); 
      setConfig(prev => ({ ...prev, backgroundImage: undefined }));
    } catch (error) {
      alert("Failed to generate table. Please check your API key or try a different prompt.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFixJson = async () => {
    setIsGenerating(true);
    try {
      const fixedData = await fixTableJson(jsonString);
      const formatted = JSON.stringify(fixedData, null, 2);
      setJsonString(formatted);
      setData(fixedData);
      setIsValidJson(true);
      setJsonError(null);
    } catch (error) {
      alert("Could not fix JSON automatically.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateBackground = async () => {
      if (!data.title) return;
      setIsGenImage(true);
      try {
          const base64Img = await generateBackgroundImage(data.title);
          setConfig(prev => ({ ...prev, backgroundImage: base64Img }));
      } catch (e) {
          console.error(e);
          alert("Failed to generate image.");
      } finally {
          setIsGenImage(false);
      }
  };

  const handleGenerateVoice = async () => {
      if (!data.summary) {
          alert("No summary found in data to read. Try regenerating the table first.");
          return;
      }
      setIsGenVoice(true);
      try {
          const pcm = await generateVoiceover(data.summary);
          setVoicePcm(pcm);
      } catch (e) {
          console.error(e);
          alert("Failed to generate voiceover.");
      } finally {
          setIsGenVoice(false);
      }
  };

  const handleRandomizeDesign = () => {
    const themes = Object.values(Theme);
    const styles = Object.values(AnimationStyle);
    const layouts = Object.values(Layout);
    
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const randomLayout = layouts[Math.floor(Math.random() * layouts.length)];
    
    setConfig(prev => ({
        ...prev,
        theme: randomTheme,
        style: randomStyle,
        layout: randomLayout
    }));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      appContainerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Sync fullscreen state with browser events (esc key)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleExportVideo = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false); // Stop preview during export

    try {
        const blob = await renderVideo(data, config, voicePcm, (progress) => {
            setExportProgress(Math.round(progress * 100));
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `loksewa-automatic-${config.theme}-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err: any) {
        console.error("Export failed:", err);
        alert("Failed to export video: " + err.message);
    } finally {
        setIsExporting(false);
        setExportProgress(0);
    }
  };

  const handleExportImage = async () => {
      if (isExporting) return;
      setIsExporting(true);
      try {
          const dataUrl = await renderTableImage(data, config);
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `loksewa-post-${config.theme}-${Date.now()}.png`;
          a.click();
      } catch (e) {
          console.error(e);
          alert("Failed to export image");
      } finally {
          setIsExporting(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      {!isFullscreen && (
        <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-lg shadow-blue-500/20">
              <img src="logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Loksewa Automatic
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <button
              onClick={() => {
                  const nextState = !showPromptInput;
                  setShowPromptInput(nextState);
                  if(nextState) setSidebarTab('data');
              }}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-sm font-medium transition-colors border border-slate-700"
            >
              <Wand2 size={16} className="text-purple-400" />
              <span>AI Generate</span>
            </button>
            <button
                onClick={handleExportImage}
                disabled={isExporting}
                className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border",
                    isExporting 
                    ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
                    : "bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border-purple-600/20"
                )}
            >
                <ImageIcon size={16} />
                <span>Export for Social</span>
            </button>
            <button
              onClick={handleExportVideo}
              disabled={isExporting}
              className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border",
                  isExporting 
                    ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
                    : "bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border-blue-600/20"
              )}
            >
              {isExporting && exportProgress > 0 ? <Loader2 size={16} className="animate-spin"/> : <Download size={16} />}
              <span>{isExporting && exportProgress > 0 ? `Rendering ${exportProgress}%` : "Export Video"}</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={clsx("flex-1 flex overflow-hidden", isFullscreen ? "h-screen" : "p-6 gap-6")}>
        
        {/* Left Panel: Tabs for Data & Design (Hidden in Fullscreen) */}
        {!isFullscreen && (
          <div className="w-1/3 min-w-[350px] flex flex-col bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
            
            {/* Tab Header */}
            <div className="flex border-b border-slate-800">
                <button
                    onClick={() => setSidebarTab('data')}
                    className={clsx(
                        "flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative",
                        sidebarTab === 'data' ? "text-blue-400 bg-slate-800/50" : "text-slate-500 hover:text-slate-300"
                    )}
                >
                    <Database size={16} /> Data
                    {sidebarTab === 'data' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500" />}
                </button>
                <button
                    onClick={() => setSidebarTab('design')}
                    className={clsx(
                        "flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative",
                        sidebarTab === 'design' ? "text-purple-400 bg-slate-800/50" : "text-slate-500 hover:text-slate-300"
                    )}
                >
                    <Palette size={16} /> Design
                    {sidebarTab === 'design' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500" />}
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                
                {/* DATA TAB */}
                {sidebarTab === 'data' && (
                    <div className="flex-1 flex flex-col p-4 gap-4 h-full overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300">
                         {/* AI Input Area */}
                        {showPromptInput && (
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg shrink-0">
                            <label className="block text-sm font-medium text-slate-400 mb-2">What data do you need?</label>
                            <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={isGenerating || isExporting}
                                placeholder="e.g. Top 10 Mountains, Solar System Planets..."
                                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:opacity-50"
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                            />
                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating || !prompt || isExporting}
                                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg px-4 flex items-center justify-center transition-colors"
                            >
                                {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <Wand2 size={18} />}
                            </button>
                            </div>
                        </div>
                        )}

                        {/* Editor */}
                        <div className="flex-1 h-full min-h-0 flex flex-col">
                            <Editor 
                                jsonString={jsonString} 
                                setJsonString={handleJsonChange} 
                                isValid={isValidJson}
                                errorMessage={jsonError}
                            />
                            {!isValidJson && (
                                <button 
                                    onClick={handleFixJson}
                                    disabled={isGenerating || isExporting}
                                    className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 self-end disabled:opacity-50"
                                >
                                    <Wand2 size={12}/> Auto-fix with AI
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* DESIGN TAB */}
                {sidebarTab === 'design' && (
                     <div className="flex-1 overflow-y-auto p-6 custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-6">
                            
                             <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Appearance</h3>
                                <button 
                                    onClick={handleRandomizeDesign}
                                    className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/20"
                                >
                                    <Shuffle size={12} /> Shuffle
                                </button>
                             </div>

                             {/* Theme Selectors */}
                            <div className="space-y-2">
                                <div className="text-xs text-slate-500 font-semibold uppercase">Theme</div>
                                <div className="relative">
                                    <select
                                        value={config.theme}
                                        onChange={(e) => setConfig({...config, theme: e.target.value as Theme})}
                                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-3 capitalize cursor-pointer transition-colors hover:border-slate-600 appearance-none"
                                    >
                                        {Object.values(Theme).map((t) => (
                                            <option key={t} value={t}>{t.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                        <Sparkles size={16} />
                                    </div>
                                </div>
                            </div>

                            {/* Layout Selector */}
                            <div className="space-y-2">
                                <div className="text-xs text-slate-500 font-semibold uppercase">Layout</div>
                                <div className="relative">
                                    <select
                                        value={config.layout}
                                        onChange={(e) => setConfig({...config, layout: e.target.value as Layout})}
                                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3 capitalize cursor-pointer transition-colors hover:border-slate-600 appearance-none"
                                    >
                                        {Object.values(Layout).map((l) => (
                                            <option key={l} value={l}>{l.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                        <LayoutTemplate size={16} />
                                    </div>
                                </div>
                            </div>

                            {/* Background Generator */}
                            <div className="space-y-2 pt-2 border-t border-slate-800">
                                <div className="flex justify-between items-center">
                                    <div className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-2">
                                        <ImageIcon size={12} /> Background Image
                                    </div>
                                    {config.backgroundImage && (
                                        <button 
                                            onClick={() => setConfig({...config, backgroundImage: undefined})}
                                            className="text-[10px] text-red-400 hover:underline"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                {config.backgroundImage ? (
                                    <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-700 group">
                                        <img src={config.backgroundImage} className="w-full h-full object-cover" alt="Generated Background"/>
                                        <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors" />
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleGenerateBackground}
                                        disabled={isGenImage || !data.title}
                                        className="w-full py-3 border border-dashed border-slate-700 rounded-lg text-slate-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex flex-col items-center gap-1 disabled:opacity-50"
                                    >
                                        {isGenImage ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16}/>}
                                        <span className="text-xs">Generate AI Background</span>
                                    </button>
                                )}
                            </div>

                            {/* Voiceover Generator */}
                            <div className="space-y-2 pt-2 border-t border-slate-800">
                                <div className="flex justify-between items-center">
                                    <div className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-2">
                                        <Mic size={12} /> Narrative Voiceover
                                    </div>
                                    {voicePcm && (
                                        <button 
                                            onClick={() => setVoicePcm(null)}
                                            className="text-[10px] text-red-400 hover:underline"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                {voicePcm ? (
                                    <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-xs">
                                        <Volume2 size={14} />
                                        <span>Voiceover Ready</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleGenerateVoice}
                                        disabled={isGenVoice || !data.title}
                                        className="w-full py-3 border border-dashed border-slate-700 rounded-lg text-slate-500 hover:text-green-400 hover:border-green-500/50 hover:bg-green-500/5 transition-all flex flex-col items-center gap-1 disabled:opacity-50"
                                    >
                                        {isGenVoice ? <Loader2 size={16} className="animate-spin"/> : <Mic size={16}/>}
                                        <span className="text-xs">Generate Narrative Summary</span>
                                    </button>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-800 space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Timing & Settings</h3>
                                
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-300 flex justify-between items-center">
                                        <span className="flex items-center gap-2"><Clock size={14}/> Duration per Item</span>
                                        <span className="text-blue-400 font-mono text-xs font-bold">{config.durationPerItem}s</span>
                                    </label>
                                    <input 
                                        type="range" 
                                        min="1.0" 
                                        max="5.0" 
                                        step="0.5"
                                        disabled={isExporting}
                                        value={config.durationPerItem}
                                        onChange={(e) => setConfig({...config, durationPerItem: parseFloat(e.target.value)})}
                                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50 border border-slate-700"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-500 font-mono px-1">
                                        <span>Fast (1s)</span>
                                        <span>Slow (5s)</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg border border-slate-700">
                                    <label className="text-sm text-slate-300">Show Progress Bar</label>
                                    <input 
                                        type="checkbox" 
                                        checked={config.showProgressBar}
                                        disabled={isExporting}
                                        onChange={(e) => setConfig({...config, showProgressBar: e.target.checked})}
                                        className="w-5 h-5 rounded border-slate-600 text-blue-600 bg-slate-700 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>
                     </div>
                )}
            </div>
          </div>
        )}

        {/* Right Panel: Preview */}
        <div ref={appContainerRef} className={clsx("flex-1 relative flex flex-col items-center justify-center", isFullscreen ? "bg-black" : "")}>
           
           {/* Exporting Modal Overlay */}
           {isExporting && (
             <div className="absolute inset-0 z-[60] bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-6 animate-in fade-in">
                 <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-slate-800 flex items-center justify-center">
                        <div className="w-full h-full rounded-full border-4 border-t-purple-500 border-r-blue-500 border-b-transparent border-l-transparent animate-spin absolute inset-0"/>
                        {exportProgress > 0 && <span className="text-2xl font-bold text-white">{exportProgress}%</span>}
                    </div>
                 </div>
                 <div className="text-center">
                     <h2 className="text-xl font-bold text-white mb-2">{exportProgress > 0 ? "Composing Video" : "Generating Image"}</h2>
                     <p className="text-slate-400 text-sm max-w-md">
                        {exportProgress > 0 ? "Please wait while we render your presentation frame by frame." : "Creating high-resolution snapshot..."}
                     </p>
                 </div>
                 {exportProgress > 0 && (
                 <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                    <Film size={12} />
                    <span>Rendering 1:1 (1080x1080) • 30 FPS • {config.theme} • {config.layout}</span>
                 </div>
                 )}
             </div>
           )}

           {/* Toolbar (Floating in Fullscreen) */}
           <div className={clsx(
               "absolute top-4 z-50 flex items-center gap-2 p-2 rounded-full bg-slate-800/80 backdrop-blur border border-white/10 shadow-2xl transition-opacity duration-300",
               isFullscreen && isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100",
               isExporting ? "hidden" : "" 
           )}>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center transition-transform active:scale-95 shadow-lg shadow-blue-500/30"
                title={isPlaying ? "Reset" : "Play Presentation"}
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
              </button>
              
              <div className="w-px h-6 bg-white/20 mx-1" />

              <button 
                onClick={handleRandomizeDesign}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Shuffle Design"
              >
                <Shuffle size={20} />
              </button>

              <div className="w-px h-6 bg-white/20 mx-1" />

              <button 
                onClick={toggleFullscreen}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Fullscreen Mode"
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
           </div>

           <TablePreview 
              data={data}
              config={config}
              isPlaying={isPlaying}
              onAnimationComplete={() => setIsPlaying(false)}
              isFullscreen={isFullscreen}
              voicePcm={voicePcm}
           />
        </div>

      </main>
    </div>
  );
}

export default App;