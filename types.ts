
export interface SessionHistory {
  id: string;
  duration: number; // seconds
  date: string; // ISO format: YYYY-MM-DD
}

export interface ZenQuote {
  quote: string;
  author: string;
  advice: string;
}

export interface CompletionBlessing {
  title: string;
  message: string;
}

export enum TimerStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}
