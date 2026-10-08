import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, Check, Folder, LoaderCircle } from 'lucide-react';
import type { ConversionResult } from '../types';
import { VideoInfo } from './VideoInfo';
import { ErrorMessage } from './ErrorMessage';
export function CompletedPanel({ result, reset }: { result: ConversionResult; reset(): void }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  async function saveConvertedFile() {
    setSaving(true); setMessage(''); setError('');
    try {
      if (!window.electronAPI) { setMessage('Save As is available in the Windows app. This preview does not create an MP3.'); return; }
      const response = await window.electronAPI.saveMp3({ resultId: result.id, title: result.title, isMock: result.isMock });
      if (response.status === 'preview') setMessage('Save location previewed. No file was written in demo mode.');
      if (response.status === 'saved') { setMessage('Your MP3 has been saved.'); setSaved(true); }
      if (response.status === 'error') setError(response.message);
    } catch { setError("Couldn't save the MP3. Check the selected location and try again."); }
    finally { setSaving(false); }
  }
  return <section className="state-panel">
    <div className="state-title"><span className="state-icon success"><Check size={21}/></span>
      <div><h2 ref={heading} tabIndex={-1}>MP3 Ready</h2><p>{result.isMock ? 'Conversion complete · Demo audio preview' : 'Your audio has been successfully converted.'}</p></div></div>
    <VideoInfo video={result} sizeBytes={result.sizeBytes}/>
    <div className="result-actions"><button className="primary" disabled={saving || saved} onClick={saveConvertedFile}>
      {saving ? <LoaderCircle className="spin" size={18}/> : saved ? <Check size={18}/> : <ArrowDownToLine size={18}/>}
      {saved ? 'Saved' : 'Save MP3'}</button>
      <button className="secondary" onClick={reset} disabled={saving}>Convert Another</button></div>
    <p className="save-hint"><Folder size={13}/>Choose a local folder with Save As</p>
    {message && <p className="notice" role="status">{message}</p>}<ErrorMessage message={error}/>
  </section>;
}
