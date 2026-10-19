$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    $env:PATH = (Join-Path $PSScriptRoot 'node_modules\ffmpeg-static') + ';' + (Join-Path $PSScriptRoot 'node_modules\ffprobe-static\bin\win32\x64') + ';' + $env:PATH
    node build-video.mjs
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo construir la composición.' }
    npx --yes hyperframes@0.8.45 check
    if ($LASTEXITCODE -ne 0) { throw 'La validación no pasó.' }
    npx --yes hyperframes@0.8.45 render --quality delivery --fps 30 --workers 2 --output ../brag.mp4
    if ($LASTEXITCODE -ne 0) { throw 'La exportación no se completó.' }
    & .\node_modules\ffmpeg-static\ffmpeg.exe -y -loglevel error -ss 2.3 -i ../brag.mp4 -frames:v 1 -q:v 2 ../brag.jpg
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo extraer la portada.' }
    & .\node_modules\ffmpeg-static\ffmpeg.exe -y -loglevel error -i ../brag.mp4 -i ../brag.jpg -filter_complex "[0:v][1:v]overlay=0:0:enable='lt(t,0.033333)'[v]" -map '[v]' -map '0:a?' -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a copy -movflags +faststart ../brag.poster.mp4
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo incorporar la portada.' }
    Move-Item -LiteralPath ../brag.poster.mp4 -Destination ../brag.mp4 -Force
} finally { Pop-Location }
