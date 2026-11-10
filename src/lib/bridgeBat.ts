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
 * PowerShell runspace that writes the wired snapshot in the same pipe-delimited
 * format `parseWired()` understands. Kept as a standalone `param()` script so it
 * can be handed to `[PowerShell]::Create().AddScript()`.
 */
const WIRED_SNAPSHOT_PS = `param($file, $tmp, $lldpFile)
while ($true) {
  try {
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('# FloorScope wired snapshot v1')
    $lines.Add('# ' + (Get-Date).ToString('o'))
    $nics = @(Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object {
      $_.Status -eq 'Up' -and
      $_.PhysicalMediaType -notmatch 'Wireless|802[.]11|Native 802' -and
      $_.InterfaceDescription -notmatch 'Virtual|Loopback|Tunnel|VPN|Hyper-V|VMware|TAP'
    })
    $ifIndices = @($nics | ForEach-Object { $_.ifIndex })
    foreach ($nic in $nics) {
      $cfg = Get-NetIPConfiguration -InterfaceIndex $nic.ifIndex -ErrorAction SilentlyContinue
      $ipv4 = (@($cfg.IPv4Address | ForEach-Object { $_.IPAddress }) -join ';')
      $prefix = (@($cfg.IPv4Address | ForEach-Object { $_.PrefixLength }) -join ';')
      $gw = (@($cfg.IPv4DefaultGateway | ForEach-Object { $_.NextHop }) -join ';')
      $dns = (@($cfg.DNSServer | Where-Object { $_.AddressFamily -eq 2 } | ForEach-Object { $_.Address }) -join ';')
      $iface = Get-NetIPInterface -InterfaceIndex $nic.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
      $dhcp = '0'
      if ($iface.Dhcp -eq 'Enabled') { $dhcp = '1' }
      $desc = $nic.InterfaceDescription
      if ($desc) { $desc = $desc.Replace('|', '/') }
      $name = $nic.Name
      if ($name) { $name = $name.Replace('|', '/') }
      $lines.Add('ADAPTER|' + $name + '|' + $desc + '|' + $nic.MacAddress + '|' + $nic.Status + '|' + $nic.LinkSpeed + '|' + $ipv4 + '|' + $prefix + '|' + $gw + '|' + $dhcp + '|' + $dns)
    }
    $neigh = @(Get-NetNeighbor -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
      $ifIndices -contains $_.InterfaceIndex -and
      $_.LinkLayerAddress -match '^([0-9a-fA-F][0-9a-fA-F]-){5}[0-9a-fA-F][0-9a-fA-F]$' -and
      $_.LinkLayerAddress -ne '00-00-00-00-00-00' -and
      $_.LinkLayerAddress -ne 'FF-FF-FF-FF-FF-FF' -and
      $_.LinkLayerAddress -notlike '01-00-5E*' -and
      $_.State -ne 'Unreachable' -and $_.State -ne 'Incomplete' -and
      -not ($_.IPAddress.StartsWith('224.') -or $_.IPAddress.StartsWith('239.') -or $_.IPAddress.StartsWith('255.'))
    })
    foreach ($n in $neigh) {
      $lines.Add('NEIGHBOR|' + $n.IPAddress + '|' + $n.LinkLayerAddress + '|' + $n.State)
    }
    if ($lldpFile -and (Test-Path -LiteralPath $lldpFile)) {
      $lldp = (Get-Content -LiteralPath $lldpFile -Raw -ErrorAction SilentlyContinue)
      if ($lldp) { $lines.Add($lldp.Trim()) }
    }
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
}`;

/**
 * One-shot LLDP capture using tshark (Wireshark + Npcap), if it is installed.
 * Runs in the background so the bridge can open the page immediately. When the
 * switch does not speak LLDP, or tshark/Npcap is missing, this quietly does
 * nothing and the UI falls back to gateway/vendor hints.
 */
const LLDP_CAPTURE_PS = `param($OutFile)
try {
  Remove-Item -LiteralPath $OutFile -Force -ErrorAction SilentlyContinue
  $tsPath = $null
  $cmd = Get-Command tshark -ErrorAction SilentlyContinue
  if ($cmd) { $tsPath = $cmd.Source }
  if (-not $tsPath) {
    $pf = [Environment]::GetEnvironmentVariable('ProgramFiles')
    $pf86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
    $candidates = @()
    if ($pf) { $candidates += (Join-Path (Join-Path $pf 'Wireshark') 'tshark.exe') }
    if ($pf86) { $candidates += (Join-Path (Join-Path $pf86 'Wireshark') 'tshark.exe') }
    foreach ($candidate in $candidates) {
      if (Test-Path -LiteralPath $candidate) {
        $tsPath = $candidate
        break
      }
    }
  }
  if (-not $tsPath) { return }
  $nic = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object {
    $_.Status -eq 'Up' -and
    $_.PhysicalMediaType -notmatch 'Wireless|802[.]11|Native 802' -and
    $_.InterfaceDescription -notmatch 'Virtual|Loopback|Tunnel|VPN|Hyper-V|VMware|TAP'
  } | Select-Object -First 1
  if (-not $nic) { return }
  $tsArgs = @('-i', $nic.Name, '-a', 'duration:40', '-c', '1', '-f', 'ether proto 0x88cc', '-T', 'fields', '-E', 'separator=|',
              '-e', 'lldp.chassis.id', '-e', 'lldp.chassis.id.mac', '-e', 'lldp.tlv.system.name',
              '-e', 'lldp.port.id', '-e', 'lldp.port.id.mac', '-e', 'lldp.port.desc',
              '-e', 'lldp.mgn.addr.ip4', '-e', 'lldp.ieee.802_1.port_vlan.id')
  $line = (& $tsPath @tsArgs 2>$null | Select-Object -First 1)
  if ($line) {
    $f = $line.Split('|')
    $chassis = $f[0]; if (-not $chassis) { $chassis = $f[1] }
    $systemName = $f[2]
    $port = $f[3]; if (-not $port) { $port = $f[5] }; if (-not $port) { $port = $f[4] }
    $portDesc = $f[5]
    $mgmt = $f[6]
    $vlan = $f[7]
    ('LLDP|LLDP|' + $chassis + '|' + $systemName + '|' + $port + '|' + $portDesc + '|' + $mgmt + '|' + $vlan) | Set-Content -LiteralPath $OutFile -Encoding utf8
  }
} catch { }`;

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
$wiredFile = Join-Path $scanDir 'wired.txt'
$wiredTmp = Join-Path $scanDir 'wired.tmp'
$lldpFile = Join-Path $scanDir 'lldp.txt'

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

$wiredScript = @'
${WIRED_SNAPSHOT_PS}
'@
$psWired = [PowerShell]::Create()
$null = $psWired.AddScript($wiredScript).AddArgument($wiredFile).AddArgument($wiredTmp).AddArgument($lldpFile)
$null = $psWired.BeginInvoke()

$lldpScript = @'
${LLDP_CAPTURE_PS}
'@
$psLldp = [PowerShell]::Create()
$null = $psLldp.AddScript($lldpScript).AddArgument($lldpFile)
$null = $psLldp.BeginInvoke()

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
$wiredUrl = 'http://' + $bridgeHost + ':' + $port + '/${token}/wired.txt'
$openUrl = $siteUrl + '?live=' + [uri]::EscapeDataString($bridgeUrl) + '&wired=' + [uri]::EscapeDataString($wiredUrl)

Write-Host ''
Write-Host 'FloorScope scanner bridge'
Write-Host '-------------------------'
Write-Host ('Scan file : ' + $scanFile)
Write-Host ('Wired file: ' + $wiredFile)
Write-Host ('Bridge    : ' + $bridgeUrl)
Write-Host ('Wired URL : ' + $wiredUrl)
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
      } elseif ($req.Url.AbsolutePath -ne '/${token}/scan.txt' -and $req.Url.AbsolutePath -ne '/${token}/wired.txt') {
        $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
        $res.StatusCode = 404
        $res.ContentType = 'text/plain; charset=utf-8'
        $res.ContentLength64 = $body.Length
        $res.OutputStream.Write($body, 0, $body.Length)
      } else {
        $targetFile = $scanFile
        if ($req.Url.AbsolutePath -eq '/${token}/wired.txt') { $targetFile = $wiredFile }
        if (-not [System.IO.File]::Exists($targetFile)) {
          $body = [System.Text.Encoding]::UTF8.GetBytes('snapshot not written yet')
          $res.StatusCode = 404
          $res.ContentType = 'text/plain; charset=utf-8'
          $res.ContentLength64 = $body.Length
          $res.OutputStream.Write($body, 0, $body.Length)
        } else {
          $body = [System.IO.File]::ReadAllBytes($targetFile)
          $res.StatusCode = 200
          $res.ContentType = 'text/plain; charset=utf-8'
          $res.Headers['Last-Modified'] = [System.IO.File]::GetLastWriteTimeUtc($targetFile).ToString('R')
          $res.ContentLength64 = $body.Length
          $res.OutputStream.Write($body, 0, $body.Length)
        }
      }
    } finally {
      $res.Close()
    }
  }
} finally {
  $listener.Stop()
  try { $ps.Stop(); $ps.Dispose() } catch { }
  try { $psWired.Stop(); $psWired.Dispose() } catch { }
  try { $psLldp.Stop(); $psLldp.Dispose() } catch { }
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
