import { useEffect, useRef, useState } from 'react';
import { conversionService } from '../services/conversion';
import type { AppState, ConversionResult, ConversionUpdate } from '../types';
export function useConversion() {
  const [state, setState] = useState<AppState>('idle');
  const [update, setUpdate] = useState<ConversionUpdate | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState('');
  const task = useRef<AbortController | null>(null);
  useEffect(() => () => { task.current?.abort(); conversionService.resetConversion(); }, []);
  const reset = () => {
    task.current?.abort(); task.current = null;
    conversionService.resetConversion();
    setState('idle'); setUpdate(null); setResult(null); setError('');
  };
  const startConversion = async (url: string) => {
    if (task.current) return;
    const controller = new AbortController(); task.current = controller;
    setError(''); setState('fetching'); setResult(null); setUpdate(null);
    try {
      const data = await conversionService.startConversion(url, controller.signal, next => {
        if (task.current === controller) { setUpdate(next); setState(next.stage); }
      });
      if (task.current === controller) { setResult(data); setState('completed'); }
    } catch (error) {
      if (task.current === controller && !controller.signal.aborted) {
        setError(error instanceof Error ? error.message : "Couldn't convert this video. Please try again."); setState('error');
      }
    } finally { if (task.current === controller) task.current = null; }
  };
  return { state, update, result, error, startConversion, cancelConversion: reset, reset };
}
