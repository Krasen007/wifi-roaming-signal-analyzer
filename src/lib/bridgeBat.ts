const PS_MARKER = "#__PS_START__";

function psQuote(value: string): string {
  return value.replace(/'/g, "''");
}

function randomToken(): string {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Build a self-contained Windows batch file that:
 *   1. runs netsh every 5 s into %LOCALAPPDATA%\FloorScope\scan.txt,
 *   2. serves that file on loopback via a tiny HTTP server, and
 *   3. opens the hosted FloorScope page with `?live=<bridge url>`.
 *
 * The PowerShell payload lives after the PS_MARKER line and is read back out
 * of the batch file, so there is no fragile quoting or -EncodedCommand blob.
 * HttpListener is used instead of a hand-rolled TCP server: Defender/AMSI
 * blocks the raw variant as malicious on current Windows builds.
 */
export function buildBridgeBat(opts: { origin: string; siteUrl: string; token: string }): string {
  const origin = psQuote(opts.origin);
  const siteUrl = psQuote(opts.siteUrl);
  const token = psQuote(opts.token);

  const ps = `$ErrorActionPreference = 'Stop'
$token = '${token}'
$origin = '${origin}'
$siteUrl = '${siteUrl}'
$baseDir = [Environment]::GetFolderPath('LocalApplicationData')
if ([string]::IsNullOrWhiteSpace($baseDir)) { $baseDir = $env:TEMP }
$scanDir = Join-Path $baseDir 'FloorScope'
New-Item -ItemType Directory -Force -Path $scanDir | Out-Null
$scanFile = Join-Path $scanDir 'scan.txt'
$scanTmp = Join-Path $scanDir 'scan.tmp'

$loop = {
  param($file, $tmp)
  while ($true) {
    try {
      $lines = & netsh wlan show networks mode=bssid 2>$null
      $lines += & netsh wlan show interfaces 2>$null
      $lines | Set-Content -LiteralPath $tmp -Encoding utf8
      $moved = $false
      for ($attempt = 0; $attempt -lt 5 -and -not $moved; $attempt++) {
        try {
          if ([System.IO.File]::Exists($file)) { [System.IO.File]::Delete($file) }
          [System.IO.File]::Move($tmp, $file)
          $moved = $true
        } catch {
          Start-Sleep -Milliseconds 100
        }
      }
    } catch { }
    Start-Sleep -Seconds 5
  }
}

$ps = [PowerShell]::Create()
$null = $ps.AddScript($loop).AddArgument($scanFile).AddArgument($scanTmp)
$null = $ps.BeginInvoke()

$probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$probe.Start()
$port = $probe.LocalEndpoint.Port
$probe.Stop()

$listener = $null
$bridgeHost = '127.0.0.1'
foreach ($candidate in @('127.0.0.1', 'localhost')) {
  try {
    $l = [System.Net.HttpListener]::new()
    $l.Prefixes.Add('http://' + $candidate + ':' + $port + '/')
    $l.Start()
    $listener = $l
    $bridgeHost = $candidate
    break
  } catch { }
}
if ($null -eq $listener) {
  try { $ps.Stop(); $ps.Dispose() } catch { }
  throw 'Could not start the local scanner listener. Try running the .bat as administrator.'
}

$bridgeUrl = 'http://' + $bridgeHost + ':' + $port + '/${token}/scan.txt'
$openUrl = $siteUrl + '?live=' + [uri]::EscapeDataString($bridgeUrl)

Write-Host ''
Write-Host 'FloorScope scanner bridge'
Write-Host '-------------------------'
Write-Host ('Scan file : ' + $scanFile)
Write-Host ('Bridge    : ' + $bridgeUrl)
Write-Host ('Opening   : ' + $openUrl)
Write-Host ''
Write-Host 'In the browser, click "Connect local scanner" and allow local network access.'
Write-Host 'Keep this window open. Press Ctrl+C or close it to stop.'
Write-Host ''

Start-Process $openUrl

try {
  while ($true) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $res.Headers['Access-Control-Allow-Origin'] = $origin
      $res.Headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
      $res.Headers['Access-Control-Allow-Headers'] = '*'
      $res.Headers['Access-Control-Allow-Private-Network'] = 'true'
      $res.Headers['Access-Control-Max-Age'] = '600'
      $res.Headers['Vary'] = 'Origin'
      $res.Headers['Cache-Control'] = 'no-store, no-cache, must-revalidate'
      if ($req.HttpMethod -eq 'OPTIONS') {
        $res.StatusCode = 204
        $res.ContentLength64 = 0
      } elseif ($req.HttpMethod -ne 'GET') {
        $body = [System.Text.Encoding]::UTF8.GetBytes('Method not allowed')
        $res.StatusCode = 405
        $res.ContentType = 'text/plain; charset=utf-8'
        $res.ContentLength64 = $body.Length
        $res.OutputStream.Write($body, 0, $body.Length)
      } elseif ($req.Url.AbsolutePath -ne '/${token}/scan.txt') {
        $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
        $res.StatusCode = 404
        $res.ContentType = 'text/plain; charset=utf-8'
        $res.ContentLength64 = $body.Length
        $res.OutputStream.Write($body, 0, $body.Length)
      } elseif (-not [System.IO.File]::Exists($scanFile)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes('scan.txt not written yet')
        $res.StatusCode = 404
        $res.ContentType = 'text/plain; charset=utf-8'
        $res.ContentLength64 = $body.Length
        $res.OutputStream.Write($body, 0, $body.Length)
      } else {
        $body = [System.IO.File]::ReadAllBytes($scanFile)
        $res.StatusCode = 200
        $res.ContentType = 'text/plain; charset=utf-8'
        $res.Headers['Last-Modified'] = [System.IO.File]::GetLastWriteTimeUtc($scanFile).ToString('R')
        $res.ContentLength64 = $body.Length
        $res.OutputStream.Write($body, 0, $body.Length)
      }
    } finally {
      $res.Close()
    }
  }
} finally {
  $listener.Stop()
  try { $ps.Stop(); $ps.Dispose() } catch { }
}
`;

  const runner =
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; ` +
    `$a = Get-Content -LiteralPath '%~f0'; $i = [Array]::IndexOf($a, '${PS_MARKER}'); ` +
    `if ($i -lt 0) { throw 'marker missing' }; ` +
    `Invoke-Expression (($a[($i+1)..($a.Length-1)]) -join [Environment]::NewLine)"`;

  const header = [
    "@echo off",
    "setlocal",
    "title FloorScope scanner bridge",
    "echo FloorScope scanner bridge",
    "echo Keep this window open while analyzing. Press Ctrl+C or close it to stop.",
    "echo.",
    runner,
    "echo.",
    "echo Scanner stopped.",
    "pause",
    "exit /b",
    PS_MARKER,
  ];

  return [
    ...header,
    ...ps.replace(/\r?\n/g, "\r\n").split("\r\n"),
  ].join("\r\n") + "\r\n";
}

/** Generate and download the portable scanner helper from the browser. */
export function downloadBridgeBat(): void {
  const page = new URL(window.location.href);
  page.search = "";
  page.hash = "";

  const bat = buildBridgeBat({
    origin: window.location.origin,
    siteUrl: page.toString(),
    token: randomToken(),
  });

  const blob = new Blob([bat], { type: "application/octet-stream" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "floorscope-scanner.bat";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}
