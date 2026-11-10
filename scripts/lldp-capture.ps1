param(
  [string]$OutFile = "lldp.txt"
)

$ErrorActionPreference = "SilentlyContinue"

$tsPath = $null
$cmd = Get-Command tshark -ErrorAction SilentlyContinue
if ($cmd) { $tsPath = $cmd.Source }
if (-not $tsPath) {
  $candidates = @(
    (Join-Path $env:ProgramFiles "Wireshark\tshark.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Wireshark\tshark.exe")
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
      $tsPath = $candidate
      break
    }
  }
}
if (-not $tsPath) { return }

$nic = Get-NetAdapter | Where-Object {
  $_.Status -eq "Up" -and
  $_.PhysicalMediaType -notmatch "Wireless|802[.]11|Native 802" -and
  $_.InterfaceDescription -notmatch "Virtual|Loopback|Tunnel|VPN|Hyper-V|VMware|TAP"
} | Select-Object -First 1
if (-not $nic) { return }

$tsArgs = @(
  "-i", $nic.Name,
  "-a", "duration:40",
  "-c", "1",
  "-f", "ether proto 0x88cc",
  "-T", "fields",
  "-E", "separator=|",
  "-e", "lldp.chassis.id",
  "-e", "lldp.chassis.id.mac",
  "-e", "lldp.tlv.system.name",
  "-e", "lldp.port.id",
  "-e", "lldp.port.id.mac",
  "-e", "lldp.port.desc",
  "-e", "lldp.mgn.addr.ip4",
  "-e", "lldp.ieee.802_1.port_vlan.id"
)
$line = (& $tsPath @tsArgs 2>$null | Select-Object -First 1)
if ($line) {
  $f = $line.Split("|")
  $chassis = $f[0]; if (-not $chassis) { $chassis = $f[1] }
  $systemName = $f[2]
  $port = $f[3]; if (-not $port) { $port = $f[5] }; if (-not $port) { $port = $f[4] }
  $portDesc = $f[5]
  $mgmt = $f[6]
  $vlan = $f[7]
  ("LLDP|LLDP|" + $chassis + "|" + $systemName + "|" + $port + "|" + $portDesc + "|" + $mgmt + "|" + $vlan) | Set-Content -LiteralPath $OutFile -Encoding utf8
}
