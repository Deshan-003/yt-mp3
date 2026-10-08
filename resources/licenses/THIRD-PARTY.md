# Bundled conversion tools

These are separate, unmodified executables invoked by the Electron main process.
Their license texts accompany this notice. Users do not need Python, Node, or
other conversion tools installed.

- yt-dlp 2026.08.19: https://github.com/yt-dlp/yt-dlp/releases/tag/2026.08.19
  Source: https://github.com/yt-dlp/yt-dlp/tree/2026.08.19
  Core Unlicense; Windows executable includes third-party components covered by
  yt-dlp-THIRD_PARTY_LICENSES.txt, including GPL components and bundled EJS.
- FFmpeg / FFprobe 9.0.2 Essentials: https://github.com/GyanD/codexffmpeg/releases/tag/9.0.2
  GPL version 3 build from Gyan (a Windows provider linked by ffmpeg.org).
  Matching FFmpeg source: https://github.com/FFmpeg/FFmpeg/tree/946fcce07b
  Build information and library sources: https://www.gyan.dev/ffmpeg/builds/
  The full build configuration is available with ffmpeg.exe -buildconf.
- Deno 2.9.7: https://github.com/denoland/deno/releases/tag/v2.9.7
  MIT; source and dependency lockfile: https://github.com/denoland/deno/tree/v2.9.7
  Runtime used only by yt-dlp's bundled EJS scripts. No remote-components flag,
  cookie extraction, account credentials, or plugin loading is enabled.

Downloads are version-pinned and SHA-256 verified by scripts/fetch-tools.ps1.
Individual executable hashes are recorded in bin/checksums.json.

For redistribution, keep these notices and the upstream licenses with the
binaries and provide corresponding source for GPL components under their
license terms. Upstream source/build links are recorded above; this project
does not relicense the bundled tools.

Test audio (not shipped in the installer): Big Buck Bunny, copyright 2008
Blender Foundation / www.bigbuckbunny.org, Creative Commons Attribution 3.0.
https://peach.blender.org/about/

