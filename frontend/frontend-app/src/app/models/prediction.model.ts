export interface PredictionResult {
  result: 'Sano' | 'Con podredumbre' | 'Con parásitos';
  confidence: number;
  recommendation: string;
  imageUrl?: string;
}