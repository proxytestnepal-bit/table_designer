
export interface TableData {
  title?: string;
  columns: string[];
  data: string[][];
  sources?: string[];
  summary?: string; // For TTS
}

export enum AnimationStyle {
  FADE_UP = 'fade_up',
  SLIDE_RIGHT = 'slide_right',
  POP = 'pop',
}

export enum Theme {
  COSMIC = 'cosmic',
  NEON = 'neon',
  LUXE = 'luxe',
  GLASS = 'glass'
}

export enum Layout {
  STACKED = 'stacked',
  SPLIT = 'split',
  DIAGONAL = 'diagonal',
  MAGAZINE = 'magazine',
  LOWER_THIRD = 'lower_third'
}

export interface AnimationConfig {
  style: AnimationStyle;
  theme: Theme;
  layout: Layout;
  rowDelay: number; // seconds
  highlightActive: boolean;
  showProgressBar: boolean;
  durationPerItem: number;
  backgroundImage?: string; // base64
  backgroundImagePrompt?: string; 
  showAppName: boolean;
  showAiWatermark: boolean;
}
