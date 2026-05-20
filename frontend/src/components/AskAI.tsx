import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { API_BASE } from '../config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

const SUGGESTIONS = [
  "How do I fix my double stroke roll?",
  "What's the correct grip for ghost notes?",
  "How do I build double bass speed?",
];

const TypingBubble = () => (
  <div className="flex items-end gap-3 justify-start">
    <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
      <span className="text-[8px] font-black text-cyan-500">AI</span>
    </div>
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl rounded-bl-sm px-5 py-3">
      <div className="flex gap-1.5 items-center h-4">
        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  </div>
);

type UploadStatus = 'idle' | 'uploading' | { chunks: number } | { error: string };

const AskAI = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Upload panel state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (f: File | null) => {
    if (!f) return;
    setUploadFile(f);
    if (!uploadTitle) setUploadTitle(f.name.replace(/\.pdf$/i, ''));
    setUploadStatus('idle');
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    setUploadStatus('uploading');
    try {
      const form = new FormData();
      form.append('file', uploadFile);
      form.append('title', uploadTitle || uploadFile.name.replace(/\.pdf$/i, ''));

      const res = await fetch(`${API_BASE}/api/ai/upload`, {
        method: 'POST',
        body: form,
      });

      if (res.ok) {
        const data = await res.json() as { chunksCreated: number };
        setUploadStatus({ chunks: data.chunksCreated });
        setUploadFile(null);
        setUploadTitle('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setUploadStatus({ error: 'Upload failed' });
      }
    } catch {
      setUploadStatus({ error: 'Could not reach server' });
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (input === '' && inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [input]);

  const send = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const history = messages
      .map(m => ({ role: m.role, content: m.content }))
      .slice(-6);

    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed, history }),
      });

      if (res.ok) {
        const data = await res.json() as { answer: string; sources: string[] };
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.answer, sources: data.sources },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'Something went wrong. Please try again.', sources: [] },
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Could not reach the server. Check your connection.', sources: [] },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] max-h-screen">

      {/* Header */}
      <div className="shrink-0 px-8 pt-8 pb-4 border-b border-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="bg-cyan-500/10 text-cyan-500 text-[9px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              POWERED BY GPT-4o
            </span>
            <h1 className="text-4xl font-black text-slate-100 tracking-tighter uppercase italic leading-none mt-3">
              ASK AI
            </h1>
          </div>

          <button
            onClick={() => { setUploadOpen(o => !o); setUploadStatus('idle'); }}
            className="mt-1 shrink-0 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300 transition-all"
          >
            {uploadOpen ? 'CLOSE' : 'IMPORT PDF'}
          </button>
        </div>

        {/* Upload panel */}
        {uploadOpen && (
          <div className="mt-4 p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col gap-3">

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setDragging(false);
                acceptFile(e.dataTransfer.files[0] ?? null);
              }}
              className={`cursor-pointer rounded-xl border-2 border-dashed px-5 py-6 flex flex-col items-center justify-center gap-2 transition-all
                ${dragging
                  ? 'border-cyan-500/60 bg-cyan-500/5'
                  : uploadFile
                    ? 'border-slate-600 bg-slate-800/40'
                    : 'border-slate-700 bg-slate-800/20 hover:border-slate-600 hover:bg-slate-800/30'
                }`}
            >
              {uploadFile ? (
                <>
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">PDF READY</span>
                  <span className="text-xs text-slate-300 font-medium truncate max-w-full">{uploadFile.name}</span>
                  <span className="text-[9px] text-slate-600 uppercase tracking-widest mt-1">Click to replace</span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {dragging ? 'DROP IT' : 'DRAG & DROP or CLICK TO BROWSE'}
                  </span>
                  <span className="text-[9px] text-slate-700 uppercase tracking-widest">PDF files only</span>
                </>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => acceptFile(e.target.files?.[0] ?? null)}
            />

            <input
              type="text"
              value={uploadTitle}
              onChange={e => setUploadTitle(e.target.value)}
              placeholder="Document title (optional)"
              className="bg-slate-950 border border-slate-800 focus:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none transition-all"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={() => void handleUpload()}
                disabled={!uploadFile || uploadStatus === 'uploading'}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 transition-all active:scale-95"
              >
                {uploadStatus === 'uploading' ? 'UPLOADING...' : 'UPLOAD'}
              </button>

              {typeof uploadStatus === 'object' && 'chunks' in uploadStatus && (
                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">
                  ✓ {uploadStatus.chunks} chunks created
                </span>
              )}
              {typeof uploadStatus === 'object' && 'error' in uploadStatus && (
                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                  {uploadStatus.error}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-8 pb-12">
            <div className="text-center">
              <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                <span className="text-xl font-black text-cyan-500 italic">AI</span>
              </div>
              <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight mb-2">
                Ask anything about drum technique
              </h2>
              <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em]">
                Answers pulled from your uploaded lesson materials
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="w-full text-left px-5 py-3.5 bg-slate-900/50 border border-slate-800 hover:border-cyan-500/30 hover:bg-slate-900 rounded-2xl text-slate-400 hover:text-slate-100 text-xs font-bold uppercase tracking-[0.15em] transition-all duration-200 active:scale-[0.98]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-black text-cyan-500">AI</span>
              </div>
            )}

            <div className={`max-w-[70%] flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cyan-500/20 border border-cyan-500/40 text-slate-100 rounded-br-sm font-medium whitespace-pre-wrap'
                    : 'bg-slate-800/50 border border-slate-700 text-slate-200 rounded-bl-sm'
                }`}
              >
                {msg.role === 'user' ? msg.content : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>

              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <p className="text-slate-500 text-xs italic px-1">
                  Sources: {msg.sources.join(', ')}
                </p>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-black text-purple-400">YOU</span>
              </div>
            )}
          </div>
        ))}

        {loading && <TypingBubble />}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-8 py-5 border-t border-slate-900 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
            placeholder="Ask about rudiments, technique, grip, speed..."
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 rounded-2xl px-5 py-3.5 text-sm text-slate-100 placeholder-slate-600 resize-none outline-none transition-all font-medium leading-relaxed disabled:opacity-50"
            style={{ overflowY: 'auto' }}
          />
          <button
            onClick={() => void send(input)}
            disabled={loading || !input.trim()}
            className="h-[46px] px-6 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-900 disabled:text-slate-700 text-slate-950 font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl transition-all active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.35)] shrink-0"
          >
            SEND
          </button>
        </div>
        <p className="text-center text-slate-700 text-[9px] font-black uppercase tracking-widest mt-3">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default AskAI;
