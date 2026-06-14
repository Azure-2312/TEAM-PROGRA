export interface Analysis {
  id: number;
  imageUrl: string;
  fileName: string;
  result: 'Sano' | 'Con podredumbre' | 'Con parásitos';
  confidence: number;
  date: string;
}