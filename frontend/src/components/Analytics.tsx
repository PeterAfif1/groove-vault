import { useEffect, useState } from 'react';
import type { Rudiment, PracticeLog, Stats } from '../types/api';

interface TrendData {
  rudiment: Rudiment;
  logs: PracticeLog[];
}

// ------------------------------------------------------------
// Sparkline
// Renders an SVG polyline of BPM values oldest→newest.
// Includes a dashed reference line at the target BPM so even
// a single data point is meaningful in context.
// ------------------------------------------------------------
const Sparkline = ({ logs, targetBpm }: { logs: PracticeLog[]; targetBpm: number }) => {
  const sorted = [...logs].reverse(); // API returns DESC; show oldest→newest left→right

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-9 text-[9px] font-black uppercase tracking-[0.3em] text-slate-800">
        NO SESSIONS YET
      </div>
    );
  }

  const W = 200;
  const H = 36;
  const PAD = 4;

  const bpms = sorted.map(l => l.current_bpm);
  // Include target in scale so the chart is always relative to goal
  const allValues = [...bpms, targetBpm];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 10; // prevent div/0 when all values are identical

  const toX = (i: number, total: number) =>
    PAD + (total === 1 ? (W - PAD * 2) / 2 : (i / (total - 1)) * (W - PAD * 2));
  const toY = (bpm: number) =>
    H - PAD - ((bpm - min) / range) * (H - PAD * 2);

  const pts = bpms.map((bpm, i) => ({ x: toX(i, bpms.length), y: toY(bpm) }));
  const polylinePoints = pts.map(p => `${p.x},${p.y}`).join(' ');
  const targetY = toY(targetBpm);

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {/* Dashed target-BPM reference line */}
      <line
        x1={PAD} y1={targetY} x2={W - PAD} y2={targetY}
        stroke="rgba(6,182,212,0.2)"
        strokeWidth="1"
        strokeDasharray="4,3"
      />
      {/* Trend line (only drawn when 2+ points) */}
      {bpms.length > 1 && (
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="rgb(6,182,212)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {/* Data-point dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="rgb(6,182,212)" />
      ))}
    </svg>
  );
};

// ------------------------------------------------------------
// StatCard — one of the three headline number cards
// ------------------------------------------------------------
const StatCard = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900/50 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
    <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/5 rounded-full blur-[80px]" />
    <div className="text-[9px] uppercase tracking-[0.4em] font-black text-slate-600 mb-4">{label}</div>
    <div className="text-5xl font-black font-mono text-slate-100 tracking-tighter">{value}</div>
    <div className="text-[9px] uppercase tracking-[0.3em] font-black text-slate-700 mt-2">{sub}</div>
  </div>
);

// ------------------------------------------------------------
// Analytics page
// ------------------------------------------------------------
const Analytics = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, rudimentsRes] = await Promise.all([
          fetch('/api/rudiments/stats'),
          fetch('/api/rudiments'),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());

        if (rudimentsRes.ok) {
          const rudiments: Rudiment[] = await rudimentsRes.json();
          const logResults = await Promise.all(
            rudiments.map(r =>
              fetch(`/api/rudiments/${r.id}/logs`).then(res => (res.ok ? res.json() : []))
            )
          );
          setTrends(
            rudiments.map((r, i) => ({ rudiment: r, logs: logResults[i] as PracticeLog[] }))
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full text-cyan-500 font-mono uppercase tracking-[0.8em] text-[10px] animate-pulse py-40">
        SYNCING ENGINE...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-16 p-8">
      {/* Header */}
      <div>
        <span className="bg-cyan-500/10 text-cyan-500 text-[9px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
          PERFORMANCE DATA
        </span>
        <h1 className="text-6xl font-black text-slate-100 tracking-tighter uppercase italic leading-none mt-4">
          ANALYTICS
        </h1>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="TOTAL SESSIONS"
          value={stats?.total_sessions ?? '0'}
          sub="ALL TIME"
        />
        <StatCard
          label="AVG BPM"
          value={stats?.average_bpm ?? '0'}
          sub="ACROSS ALL LOGS"
        />
        <StatCard
          label="ACTIVE RUDIMENTS"
          value={stats?.active_rudiments ?? '0'}
          sub="WITH LOGGED SESSIONS"
        />
      </div>

      {/* BPM trend cards */}
      {trends.length > 0 ? (
        <div className="space-y-6">
          <div className="text-[9px] uppercase tracking-[0.4em] font-black text-slate-600">
            BPM TRENDS
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {trends.map(({ rudiment, logs }) => {
              const mastered =
                rudiment.current_bpm != null &&
                rudiment.current_bpm >= rudiment.target_bpm;

              return (
                <div
                  key={rudiment.id}
                  className="bg-slate-900/40 backdrop-blur-md border border-slate-900/50 p-6 rounded-[2rem] shadow-2xl"
                >
                  {/* Name + category */}
                  <div className="mb-4">
                    <span className="text-[9px] uppercase tracking-[0.4em] font-black text-slate-600 block mb-1">
                      {rudiment.category || 'EXERCISE'}
                    </span>
                    <h3 className="text-base font-black text-slate-100 uppercase tracking-tight">
                      {rudiment.name}
                    </h3>
                  </div>

                  {/* Sparkline */}
                  <div className="mb-5">
                    <Sparkline logs={logs} targetBpm={rudiment.target_bpm} />
                  </div>

                  {/* Latest BPM vs goal */}
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.3em] font-black text-slate-600 mb-1">
                        LATEST
                      </div>
                      <div className="text-2xl font-black font-mono text-slate-100 tracking-tighter">
                        {rudiment.current_bpm ?? '—'}
                        <span className="text-[10px] font-black text-slate-700 ml-1">BPM</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] uppercase tracking-[0.3em] font-black text-slate-600 mb-1">
                        GOAL
                      </div>
                      <div className="text-2xl font-black font-mono text-slate-500 tracking-tighter">
                        {rudiment.target_bpm}
                        <span className="text-[10px] font-black text-slate-700 ml-1">BPM</span>
                      </div>
                    </div>
                  </div>

                  {/* Session count + mastery status */}
                  <div className="mt-4 flex justify-between text-[9px] uppercase font-black tracking-[0.2em]">
                    <span className="text-slate-700">
                      {logs.length} SESSION{logs.length !== 1 ? 'S' : ''}
                    </span>
                    {logs.length > 0 && (
                      <span className={mastered ? 'text-cyan-500' : 'text-slate-700'}>
                        {mastered
                          ? 'MASTERED'
                          : `${rudiment.target_bpm - (rudiment.current_bpm ?? 0)} BPM TO GO`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-24">
          <p className="text-slate-700 font-black uppercase tracking-[0.4em] text-xs">
            LOG A SESSION TO SEE TRENDS
          </p>
        </div>
      )}
    </div>
  );
};

export default Analytics;
