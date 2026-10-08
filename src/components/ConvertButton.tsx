import { ArrowRight, AudioLines, LoaderCircle } from 'lucide-react';
export function ConvertButton({ busy = false }: { busy?: boolean }) {
  return <button type="submit" className="primary convert-button" disabled={busy}>
    {busy ? <LoaderCircle className="spin" size={18}/> : <AudioLines size={18}/>}
    {busy ? 'Starting...' : 'Convert to MP3'}<ArrowRight className="cta-arrow" size={17}/>
  </button>;
}
