# Verification — YT MP3 0.3.0

Verified on 6 October 2026 on Windows 11 (build 26200), Node 24.19.0, npm 10.9.4.

## Build and installation

- `npm install`: passed; existing dependency tree preserved except a targeted security override for shell-quote 1.12.0.
- `npm run dev`: passed, including verified bundled tools, Vite, sandboxed Electron startup, real conversion, and normal close.
- `npm run build`: passed; renderer and Electron TypeScript checks passed.
- `npm run dist`: passed; latest installer is `release/YT-MP3-Setup.exe`, approximately 233 MB.
- Per-user install and reinstall of the final installer: exit code 0, installed version 0.3.0.0.
- Installed path on this host: `%LOCALAPPDATA%/Programs/YT MP3/YT MP3.exe`.
- All four executable tools were found under the installed `resources/bin`, outside ASAR.
- Final installed app launched, converted, saved, reset, closed, reopened, and exited during conversion successfully.
- Existing NSIS welcome/location/shortcut/finish configuration and logo/icon were retained from the previously verified frontend installer.

## Automated checks

- 11 frontend tests passed: supported/deceptive URLs, inline validation, keyboard Enter, clipboard success/failure, mock transitions, cancellation/stale updates, stage errors, reset, filenames, and 650 × 450 layout.
- 8 backend tests passed: real FFmpeg/ffprobe encoding, safe save/cancel/error/retry, URL validation in main, metadata/download/conversion failure cleanup, concurrency, process timeout, and Windows child-tree termination.
- Real development Electron test passed through fetching → downloading → converting → completed, with monotonically increasing real progress ending at 100.
- Final installed Electron test passed the same real flow and unavailable-video handling; verified clipboard IPC, logos/thumbnail, security settings, reset, minimize/maximize/restore/close, and resizing. No renderer page errors were recorded.
- Real Save As IPC test exercised cancellation, an unwritable destination, retry, and successful verified copying. Cancel/error retained the ready result. Save and reset removed owned temporary files.
- Real native Windows Save As dialog was opened and confirmed. It saved into the default Music folder, using the sanitized title. The resulting file matched the verified output hash.
- Exit during an actual metadata request passed both from source and installed application. The active temporary job was removed. Independent Windows process tests verified descendant termination.
- Real youtu.be and /shorts/ URL-form tests passed using the same permitted Big Buck Bunny video ID. This verifies URL normalization; the reference film itself is not a Shorts upload.

## Real audio evidence

Reference: Big Buck Bunny 60fps 4K, official Blender Foundation short film, video ID `aqz-KE-bpKQ`.
Copyright 2008 Blender Foundation / www.bigbuckbunny.org, CC BY 3.0: https://peach.blender.org/about/

- Generated/saved bytes: 25,385,419 (24.2 MiB shown in the UI).
- FFprobe codec: mp3.
- FFprobe audio bitrate: 320000 bit/s.
- FFprobe duration: 634.578146 seconds.
- Complete FFmpeg decode using `-xerror`: passed without corruption/truncation errors.
- Windows Media Player playback engine: Playing state, position advanced past 3 seconds, duration 634.632 seconds, zero media errors. This was an automated playback check, not a subjective listening-quality evaluation.
- SHA-256: `3F4A65DCB368D4BB28CB912A1DE98ED10EA54C7292EE9DC1E7135A96B79BE212`.
- Native-dialog output: `%USERPROFILE%/Music/Big Buck Bunny 60fps 4K - Official Blender Foundation Short Film.mp3`.
- Test output: `test-results/Big Buck Bunny - backend verification.mp3`.
- Evidence: `test-results/real-development.json`, `real-installed.json`, `live-url-checks.json`, `windows-media-playback.json`, and screenshots `real-development.png`, `real-installed.png`, `native-save-success.png`.

The real tests never substituted simulated downloads or empty audio. Mock mode remains confined to explicitly enabled development UI tests and cannot be enabled in production.

## Issues resolved

- npm was initially unavailable. The earlier session bootstrapped npm 10.9.4 outside the project; this host's commands prepend `%LOCALAPPDATA%/YT-MP3-BuildTools` to PATH. A standard Node/npm installation needs no workaround.
- The previous pnpm dependency layout had already been moved aside before this task; the current npm lockfile and working dependencies were retained.
- Vite attempted to watch locked binary downloads on Windows. Resources and download-cache directories are now excluded from its watcher.
- The initial FFmpeg download stalled with Windows PowerShell's web client. The setup script now uses Windows curl, a bounded timeout, the official Gyan GitHub release mirror, and the same published checksum.
- yt-dlp's current YouTube support requires a JavaScript runtime. Deno is bundled and selected explicitly; the official standalone yt-dlp executable already includes EJS.
- An unavailable-video wording variant is now mapped to the requested friendly message.
- The Electron test runner could report an error after a successful Close click destroyed its own page. Tests now wait for actual app exit and accept only that expected page-closed condition.
- npm reported a critical transitive shell-quote advisory in the development runner. A targeted override to 1.12.0 removed it and dev startup was retested.

## Limits and distribution notes

- `npm audit --omit=dev`: zero vulnerabilities. Eight moderate transitive development-tool advisories remain around sprintf-js; no patched published version was available. No forced major upgrades were applied.
- Installer signature: NotSigned. No publisher signing certificate was available.
- Tested on Windows 11 x64; a separate Windows 10 host was not available.
- Metadata operations time out after 3 minutes; download/conversion operations after 30 minutes. Network/service changes may require a maintained yt-dlp update.
- Only single, finite, public videos are supported. No authentication/cookie/protected-content bypasses are provided.
- Keep bundled license notices and satisfy the corresponding-source terms documented in `resources/licenses/THIRD-PARTY.md` when publicly redistributing third-party binaries.
