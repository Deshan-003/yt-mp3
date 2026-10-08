# YT MP3

A Windows 10/11 desktop utility: **Paste link → Convert → Save**. The existing Electron + React + Vite + TypeScript interface is preserved. Version 0.3.0 connects it to real local conversion.

## Install and use

Run `release/YT-MP3-Setup.exe`. The per-user installer supports a destination folder, Start Menu shortcut, optional desktop shortcut, uninstall, and launching the app. No administrator access or separate Node.js, Python, yt-dlp, FFmpeg, or Deno installation is needed.

Paste a public YouTube video you have permission to download, press Convert to MP3, then Save MP3. Canceling Save As keeps the result ready. A successful save releases the temporary audio and changes the button to Saved; Convert Another starts fresh.

The output is MP3 encoded at 320 kbps. This setting does not improve the quality of the original source. This version handles individual videos, not playlists, live streams, protected/private content, or sign-in requirements. No cookies, browser login extraction, or access-control bypasses are implemented.

## Development (Windows, Node 20 LTS or newer, npm)

```sh
npm install
npm run dev
npm run build
npm run dist
```

`dev` starts Vite and the sandboxed Electron application. `build` type-checks and compiles both renderer and main/preload code. `dist` creates the NSIS installer in `release/YT-MP3-Setup.exe`.

Before dev or packaging, the tool check verifies bundled SHA-256 hashes. If executables are absent from a source-only checkout, it automatically downloads the pinned tools. To restore tools explicitly:

```sh
npm run tools:fetch
```

Only development setup downloads binaries; the installed app makes no update/metadata requests on startup. Conversion contacts YouTube only after Convert is pressed. A thumbnail is fetched after metadata arrives.

## Project structure

```text
electron/
  main.ts                         Window, IPC validation, native Save As, exit cleanup
  preload.ts                      Narrow typed renderer bridge
  backend/
    binaries.ts                   Development/packaged paths and fixed tool arguments
    process.ts                    spawn without shell, timeouts, Windows tree cancellation
    pipeline.ts                   Metadata, audio download, real FFmpeg encode and ffprobe verification
    conversionManager.ts          One active job, progress, opaque result IDs, save and cleanup
    errors.ts                     Friendly error mapping
shared/
  types.ts                        Progress, result, and IPC contracts
  validation.ts                   Shared YouTube URL validation
  filename.ts                     Windows filename sanitization
src/
  components/                     Existing desktop UI components
  hooks/useConversion.ts          UI state and cancellation lifecycle
  services/conversion.ts          Real IPC adapter; explicit development-only mock option
  services/mockConversion.ts      Isolated UI simulation
  styles/                         Existing dark desktop styling
resources/
  bin/                            yt-dlp.exe, ffmpeg.exe, ffprobe.exe, deno.exe, checksums.json
  licenses/                       Third-party licenses and source references
assets/                           Existing logo, icon, and NSIS finish-page configuration
scripts/                          Tool setup and runtime verification
```

Packaged executables live in `resources/bin` outside `app.asar`. The renderer never receives executable paths, source paths, filesystem methods, or arbitrary command APIs. Main validates the sender frame, URL, and result ID. BrowserWindow keeps contextIsolation and sandbox enabled, Node integration disabled, and denies popups, navigation, webviews, and permission requests.

Metadata maps to 0–10%, download to 10–70%, and FFmpeg encoding to 70–99%. Only verified MP3 completion reaches 100%. FFprobe checks MP3 codec, 320000 bit/s, nonzero size, and duration consistency. Save uses a temporary sibling copy, verifies its size, then replaces the user-selected destination. Cancellation, errors, reset, save, and normal exit clean owned conversion directories only.

Local diagnostics are in Electron's logs directory (`%APPDATA%/yt-mp3/logs/conversion.log` on this host). Logs contain stages, sizes, tool exit codes, and filesystem error codes, not URLs, titles, credentials, or environment dumps.

## Tests

```sh
npm test
npm run test:backend
npm run test:desktop
node scripts/live-checks.mjs
node scripts/exit-check.mjs
```

UI tests use installed Microsoft Edge and explicitly enable mock mode only in their Vite server. Backend tests use real FFmpeg/ffprobe with a generated test tone and controlled downloader failures. Desktop and live checks perform real network downloads of Blender's CC BY film Big Buck Bunny; they are not offline tests. `test:desktop` uses deterministic dialog responses to test real save/cancel/error/retry IPC. `native-save.mjs` opens the actual Windows dialog for interaction.

Set `YT_MP3_TEST_EXE` to an installed executable to test packaged binary resolution. With the dev server running, `YT_MP3_DEV_TEST=true` runs the desktop check against Vite. Stop a running dev server before `npm test`, which starts its own isolated server.

For optional UI-only simulation in PowerShell:

```powershell
$env:VITE_MOCK_MODE='true'
npm run dev
```

Remove that environment variable to return to real conversion. Production builds always disable mock mode, even if the variable is set. Mock Save As never writes fake MP3 files.

## Bundled versions and maintenance

- yt-dlp 2026.08.19 (official latest stable release checked during development)
- FFmpeg and FFprobe 9.0.2 Essentials from Gyan, linked by ffmpeg.org
- Deno 2.9.7 for yt-dlp's bundled EJS runtime requirements

Source-only archives omit the large executables; automatic setup fetches and verifies them. The installer includes all four. Update pinned download URLs and hashes together when maintaining the tools; there is no background self-update. Keep the licenses and corresponding-source obligations documented in `resources/licenses/THIRD-PARTY.md` when redistributing the binaries.

The installer is unsigned. Code signing requires the publisher's certificate. The Windows 11 host was tested; a separate physical Windows 10 machine was not available. YouTube availability and extraction behavior can change independently of this application.

See `VERIFICATION.md` for test results and environment fixes.
