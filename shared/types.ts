export type AppState = 'idle' | 'fetching' | 'downloading' | 'converting' | 'completed' | 'error';
export type ConversionStage = 'fetching' | 'downloading' | 'converting';
export type FailureStage = ConversionStage;
export interface VideoInfo { title: string; thumbnail: string; duration: number }
export interface VideoMetadata extends VideoInfo { uploader: string; webpageUrl: string }
export interface ConversionProgress extends ConversionUpdate { requestId: string }
export type ConversionOutcome = { status: 'completed'; result: ConversionResult } | { status: 'error'; message: string } | { status: 'canceled' };
export interface ConversionUpdate extends VideoInfo { stage: ConversionStage; progress: number }
export interface ConversionResult extends VideoInfo { id: string; sizeBytes: number; format: 'MP3'; bitrate: 320; isMock: boolean }
export interface SaveRequest { resultId: string; title: string; isMock: boolean }
export type SaveResponse = { status: 'canceled' | 'preview' | 'saved' } | { status: 'error'; message: string };
export interface ElectronAPI {
  startConversion(requestId: string, url: string): Promise<ConversionOutcome>;
  cancelConversion(requestId: string): Promise<void>;
  resetConversion(): Promise<void>;
  onConversionProgress(callback: (update: ConversionProgress) => void): () => void;
  readClipboard(): Promise<string>;
  windowAction(action: 'minimize' | 'maximize' | 'close'): void;
  isMaximized(): Promise<boolean>;
  onMaximizedChange(callback: (maximized: boolean) => void): () => void;
  saveMp3(request: SaveRequest): Promise<SaveResponse>;
}
