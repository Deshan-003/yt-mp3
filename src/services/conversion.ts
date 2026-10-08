import type { ConversionResult, ConversionUpdate } from '../types';
import { mockConversion } from './mockConversion';
export const MOCK_MODE = import.meta.env.DEV && import.meta.env.VITE_MOCK_MODE === 'true';
let resetPending: Promise<void> = Promise.resolve();
export interface ConversionService {
  startConversion(url: string, signal: AbortSignal, onUpdate: (update: ConversionUpdate) => void): Promise<ConversionResult>;
  resetConversion(): void;
}
export const conversionService: ConversionService = {
  resetConversion() {
    if (!MOCK_MODE && window.electronAPI) resetPending = window.electronAPI.resetConversion().catch(() => {});
  },
  async startConversion(url, signal, onUpdate) {
    if (MOCK_MODE) return mockConversion(url, signal, onUpdate);
    const api = window.electronAPI;
    if (!api) throw new Error('Open the Windows app to convert audio.');
    await resetPending;
    if (signal.aborted) throw new DOMException('Canceled', 'AbortError');
    const requestId = crypto.randomUUID();
    const unsubscribe = api.onConversionProgress(update => {
      if (update.requestId === requestId && !signal.aborted) onUpdate(update);
    });
    const cancel = () => { resetPending = api.cancelConversion(requestId).catch(() => {}); };
    signal.addEventListener('abort', cancel, { once: true });
    try {
      const response = await api.startConversion(requestId, url);
      if (signal.aborted || response.status === 'canceled') throw new DOMException('Canceled', 'AbortError');
      if (response.status === 'error') throw new Error(response.message);
      return response.result;
    } finally { signal.removeEventListener('abort', cancel); unsubscribe(); }
  }
};
