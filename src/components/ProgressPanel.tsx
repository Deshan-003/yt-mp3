import { LoaderCircle } from 'lucide-react';
import type { ConversionUpdate } from '../types';
import { VideoInfo } from './VideoInfo';
const labels = { fetching: 'Getting video information...', downloading: 'Downloading audio...', converting: 'Converting to MP3...' };
export function ProgressPanel({ update, cancel }: { update: ConversionUpdate | null; cancel(): void }) {
  const progress = Math.min(100, Math.max(0, update?.progress || 0));
  return <section className="state-panel" aria-label="Conversion">
    <div className="state-title"><span className="state-icon"><LoaderCircle className="spin" size={20}/></span>
      <div><h2>Making your MP3</h2><p>Just a moment. Your audio is on its way.</p></div></div>
    {update ? <VideoInfo video={update}/> : <div className="metadata-placeholder">Getting video information...</div>}
    <div className="progress-label"><span role="status">{labels[update?.stage || 'fetching']}</span><b>{progress}%</b></div>
    <div className="progress" role="progressbar" aria-label="Conversion progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }}/></div>
    <button className="text-button cancel" onClick={cancel}>Cancel conversion</button>
  </section>;
}
