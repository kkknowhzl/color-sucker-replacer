export enum ToolMode {
  COLOR_PICKER = 'COLOR_PICKER',
  MEASURE = 'MEASURE',
}

export interface Point {
  x: number;
  y: number;
}

export interface ColorData {
  r: number;
  g: number;
  b: number;
  hex: string;
  x: number;
  y: number;
}

export interface MeasurementData {
  start: Point;
  end: Point | null;
  distancePixels: number;
}

export interface AIAnalysisResult {
  description: string;
  loading: boolean;
  error?: string;
}