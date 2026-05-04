import React, { useState } from 'react';
import { API_BASE } from '../config';

interface AddRudimentFormProps {
  onRudimentAdded?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const CATEGORIES = ['TECHNIQUE', 'FUNK', 'JAZZ', 'ROCK', 'METAL'];

const AddRudimentForm: React.FC<AddRudimentFormProps> = ({ onRudimentAdded, isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [sticking, setSticking] = useState('');
  const [targetBpm, setTargetBpm] = useState<number | ''>('');
  const [category, setCategory] = useState('TECHNIQUE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sticking || !targetBpm) return;

    setIsSubmitting(true);
    setIsError(false);
    try {
      const response = await fetch(`${API_BASE}/api/rudiments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sticking, target_bpm: Number(targetBpm), category }),
      });

      if (response.ok) {
        setName('');
        setSticking('');
        setTargetBpm('');
        setCategory('TECHNIQUE');
        if (onRudimentAdded) onRudimentAdded();
        if (onClose) onClose();
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

  const formFields = () => (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-[9px] uppercase tracking-[0.4em] text-slate-500 mb-1.5 ml-1 font-black">EXERCISE NAME</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 text-slate-100 placeholder-slate-600 transition-all font-bold text-xs"
          placeholder="PARADIDDLE..."
        />
      </div>
      <div>
        <label className="block text-[9px] uppercase tracking-[0.4em] text-slate-500 mb-1.5 ml-1 font-black">PATTERN</label>
        <input
          type="text"
          value={sticking}
          onChange={(e) => setSticking(e.target.value)}
          className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 text-slate-100 placeholder-slate-600 transition-all font-bold text-xs"
          placeholder="RLRR LRLL"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] uppercase tracking-[0.4em] text-slate-500 mb-1.5 ml-1 font-black">GOAL BPM</label>
          <input
            type="number"
            value={targetBpm}
            onChange={(e) => setTargetBpm(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 text-slate-100 placeholder-slate-600 transition-all font-mono font-black text-center"
            placeholder="000"
          />
        </div>
        <div>
          <label className="block text-[9px] uppercase tracking-[0.4em] text-slate-500 mb-1.5 ml-1 font-black">CATEGORY</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 text-slate-100 transition-all font-bold text-xs appearance-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting || !name}
        className={`w-full h-[42px] font-black uppercase text-[10px] tracking-[0.3em] rounded-xl transition-all active:scale-95 ${
          isError
            ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]'
            : 'bg-purple-600 hover:bg-purple-500 disabled:bg-slate-900 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]'
        }`}
      >
        {isSubmitting ? '...' : isError ? 'FAILED' : 'ADD'}
      </button>
    </form>
  );

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={onClose} />
          <div className="relative z-50 w-[90%] max-w-sm bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="text-[9px] uppercase tracking-[0.4em] text-slate-500 font-black mb-4">ADD RUDIMENT</div>
            {formFields()}
          </div>
        </div>
      )}
    </>
  );
};

export default AddRudimentForm;
