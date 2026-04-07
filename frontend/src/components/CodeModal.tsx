import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';

interface Props {
  modelName: string;
  code: string;
  onClose: () => void;
}

const CodeModal: React.FC<Props> = ({ modelName, code, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Python Code — {modelName}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Self-contained · Mesa 3 · Copy and paste into a Google Colab notebook
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://colab.new"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Colab
            </a>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs text-white font-medium transition-all"
            >
              {copied ? (
                <><Check className="w-3.5 h-3.5" /> Copied!</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> Copy Code</>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Code block */}
        <div className="overflow-auto flex-1 p-4">
          <pre className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre">
            {code}
          </pre>
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-slate-700/50 text-xs text-slate-500">
          Tip: paste the whole script into a single cell, or split at <code className="text-slate-400">{'# %%'}</code> markers to create separate cells.
          Run <code className="text-slate-400">{'!pip install mesa numpy matplotlib'}</code> first if needed.
        </div>
      </div>
    </div>
  );
};

export default CodeModal;
