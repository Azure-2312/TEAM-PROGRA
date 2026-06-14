export interface User {
  id: number;
  fullName: string;
  email: string;
  username: string;
  totalAnalyses: number;
  imageUrl?: string;
}