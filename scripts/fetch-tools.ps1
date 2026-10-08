$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$project = Split-Path $PSScriptRoot -Parent
$bin = Join-Path $project 'resources/bin'
$cache = Join-Path $project '.tool-downloads'
$licenses = Join-Path $project 'resources/licenses'
New-Item -ItemType Directory -Force $bin,$cache,$licenses | Out-Null
function Fetch-Verified($url, $file, $hash) {
  if (!(Test-Path -LiteralPath $file) -or (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $hash) {
    & curl.exe --fail --location --silent --show-error --max-time 180 --output $file $url
    if ($LASTEXITCODE -ne 0) { throw "Download failed: $url" }
  }
  if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $hash) { throw "Checksum mismatch: $file" }
}
Fetch-Verified 'https://github.com/yt-dlp/yt-dlp/releases/download/2026.08.19/yt-dlp.exe' (Join-Path $bin 'yt-dlp.exe') '66674953fe251b89f4d08c5f0e35e0728679bd67ab3d7d05c0562af101dd3e7a'
Fetch-Verified 'https://github.com/denoland/deno/releases/download/v2.9.7/deno-x86_64-pc-windows-msvc.zip' (Join-Path $cache 'deno.zip') 'a0c3101b4158d1dfb7d6a78a7bf0f3de80c96bb423c152beec8beb22786f2238'
Fetch-Verified 'https://github.com/GyanD/codexffmpeg/releases/download/9.0.2/ffmpeg-9.0.2-essentials_build.zip' (Join-Path $cache 'ffmpeg.zip') '60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba'
Expand-Archive -LiteralPath (Join-Path $cache 'deno.zip') -DestinationPath (Join-Path $cache 'deno') -Force
Expand-Archive -LiteralPath (Join-Path $cache 'ffmpeg.zip') -DestinationPath (Join-Path $cache 'ffmpeg') -Force
Copy-Item -LiteralPath (Join-Path $cache 'deno/deno.exe') -Destination $bin
$ffroot = Get-ChildItem -LiteralPath (Join-Path $cache 'ffmpeg') -Directory | Select-Object -First 1
Copy-Item -LiteralPath (Join-Path $ffroot.FullName 'bin/ffmpeg.exe'),(Join-Path $ffroot.FullName 'bin/ffprobe.exe') -Destination $bin
Copy-Item -LiteralPath (Join-Path $ffroot.FullName 'LICENSE') -Destination (Join-Path $licenses 'FFmpeg-LICENSE.txt')
Invoke-WebRequest 'https://raw.githubusercontent.com/yt-dlp/yt-dlp/2026.08.19/LICENSE' -OutFile (Join-Path $licenses 'yt-dlp-LICENSE.txt')
Invoke-WebRequest 'https://raw.githubusercontent.com/yt-dlp/yt-dlp/2026.08.19/THIRD_PARTY_LICENSES.txt' -OutFile (Join-Path $licenses 'yt-dlp-THIRD_PARTY_LICENSES.txt')
Invoke-WebRequest 'https://raw.githubusercontent.com/denoland/deno/v2.9.7/LICENSE.md' -OutFile (Join-Path $licenses 'Deno-LICENSE.md')
Get-ChildItem -LiteralPath $bin -Filter '*.exe' | Get-FileHash -Algorithm SHA256 | Select-Object @{Name='File';Expression={Split-Path $_.Path -Leaf}},Hash | ConvertTo-Json | Set-Content (Join-Path $bin 'checksums.json')
Write-Output 'Verified Windows conversion tools are ready.'

