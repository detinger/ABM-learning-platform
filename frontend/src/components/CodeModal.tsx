import React, { useState } from 'react';
import { Check, Copy, Download, ExternalLink } from 'lucide-react';
import { Dialog } from './ui';
import { downloadText } from '../lib/export';

interface Props {
  modelName: string;
  modelId: string;
  code: string;
  onClose: () => void;
}

const CodeModal: React.FC<Props> = ({ modelName, modelId, code, onClose }) => {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
    window.setTimeout(() => setCopied('idle'), 2000);
  };

  return (
    <Dialog
      title={`Python code: ${modelName}`}
      description="A self-contained Mesa 3 script using the current parameters. Paste it into a Google Colab notebook to run it."
      onClose={onClose}
      footer={
        <>
          <a className="btn" href="https://colab.new" target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} /> Open Colab
          </a>
          <button type="button" className="btn" onClick={() => downloadText(`${modelId}.py`, code, 'text/x-python')}>
            <Download size={16} /> Download .py
          </button>
          <button type="button" className="btn btn-primary" onClick={handleCopy}>
            {copied === 'copied' ? <Check size={16} /> : <Copy size={16} />}
            {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Copy failed' : 'Copy code'}
          </button>
        </>
      }
    >
      <p className="hint">
        Paste the whole script into one cell, or split it at <code>{'# %%'}</code> markers to create separate cells.
      </p>
      <pre className="code-block">
        <code>{code}</code>
      </pre>
    </Dialog>
  );
};

export default CodeModal;
