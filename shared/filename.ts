export function mp3Filename(title: string): string {
  let name = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/g, '');
  name = name.replace(/\.mp3$/i, '').slice(0, 120).replace(/[. ]+$/g, '') || 'Audio';
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) name = `_${name}`;
  return `${name}.mp3`;
}
