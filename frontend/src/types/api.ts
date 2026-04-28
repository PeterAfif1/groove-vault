export interface Rudiment {
  id: number;
  name: string;
  sticking: string;
  target_bpm: number;
  current_bpm: number | null;
  previous_bpm: number | null;
  category: string;
  video_url: string | null;
}

export interface PracticeLog {
  id: number;
  rudiment_id: number;
  date: string;
  current_bpm: number;
}

export interface Stats {
  total_sessions: string;
  average_bpm: string | null;
  active_rudiments: string;
}
