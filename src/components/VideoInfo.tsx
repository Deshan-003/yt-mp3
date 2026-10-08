import { Music2 } from 'lucide-react';
import type { VideoInfo as Video } from '../types';
export function VideoInfo({ video, sizeBytes }: { video: Video; sizeBytes?: number }) {
  const seconds = Math.round(video.duration);
  const duration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return <div className="media-card">
    <img className="thumbnail" src={video.thumbnail || './demo-art.svg'} alt="Video artwork" referrerPolicy="no-referrer"
      onError={event => { if (!event.currentTarget.src.endsWith('/demo-art.svg')) event.currentTarget.src = './demo-art.svg'; }}/>
    <div className="track"><h3 title={video.title}>{video.title}</h3>
      <p>{duration}{sizeBytes !== undefined && <> <i>•</i> {(sizeBytes / 1024 / 1024).toFixed(1)} MB</>}</p>
      <span className="format">MP3 <i>•</i> 320 kbps</span>
    </div><Music2 className="file-icon" size={20}/>
  </div>;
}
