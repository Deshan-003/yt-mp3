import type { ConversionResult, ConversionStage, ConversionUpdate, FailureStage } from '../types';
export const failureMessages: Record<FailureStage, string> = {
  fetching: "Couldn't get information for this video.",
  downloading: "Couldn't download the audio. Please try again.",
  converting: "Couldn't convert this video. Please try again."
};
export function mockConversion(_url: string, signal: AbortSignal, onUpdate: (update: ConversionUpdate) => void): Promise<ConversionResult> {
  const video = { title: 'Midnight session · Sample audio', thumbnail: './demo-art.svg', duration: 264 };
  const failure = import.meta.env.DEV ? new URLSearchParams(location.search).get('fail') : null;
  return new Promise((resolve, reject) => {
    let progress = 0;
    const abort = () => { clearInterval(timer); reject(new DOMException('Canceled', 'AbortError')); };
    onUpdate({ ...video, stage: 'fetching', progress });
    const timer = setInterval(() => {
      progress = Math.min(progress + 4, 100);
      const stage: ConversionStage = progress < 20 ? 'fetching' : progress < 76 ? 'downloading' : 'converting';
      onUpdate({ ...video, stage, progress });
      if (failure === stage) {
        clearInterval(timer); signal.removeEventListener('abort', abort); reject(new Error(failureMessages[stage]));
      } else if (progress === 100) {
        clearInterval(timer); signal.removeEventListener('abort', abort);
        resolve({ ...video, id: 'demo-audio', sizeBytes: 10560000, format: 'MP3', bitrate: 320, isMock: true });
      }
    }, 180);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}
