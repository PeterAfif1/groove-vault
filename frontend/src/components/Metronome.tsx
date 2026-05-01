import { useState, useRef, useEffect, useCallback } from 'react';

/* ============================================================
   TYPE DEFINITIONS
   ============================================================ */

type TimeSignature = '4/4' | '3/4' | '6/8' | '5/4';
type Subdivision = 1 | 2 | 3 | 4; // quarter, 8th, triplet, 16th

interface ScheduledNote {
  time: number;
  beatIndex: number;    // which beat in the measure (0-based)
  subIndex: number;     // which subdivision within the beat (0-based)
  isAccent: boolean;    // true for beat 1
}

/* ============================================================
   CONSTANTS
   ============================================================ */

const MIN_BPM = 40;
const MAX_BPM = 240;

// Web Audio lookahead scheduler constants:
// - scheduleAheadTime: how far ahead (seconds) to schedule notes
// - lookaheadInterval: how often (ms) the scheduler checks for notes
// Using a large lookahead with frequent checks ensures timing accuracy
// even when the main thread is busy with React rendering.
const SCHEDULE_AHEAD_TIME = 0.1;  // 100ms lookahead
const LOOKAHEAD_INTERVAL = 25;    // check every 25ms

const TIME_SIGNATURES: { label: string; value: TimeSignature; beats: number }[] = [
  { label: '4/4', value: '4/4', beats: 4 },
  { label: '3/4', value: '3/4', beats: 3 },
  { label: '6/8', value: '6/8', beats: 6 },
  { label: '5/4', value: '5/4', beats: 5 },
];

const SUBDIVISIONS: { label: string; value: Subdivision }[] = [
  { label: '1/4', value: 1 },
  { label: '1/8', value: 2 },
  { label: 'TRIP', value: 3 },
  { label: '1/16', value: 4 },
];

/* ============================================================
   HELPER: Get beat count from time signature
   ============================================================ */
function getBeatsForSignature(sig: TimeSignature): number {
  return TIME_SIGNATURES.find(t => t.value === sig)!.beats;
}

/* ============================================================
   HELPER: Generate a click sound using Web Audio API
   Programmatic synthesis — no audio files needed.
   Beat 1 gets a higher pitch (880Hz) to stand out from others (440Hz).
   Each click is a short sine wave with a fast exponential decay.
   ============================================================ */
function playClick(
  audioCtx: AudioContext,
  time: number,
  isAccent: boolean,
  isSubdivision: boolean
) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  // Accent (beat 1) = high pitch, loud
  // Main beat = medium pitch, medium volume
  // Subdivision = lower pitch, quieter
  if (isAccent) {
    osc.frequency.value = 880;
    gain.gain.value = 1.0;
  } else if (!isSubdivision) {
    osc.frequency.value = 440;
    gain.gain.value = 0.7;
  } else {
    osc.frequency.value = 330;
    gain.gain.value = 0.35;
  }

  osc.type = 'sine';
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  // Very short click: ramp gain to zero over 30ms for a sharp percussive sound
  osc.start(time);
  gain.gain.setValueAtTime(gain.gain.value, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
  osc.stop(time + 0.03);
}

/* ============================================================
   METRONOME COMPONENT
   ============================================================ */
const Metronome = () => {
  /* ----------------------------------------------------------
     STATE
     ---------------------------------------------------------- */
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeSig, setTimeSig] = useState<TimeSignature>('4/4');
  const [subdivision, setSubdivision] = useState<Subdivision>(1);
  const [currentBeat, setCurrentBeat] = useState(-1);       // visual highlight: which beat
  const [currentSub, setCurrentSub] = useState(-1);          // visual highlight: which sub
  const [tapTimes, setTapTimes] = useState<number[]>([]);    // tap tempo history

  /* ----------------------------------------------------------
     REFS — mutable values the scheduler closure needs access to
     without causing re-renders or stale closures.
     ---------------------------------------------------------- */
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);        // lookahead setInterval id
  const nextNoteTimeRef = useRef(0);                   // when the next note is due (AudioContext time)
  const currentBeatRef = useRef(0);                    // scheduler's beat counter
  const currentSubRef = useRef(0);                     // scheduler's subdivision counter
  const bpmRef = useRef(bpm);
  const timeSigRef = useRef(timeSig);
  const subdivisionRef = useRef(subdivision);
  const isPlayingRef = useRef(false);

  // Keep refs in sync with state so the scheduler always reads fresh values
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { timeSigRef.current = timeSig; }, [timeSig]);
  useEffect(() => { subdivisionRef.current = subdivision; }, [subdivision]);

  /* ----------------------------------------------------------
     SCHEDULER
     This is the heart of the metronome.
     Instead of relying on setInterval for timing (which drifts),
     we use a "lookahead" pattern:
       1. A setInterval fires frequently (~25ms)
       2. Each time it fires, we check if any notes fall within
          the next 100ms window
       3. If so, we schedule them with the Web Audio API, which
          uses the hardware audio clock for sample-accurate timing
     This approach is the standard best-practice for web metronomes.
     ---------------------------------------------------------- */
  const scheduleNote = useCallback((beatIndex: number, subIndex: number, time: number) => {
    const isAccent = beatIndex === 0 && subIndex === 0;
    const isSubBeat = subIndex > 0;
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    playClick(ctx, time, isAccent, isSubBeat);

    // Update visual state — schedule it close to when the sound plays
    // Using setTimeout aligned to the audio clock for visual sync
    const delay = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => {
      setCurrentBeat(beatIndex);
      setCurrentSub(subIndex);
    }, delay);
  }, []);

  const advanceNote = useCallback(() => {
    // Calculate the duration of one subdivision in seconds
    const secondsPerBeat = 60.0 / bpmRef.current;
    const secondsPerSub = secondsPerBeat / subdivisionRef.current;

    // Move to the next subdivision
    currentSubRef.current++;
    if (currentSubRef.current >= subdivisionRef.current) {
      currentSubRef.current = 0;
      currentBeatRef.current++;
      if (currentBeatRef.current >= getBeatsForSignature(timeSigRef.current)) {
        currentBeatRef.current = 0;
      }
    }

    // Advance the clock
    nextNoteTimeRef.current += secondsPerSub;
  }, []);

  const schedulerTick = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Schedule all notes that fall within our lookahead window
    while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
      scheduleNote(currentBeatRef.current, currentSubRef.current, nextNoteTimeRef.current);
      advanceNote();
    }
  }, [scheduleNote, advanceNote]);

  /* ----------------------------------------------------------
     START / STOP
     ---------------------------------------------------------- */
  const start = useCallback(() => {
    // Create or resume AudioContext (browsers require user gesture to start)
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    // Reset counters
    currentBeatRef.current = 0;
    currentSubRef.current = 0;
    nextNoteTimeRef.current = audioCtxRef.current.currentTime;

    isPlayingRef.current = true;
    setIsPlaying(true);

    // Start the lookahead scheduler
    timerRef.current = window.setInterval(schedulerTick, LOOKAHEAD_INTERVAL);
    schedulerTick();
  }, [schedulerTick]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentBeat(-1);
    setCurrentSub(-1);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      stop();
    } else {
      start();
    }
  }, [start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  /* ----------------------------------------------------------
     TAP TEMPO
     Collects timestamps from the last 4 taps, computes average
     interval between them, and derives BPM.
     Resets if more than 2 seconds between taps (user paused).
     ---------------------------------------------------------- */
  const handleTap = useCallback(() => {
    const now = performance.now();
    setTapTimes(prev => {
      // Reset if gap > 2 seconds
      const filtered = prev.length > 0 && (now - prev[prev.length - 1]) > 2000
        ? [now]
        : [...prev, now].slice(-4); // keep last 4 taps

      // Need at least 2 taps to calculate BPM
      if (filtered.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < filtered.length; i++) {
          intervals.push(filtered[i] - filtered[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const tappedBpm = Math.round(60000 / avgInterval);
        const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, tappedBpm));
        setBpm(clamped);
      }

      return filtered;
    });
  }, []);

  /* ----------------------------------------------------------
     BPM CHANGE HANDLER
     ---------------------------------------------------------- */
  const handleBpmChange = useCallback((value: number) => {
    const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, value));
    setBpm(clamped);
  }, []);

  /* ----------------------------------------------------------
     DERIVED VALUES for rendering the beat grid
     ---------------------------------------------------------- */
  const beats = getBeatsForSignature(timeSig);
  const totalSlots = beats * subdivision; // total visual slots in the grid

  /* ----------------------------------------------------------
     RENDER
     ---------------------------------------------------------- */
  return (
    <div className="max-w-3xl mx-auto space-y-12 py-8">

      {/* ---- HEADER ---- */}
      <div>
        <span className="bg-cyan-500/10 text-cyan-500 text-[9px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
          PRECISION ENGINE
        </span>
        <h1 className="text-6xl font-black text-slate-100 tracking-tighter uppercase italic leading-none mt-4">
          METRONOME
        </h1>
      </div>

      {/* ============================================================
          BPM DISPLAY & SLIDER
          Large BPM readout with a synced slider + number input.
          ============================================================ */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900/50 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/5 rounded-full blur-[80px]"></div>

        {/* Big BPM number */}
        <div className="flex items-end justify-center gap-3 mb-8">
          <input
            type="number"
            value={bpm}
            onChange={(e) => handleBpmChange(Number(e.target.value))}
            min={MIN_BPM}
            max={MAX_BPM}
            className="bg-transparent text-8xl font-black font-mono text-cyan-400 tracking-tighter text-center w-56 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-4">BPM</span>
        </div>

        {/* Slider */}
        <input
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          value={bpm}
          onChange={(e) => handleBpmChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(6,182,212,0.5)] [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:hover:shadow-[0_0_25px_rgba(6,182,212,0.7)]"
        />
        <div className="flex justify-between text-[9px] font-black text-slate-700 uppercase tracking-widest mt-2">
          <span>{MIN_BPM}</span>
          <span>{MAX_BPM}</span>
        </div>
      </div>

      {/* ============================================================
          BEAT GRID
          Visual representation of the current measure. Each slot
          lights up as the metronome plays. Beat 1 gets cyan accent,
          other beats get a dimmer color. Subdivisions are smaller.
          ============================================================ */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900/50 p-8 rounded-[2rem] shadow-2xl">
        <div className="text-[9px] uppercase tracking-[0.4em] text-slate-600 font-black mb-6">BEAT GRID</div>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          {Array.from({ length: totalSlots }).map((_, i) => {
            const beatIdx = Math.floor(i / subdivision);
            const subIdx = i % subdivision;
            const isMainBeat = subIdx === 0;
            const isActive = currentBeat === beatIdx && currentSub === subIdx;
            const isBeatOne = beatIdx === 0 && subIdx === 0;

            return (
              <div
                key={i}
                className={`
                  rounded-full transition-all duration-100
                  ${isMainBeat ? 'w-10 h-10' : 'w-6 h-6'}
                  ${isActive && isBeatOne
                    ? 'bg-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.8)] scale-125'
                    : isActive
                      ? 'bg-purple-500 shadow-[0_0_25px_rgba(147,51,234,0.7)] scale-110'
                      : isMainBeat
                        ? 'bg-slate-800 border-2 border-slate-700'
                        : 'bg-slate-900 border border-slate-800'
                  }
                `}
              />
            );
          })}
        </div>

        {/* Beat numbers below the grid */}
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          {Array.from({ length: totalSlots }).map((_, i) => {
            const subIdx = i % subdivision;
            const beatIdx = Math.floor(i / subdivision);
            const isMainBeat = subIdx === 0;
            return (
              <div key={i} className={`${isMainBeat ? 'w-10' : 'w-6'} text-center`}>
                {isMainBeat && (
                  <span className="text-[10px] font-black text-slate-600">{beatIdx + 1}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          CONTROLS ROW
          Time signature, subdivision selector, tap tempo, start/stop.
          ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ---- Time Signature ---- */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900/50 p-6 rounded-[2rem] shadow-2xl">
          <div className="text-[9px] uppercase tracking-[0.4em] text-slate-600 font-black mb-4">TIME SIGNATURE</div>
          <div className="flex gap-2">
            {TIME_SIGNATURES.map((ts) => (
              <button
                key={ts.value}
                onClick={() => {
                  setTimeSig(ts.value);
                  // Reset beat display when switching signatures mid-play
                  if (isPlaying) { stop(); }
                }}
                className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
                  timeSig === ts.value
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900/50 text-slate-600 hover:text-slate-300 border border-slate-900 hover:border-slate-800'
                }`}
              >
                {ts.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---- Subdivisions ---- */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900/50 p-6 rounded-[2rem] shadow-2xl">
          <div className="text-[9px] uppercase tracking-[0.4em] text-slate-600 font-black mb-4">SUBDIVISION</div>
          <div className="flex gap-2">
            {SUBDIVISIONS.map((sub) => (
              <button
                key={sub.value}
                onClick={() => {
                  setSubdivision(sub.value);
                  if (isPlaying) { stop(); }
                }}
                className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
                  subdivision === sub.value
                    ? 'bg-purple-600 text-white shadow-[0_0_25px_rgba(147,51,234,0.4)]'
                    : 'bg-slate-900/50 text-slate-600 hover:text-slate-300 border border-slate-900 hover:border-slate-800'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================
          ACTION BUTTONS — Start/Stop and Tap Tempo
          ============================================================ */}
      <div className="flex gap-4">
        {/* Start / Stop */}
        <button
          onClick={togglePlay}
          className={`flex-1 py-5 rounded-2xl font-black uppercase text-sm tracking-[0.3em] transition-all active:scale-[0.98] ${
            isPlaying
              ? 'bg-red-500/90 hover:bg-red-400 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)]'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.4)]'
          }`}
        >
          {isPlaying ? 'STOP' : 'START'}
        </button>

        {/* Tap Tempo — user taps repeatedly, BPM is derived from interval */}
        <button
          onClick={handleTap}
          className="flex-1 py-5 rounded-2xl font-black uppercase text-sm tracking-[0.3em] transition-all active:scale-[0.98]
            bg-slate-900/50 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700
            active:bg-slate-800"
        >
          TAP TEMPO
          {tapTimes.length >= 2 && (
            <span className="ml-2 text-cyan-500 text-[10px]">({tapTimes.length - 1} taps)</span>
          )}
        </button>
      </div>

      {/* ============================================================
          INFO FOOTER — shows computed timing info
          ============================================================ */}
      <div className="flex justify-center gap-8 text-[9px] font-black text-slate-700 uppercase tracking-[0.3em]">
        <span>INTERVAL: {Math.round(60000 / bpm)}MS</span>
        <span>BEATS: {beats}</span>
        <span>SUBS: {subdivision}x</span>
      </div>
    </div>
  );
};

export default Metronome;
