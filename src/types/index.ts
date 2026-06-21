export interface TextAnnotation {
  id: string;
  text: string;
  x: number; // percentage width of the image (0 - 100)
  y: number; // percentage height of the image (0 - 100)
  color: string;
  fontSize: number; // relative size (e.g., 14 to 32)
}

export interface DrawingStroke {
  id: string;
  points: { x: number; y: number }[]; // array of points, each x/y is 0 to 100 (percentage)
  color: string;
  width: number; // line width
}

export interface CropArea {
  x: number; // percentage start (0-100)
  y: number; // percentage start (0-100)
  width: number; // percentage width (0-100)
  height: number; // percentage height (0-100)
}

export interface ProcessedImage {
  id: string;
  name: string;
  file: File;
  previewUrl: string; // local blob URL
  width: number; // original width
  height: number; // original height
  rotation: number; // 0, 90, 180, 270 degrees clockwise
  crop?: CropArea;
  annotations: TextAnnotation[];
  drawings: DrawingStroke[];
}

export interface PDFGenerationSettings {
  pageSize: 'a4' | 'letter' | 'fit';
  orientation: 'portrait' | 'landscape' | 'auto';
  margin: number; // padding in mm (e.g., 0, 10, 20)
  quality: number; // JPEG compression ratio (0.1 to 1.0)
  maxDimension: number; // Max resolution size constraint (e.g., 800, 1600, 2400)
}
