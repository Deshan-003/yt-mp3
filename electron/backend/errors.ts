import type { ConversionStage } from '../../shared/types';
import { ProcessFailure } from './process';
export function friendlyError(error: unknown, stage: ConversionStage): string {
  const detail = error instanceof ProcessFailure ? error.details : error instanceof Error ? error.message : '';
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  if (detail === 'TOOLS_MISSING') return 'Conversion tools are missing. Please reinstall YT MP3.';
  if (['ENOSPC', 'EACCES', 'EPERM', 'EROFS'].includes(code || '') || /no space left|disk full|permission denied/i.test(detail))
    return "Couldn't save the MP3. Check the selected location and try again.";
  if (/private video|video (?:is )?unavailable|not available|removed|sign in|age.restrict|members.only|live video|copyright/i.test(detail))
    return 'This video is unavailable.';
  if (/timed out|unable to connect|name resolution|network is unreachable|connection refused|connection reset|unable to download webpage/i.test(detail))
    return 'Unable to connect. Check your internet connection and try again.';
  return { fetching: "Couldn't get information for this video.", downloading: "Couldn't download the audio. Please try again.",
    converting: "Couldn't convert this video. Please try again." }[stage];
}

