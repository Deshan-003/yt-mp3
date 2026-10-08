import { Fragment, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Check } from 'lucide-react';
import { TitleBar } from './components/TitleBar';
import { UrlInput } from './components/UrlInput';
import { ConvertButton } from './components/ConvertButton';
import { QualityBadge } from './components/QualityBadge';
import { ProgressPanel } from './components/ProgressPanel';
import { CompletedPanel } from './components/CompletedPanel';
import { ErrorMessage } from './components/ErrorMessage';
import { useConversion } from './hooks/useConversion';
import { youtubeId } from './services/validation';
import { MOCK_MODE } from './services/conversion';

export default function App() {
  const [url, setUrl] = useState('');
  const [inputError, setInputError] = useState('');
  const [pasting, setPasting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const job = useConversion();
  const busy = ['fetching', 'downloading', 'converting'].includes(job.state);
  const step = job.state === 'completed' ? 2 : busy ? 1 : 0;
  function reset() {
    job.reset(); setUrl(''); setInputError('');
    requestAnimationFrame(() => input.current?.focus());
  }
  async function paste() {
    setPasting(true);
    try {
      const text = (window.electronAPI ? await window.electronAPI.readClipboard() : await navigator.clipboard.readText()).trim();
      setUrl(text); setInputError(youtubeId(text) ? '' : 'Please enter a valid YouTube link.');
      if (job.state === 'error') job.reset();
    } catch { setInputError('Couldn’t access the clipboard. Paste your link with Ctrl+V.'); }
    finally { setPasting(false); input.current?.focus(); }
  }
  function convert(event: FormEvent) {
    event.preventDefault();
    if (!youtubeId(url)) { setInputError('Please enter a valid YouTube link.'); input.current?.focus(); return; }
    setInputError(''); void job.startConversion(url.trim());
  }
  return <div className="app-shell"><TitleBar/>
    <main>
      <header className="app-header"><img className="brand-logo" src="./logo.png" alt="YT MP3 logo"/>
        <div><h1>YT MP3</h1><p>YouTube to MP3 Converter</p></div>
        {MOCK_MODE && <span className="preview-badge">UI PREVIEW</span>}
      </header>
      <div className="steps" aria-label="Conversion steps">{['Paste link', 'Convert', 'Save MP3'].map((label, index) => <Fragment key={label}>
        <span className={step === index ? 'active' : ''} aria-current={step === index ? 'step' : undefined}><b>{step > index ? <Check size={11}/> : index + 1}</b>{label}</span>
        {index < 2 && <div className="step-line"/>}</Fragment>)}</div>
      {!busy && job.state !== 'completed' && <section className="state-panel entry">
        <h2>Your next listen starts here.</h2><p className="intro">One link. Your audio, ready to go.</p>
        <form onSubmit={convert} noValidate>
          <UrlInput value={url} inputRef={input} pasting={pasting} onPaste={paste} invalid={!!inputError} onChange={value => {
            setUrl(value); setInputError(''); if (job.state === 'error') job.reset();
          }}/>
          <ErrorMessage message={inputError} id="url-error"/>
          {!inputError && <ErrorMessage message={job.error}/>}
          <ConvertButton busy={busy || pasting}/>
        </form><QualityBadge/>
      </section>}
      {busy && <ProgressPanel update={job.update} cancel={reset}/>}
      {job.result && job.state === 'completed' && <CompletedPanel result={job.result} reset={reset}/>}
    </main>
    <footer><span className="status-dot"/>{MOCK_MODE ? 'Demo mode' : 'YT MP3'}
      <span>{MOCK_MODE ? 'Simulated conversion · No audio file is created' : 'Your audio. Saved locally.'}</span></footer>
  </div>;
}
