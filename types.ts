export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface AppState {
  status: GenerationStatus;
  userImage: string | null; // Base64
  referenceImage: string | null; // Base64
  generatedImages: GeneratedImage[];
  errorMsg: string | null;
}
