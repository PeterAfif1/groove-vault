import React, { useState } from 'react';

interface AddRudimentFormProps {
  onRudimentAdded?: () => void;
}

const AddRudimentForm: React.FC<AddRudimentFormProps> = ({ onRudimentAdded }) => {
  const [name, setName] = useState('');
  const [sticking, setSticking] = useState('');
  const [targetBpm, setTargetBpm] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sticking || !targetBpm) return;

    setIsSubmitting(true);
    setIsError(false);
    try {
      const response = await fetch('/api/rudiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sticking, target_bpm: Number(targetBpm) }),
      });

      if (response.ok) {
        setName('');
        setSticking('');
        setTargetBpm('');
        if (onRudimentAdded) onRudimentAdded();
      } else {
        setIsError(true);
        setTimeout(() => setIsError(false), 2000);
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
      setTimeout(() => setIsError(false), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-900 sticky top-0 z-50 py-4 px-8 mb-4">
      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto flex flex-col md:flex-row items-end gap-6">
        <div className="flex-1 w-full">
          <label className="block text-[9px] uppercase tracking-[0.4em] text-slate-700 mb-1.5 ml-1 font-black">EXERCISE NAME</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 text-slate-100 placeholder-slate-900 transition-all font-bold text-xs"
            placeholder="PARADIDDLE..."
          />
        </div>
        
        <div className="flex-[0.7] w-full">
          <label className="block text-[9px] uppercase tracking-[0.4em] text-slate-700 mb-1.5 ml-1 font-black">PATTERN</label>
          <input
            type="text"
            value={sticking}
            onChange={(e) => setSticking(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 text-slate-100 placeholder-slate-900 transition-all font-bold text-xs"
            placeholder="RLRR LRLL"
          />
        </div>

        <div className="w-full md:w-32">
          <label className="block text-[9px] uppercase tracking-[0.4em] text-slate-700 mb-1.5 ml-1 font-black">GOAL BPM</label>
          <input
            type="number"
            value={targetBpm}
            onChange={(e) => setTargetBpm(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 text-slate-100 placeholder-slate-900 transition-all font-mono font-black text-center"
            placeholder="000"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !name}
          className={`w-full md:w-auto px-10 h-[42px] font-black uppercase text-[10px] tracking-[0.3em] rounded-xl transition-all active:scale-95 ${
            isError
              ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]'
              : 'bg-purple-600 hover:bg-purple-500 disabled:bg-slate-900 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]'
          }`}
        >
          {isSubmitting ? '...' : isError ? 'FAILED' : 'ADD'}
        </button>
      </form>
    </div>
  );
};

export default AddRudimentForm;
