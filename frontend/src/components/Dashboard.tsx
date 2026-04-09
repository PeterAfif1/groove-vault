import { useEffect, useState } from 'react';

interface Rudiment {
  id: number;
  name: string;
  sticking: string;
  target_bpm: number;
  current_bpm: number | null;
  previous_bpm: number | null;
  category: string;
}

interface PracticeLog {
  id: number;
  rudiment_id: number;
  date: string;
  current_bpm: number;
}

const RudimentCard = ({ rudiment }: { rudiment: Rudiment }) => {
  const [currentBpm, setCurrentBpm] = useState<number | ''>('');
  const [isLogging, setIsLogging] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<PracticeLog[]>([]);

  const handleLogSession = async () => {
    if (!currentBpm) return;
    setIsLogging(true);
    try {
      const response = await fetch(`/api/rudiments/${rudiment.id}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_bpm: Number(currentBpm) }),
      });
      if (response.ok) {
        setShowSaved(true);
        setCurrentBpm('');
        setTimeout(() => {
          setShowSaved(false);
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLogging(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/rudiments/${rudiment.id}/logs`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.slice(0, 3));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const progress = rudiment.current_bpm 
    ? Math.min(Math.round((rudiment.current_bpm / rudiment.target_bpm) * 100), 100) 
    : 0;

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900/50 p-6 rounded-[2rem] flex flex-col h-full group hover:border-cyan-500/30 transition-all duration-500 shadow-2xl relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/5 rounded-full blur-[80px] group-hover:bg-cyan-500/10 transition-all"></div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="text-[9px] uppercase tracking-[0.4em] font-black text-slate-600 mb-1 block">{rudiment.category || 'EXERCISE'}</span>
          <h2 className="text-xl font-black text-slate-100 tracking-tight group-hover:text-cyan-400 transition-colors duration-300 uppercase">{rudiment.name}</h2>
          <p className="text-[10px] font-mono text-slate-500 mt-2 tracking-[0.2em] bg-slate-950/50 px-3 py-1 rounded-full inline-block uppercase font-bold">{rudiment.sticking}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 mt-4">
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-[0.3em] text-slate-600 font-black mb-1">CURRENT TEMPO</span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-100 font-mono tracking-tighter">
                {rudiment.current_bpm || '00'}
              </span>
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">BPM</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-[0.3em] text-slate-600 font-black mb-1">GOAL</span>
            <span className="text-xl font-black text-slate-500 font-mono tracking-tighter">{rudiment.target_bpm}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[9px] uppercase font-black tracking-[0.2em]">
            <span className="text-cyan-500">{progress}% MASTERY</span>
            <span className="text-slate-700">{rudiment.target_bpm - (rudiment.current_bpm || 0)} BPM REMAINING</span>
          </div>
          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
            <div 
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="number"
              value={currentBpm}
              onChange={(e) => setCurrentBpm(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="000"
              className="w-full h-12 bg-slate-950/80 border border-slate-800 rounded-2xl px-4 text-xl font-black font-mono text-cyan-500 placeholder-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all text-center"
            />
          </div>
          <button
            onClick={handleLogSession}
            disabled={isLogging || !currentBpm}
            className={`h-12 px-6 font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl transition-all active:scale-95 shadow-xl ${
              showSaved 
                ? 'bg-green-500 text-slate-950' 
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]'
            }`}
          >
            {isLogging ? '...' : showSaved ? 'SAVED' : 'START SESSION'}
          </button>
        </div>

        <button
          onClick={() => {
            if (!showHistory) fetchHistory();
            setShowHistory(!showHistory);
          }}
          className="text-[9px] uppercase tracking-[0.4em] font-black text-slate-700 hover:text-cyan-500 transition-colors py-2"
        >
          {showHistory ? 'CLOSE HISTORY' : 'VIEW HISTORY'}
        </button>

        {showHistory && history.length > 0 && (
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-900 space-y-3">
            {history.map((log) => (
              <div key={log.id} className="flex justify-between items-center text-[10px] font-mono border-b border-slate-900 pb-2 last:border-0 last:pb-0">
                <span className="text-slate-600 uppercase font-bold">{new Date(log.date).toLocaleDateString()}</span>
                <span className="font-black text-cyan-400">{log.current_bpm} BPM</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [rudiments, setRudiments] = useState<Rudiment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState('ALL');

  const categories = ['ALL', 'FUNK', 'JAZZ', 'ROCK', 'TECHNIQUE', 'METAL'];

  useEffect(() => {
    const fetchRudiments = async () => {
      try {
        const response = await fetch('/api/rudiments');
        const data = await response.json();
        setRudiments(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRudiments();
  }, []);

  const filteredRudiments = filter === 'ALL' 
    ? rudiments 
    : rudiments.filter(r => (r.category || '').toUpperCase() === filter);

  if (loading) return <div className="flex justify-center items-center h-full text-cyan-500 font-mono uppercase tracking-[0.8em] text-[10px] animate-pulse py-40">SYNCING ENGINE...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <span className="bg-cyan-500/10 text-cyan-500 text-[9px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              5 DAY STREAK
            </span>
            <span className="text-slate-800 text-[10px] font-black uppercase tracking-widest">•</span>
            <span className="text-slate-600 text-[9px] font-black uppercase tracking-[0.3em]">RANK: MASTER LEVEL 4</span>
          </div>
          <h1 className="text-6xl font-black text-slate-100 tracking-tighter uppercase italic leading-none">WELCOME BACK,<br/>DRUMMER</h1>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${
                filter === cat 
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.4)]' 
                  : 'bg-slate-900/50 text-slate-600 hover:text-slate-300 border border-slate-900 hover:border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {filteredRudiments.map((rudiment) => (
          <RudimentCard key={rudiment.id} rudiment={rudiment} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
