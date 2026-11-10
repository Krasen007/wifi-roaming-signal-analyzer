param(
  [string]$OutFile = "wired.txt",
  [string]$LldpFile = ""
)

$ErrorActionPreference = "SilentlyContinue"

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# FloorScope wired snapshot v1")
$lines.Add("# " + (Get-Date).ToString("o"))

$allNics = @(Get-NetAdapter | Where-Object {
  $_.PhysicalMediaType -notmatch "Wireless|802[.]11|Native 802" -and
  $_.InterfaceDescription -notmatch "Virtual|Loopback|Tunnel|VPN|Hyper-V|VMware|TAP"
})
$nics = @($allNics | Where-Object { $_.Status -eq "Up" })
$linkStatus = if ($nics.Count -gt 0) { "connected" } elseif ($allNics.Count -gt 0) { "disconnected" } else { "unavailable" }
$lines.Add("LINK|" + $linkStatus)
$ifIndices = @($nics | ForEach-Object { $_.ifIndex })

foreach ($nic in $nics) {
  $cfg = Get-NetIPConfiguration -InterfaceIndex $nic.ifIndex
  $ipv4 = (@($cfg.IPv4Address | ForEach-Object { $_.IPAddress }) -join ";")
  $prefix = (@($cfg.IPv4Address | ForEach-Object { $_.PrefixLength }) -join ";")
  $gw = (@($cfg.IPv4DefaultGateway | ForEach-Object { $_.NextHop }) -join ";")
  $dns = (@($cfg.DNSServer | Where-Object { $_.AddressFamily -eq 2 } | ForEach-Object { $_.Address }) -join ";")
  $iface = Get-NetIPInterface -InterfaceIndex $nic.ifIndex -AddressFamily IPv4
  $dhcp = "0"
  if ($iface.Dhcp -eq "Enabled") { $dhcp = "1" }
  $desc = $nic.InterfaceDescription
  if ($desc) { $desc = $desc.Replace("|", "/") }
  $name = $nic.Name
  if ($name) { $name = $name.Replace("|", "/") }
  $lines.Add("ADAPTER|" + $name + "|" + $desc + "|" + $nic.MacAddress + "|" + $nic.Status + "|" + $nic.LinkSpeed + "|" + $ipv4 + "|" + $prefix + "|" + $gw + "|" + $dhcp + "|" + $dns)
}

$neigh = @(Get-NetNeighbor -AddressFamily IPv4 | Where-Object {
  $ifIndices -contains $_.InterfaceIndex -and
  $_.LinkLayerAddress -match "^([0-9a-fA-F][0-9a-fA-F]-){5}[0-9a-fA-F][0-9a-fA-F]$" -and
  $_.LinkLayerAddress -ne "00-00-00-00-00-00" -and
  $_.LinkLayerAddress -ne "FF-FF-FF-FF-FF-FF" -and
  $_.LinkLayerAddress -notlike "01-00-5E*" -and
  $_.State -ne "Unreachable" -and $_.State -ne "Incomplete" -and
  -not ($_.IPAddress.StartsWith("224.") -or $_.IPAddress.StartsWith("239.") -or $_.IPAddress.StartsWith("255."))
})

foreach ($n in $neigh) {
  $lines.Add("NEIGHBOR|" + $n.IPAddress + "|" + $n.LinkLayerAddress + "|" + $n.State)
}

if ($LldpFile -and (Test-Path -LiteralPath $LldpFile)) {
  $lldp = Get-Content -LiteralPath $LldpFile -Raw
  if ($lldp) { $lines.Add($lldp.Trim()) }
}

$tmp = $OutFile + ".tmp"
$lines | Set-Content -LiteralPath $tmp -Encoding utf8
$moved = $false
for ($attempt = 0; $attempt -lt 5 -and -not $moved; $attempt++) {
  try {
    if ([System.IO.File]::Exists($OutFile)) { [System.IO.File]::Delete($OutFile) }
    [System.IO.File]::Move($tmp, $OutFile)
    $moved = $true
  } catch {
    Start-Sleep -Milliseconds 100
  }
}
