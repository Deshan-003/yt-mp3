import { useEffect, useState } from 'react';
import { Copy, Minus, Square, X } from 'lucide-react';
export function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;
    void api.isMaximized().then(setMaximized);
    return api.onMaximizedChange(setMaximized);
  }, []);
  return <div className="titlebar">
    <span><img src="./logo.png" alt=""/>YT MP3</span>
    {window.electronAPI && <div className="window-controls">
      <button aria-label="Minimize" onClick={() => window.electronAPI?.windowAction('minimize')}><Minus/></button>
      <button aria-label={maximized ? 'Restore' : 'Maximize'} onClick={() => window.electronAPI?.windowAction('maximize')}>{maximized ? <Copy/> : <Square/>}</button>
      <button className="close" aria-label="Close" onClick={() => window.electronAPI?.windowAction('close')}><X/></button>
    </div>}
  </div>;
}
