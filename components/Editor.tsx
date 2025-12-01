import React from 'react';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface EditorProps {
  jsonString: string;
  setJsonString: (val: string) => void;
  isValid: boolean;
  errorMessage: string | null;
}

export const Editor: React.FC<EditorProps> = ({ jsonString, setJsonString, isValid, errorMessage }) => {
  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
        <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-700">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Source (JSON)</span>
            <div className="flex items-center gap-2">
                {isValid ? (
                    <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 size={14}/> Valid</span>
                ) : (
                    <span className="flex items-center gap-1 text-xs text-red-400"><AlertCircle size={14}/> Invalid</span>
                )}
            </div>
        </div>
        <textarea
            value={jsonString}
            onChange={(e) => setJsonString(e.target.value)}
            className={clsx(
                "flex-1 w-full bg-slate-800 text-slate-200 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-inset",
                isValid ? "focus:ring-blue-500/50" : "focus:ring-red-500/50"
            )}
            spellCheck={false}
        />
        {errorMessage && (
            <div className="p-2 bg-red-900/20 text-red-300 text-xs border-t border-red-900/50">
                {errorMessage}
            </div>
        )}
    </div>
  );
};