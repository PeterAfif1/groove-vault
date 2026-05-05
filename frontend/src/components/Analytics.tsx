import { useEffect, useState } from 'react';
import { API_BASE } from '../config';

interface Stats {
  total_sessions: number;
  average_bpm: number;
  active_rudiments: number;
  streak_days: number;
}

interface Rudiment {
  id: number;
  name: string;
  category: string;
  current_bpm: number | null;
  target_bpm: number;
  session_count: number;
}

const StatCard = ({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) => (
  <div className="bg-slate-900/40 border border-slate-900/50 rounded-2xl p-5 flex flex-col gap-2">
    <span className="text-[9px] uppercase tracking-[0.4em] font-black text-slate-500">{label}</span>
    <span className={`text-4xl font-black font-mono tracking-tighter ${accent ? 'text-cyan-400' : 'text-slate-100'}`}>
      {value}
    </span>
  </div>
);

const Analytics = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rudiments, setRudiments] = useState<Rudiment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, rudimentsRes] = await Promise.all([
          fetch(`${API_BASE}/api/rudiments/stats`),
          fetch(`${API_BASE}/api/rudiments`),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (rudimentsRes.ok) setRudiments(await rudimentsRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40 text-cyan-500 font-mono uppercase tracking-[0.8em] text-[10px] animate-pulse">
        SYNCING ENGINE...
      </div>
    );
  }

  const masteryBuckets = [
    { label: '75–100%', min: 75, max: 100 },
    { label: '50–75%', min: 50, max: 75 },
    { label: '25–50%', min: 25, max: 50 },
    { label: '0–25%',  min: 0,  max: 25 },
  ].map((bucket) => ({
    ...bucket,
    count: rudiments.filter((r) => {
      const pct = r.current_bpm ? Math.min((r.current_bpm / r.target_bpm) * 100, 100) : 0;
      return pct >= bucket.min && pct < bucket.max;
    }).length,
  }));

  const maxBucketCount = Math.max(...masteryBuckets.map((b) => b.count), 1);

  const topPracticed = [...rudiments]
    .sort((a, b) => b.session_count - a.session_count)
    .slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <div className="mt-10 md:mt-0">
        <div className="flex items-center gap-4 mb-4">
          <span className="bg-cyan-500/10 text-cyan-500 text-[9px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border border-cyan-500/20">
            {stats?.streak_days ?? 0} DAY STREAK
          </span>
        </div>
        <h1 className="text-6xl font-black text-slate-100 tracking-tighter uppercase italic leading-none">
          YOUR<br/>STATS
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Sessions" value={stats?.total_sessions ?? 0} accent />
        <StatCard label="Avg BPM" value={stats?.average_bpm ?? 0} />
        <StatCard label="Rudiments" value={stats?.active_rudiments ?? 0} />
        <StatCard label="Day Streak" value={stats?.streak_days ?? 0} accent />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 border border-slate-900/50 rounded-2xl p-6">
          <div className="text-[9px] uppercase tracking-[0.4em] font-black text-slate-500 mb-6">
            Mastery Distribution
          </div>
          <div className="space-y-4">
            {masteryBuckets.map((bucket) => (
              <div key={bucket.label} className="flex items-center gap-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-16 shrink-0">
                  {bucket.label}
                </span>
                <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-700"
                    style={{ width: `${(bucket.count / maxBucketCount) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-black font-mono text-slate-400 w-4 text-right">
                  {bucket.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-900/50 rounded-2xl p-6">
          <div className="text-[9px] uppercase tracking-[0.4em] font-black text-slate-500 mb-6">
            Most Practiced
          </div>
          {topPracticed.length === 0 ? (
            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-black">No sessions logged yet</p>
          ) : (
            <div className="space-y-0">
              {topPracticed.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center gap-4 py-4 border-b border-slate-900/80 last:border-0 last:pb-0"
                >
                  <span className="text-[11px] font-black font-mono text-slate-700 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-100 truncate">{r.name}</p>
                  </div>
                  <span className="text-[9px] font-black text-cyan-500 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-1 uppercase tracking-wider shrink-0">
                    {(r.category || 'technique').toUpperCase()}
                  </span>
                  <span className="text-[11px] font-black font-mono text-slate-500 shrink-0">
                    {r.session_count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
