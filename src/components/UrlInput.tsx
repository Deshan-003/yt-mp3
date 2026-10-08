import type { Ref } from 'react';
import { Clipboard, Link2 } from 'lucide-react';
interface Props { value: string; onChange(value: string): void; onPaste(): void; invalid: boolean; inputRef: Ref<HTMLInputElement>; pasting: boolean }
export function UrlInput({ value, onChange, onPaste, invalid, inputRef, pasting }: Props) {
  return <><label htmlFor="youtube-url">YouTube Link</label>
    <div className={`url-field ${invalid ? 'invalid' : ''}`}>
      <Link2 size={18}/><input ref={inputRef} id="youtube-url" type="url" autoFocus autoComplete="off" spellCheck={false}
        value={value} placeholder="Paste YouTube link here..." onChange={event => onChange(event.target.value)}
        aria-invalid={invalid} aria-describedby={invalid ? 'url-error' : undefined}/>
      <button className="paste" type="button" onClick={onPaste} disabled={pasting}><Clipboard size={14}/>Paste</button>
    </div></>;
}
