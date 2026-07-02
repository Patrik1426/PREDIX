<#
  inspect-csv.ps1 — Reporta el ESQUEMA de cada CSV bajo data/sesnsp (no los datos).
  Salida compacta y token-barata: pensada para pegar en el chat.

  Uso:
    powershell -ExecutionPolicy Bypass -File scripts\inspect-csv.ps1
  O guardar a archivo:
    powershell -ExecutionPolicy Bypass -File scripts\inspect-csv.ps1 > schema.txt
#>

$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot "..\data\sesnsp"

if (-not (Test-Path $root)) {
  Write-Output "No existe $root"
  exit 1
}

function Detect-Delimiter([string]$line) {
  $candidates = @{ ',' = ($line.Split(',').Count - 1)
                   ';' = ($line.Split(';').Count - 1)
                   "`t" = ($line.Split("`t").Count - 1)
                   '|' = ($line.Split('|').Count - 1) }
  $best = $candidates.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1
  $name = if ($best.Key -eq "`t") { 'TAB' } else { $best.Key }
  return @{ Char = $best.Key; Name = $name; Count = $best.Value }
}

function Detect-Encoding([string]$path) {
  $bytes = [System.IO.File]::ReadAllBytes($path) | Select-Object -First 4
  if ($bytes.Count -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { return 'UTF-8 (BOM)' }
  if ($bytes.Count -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) { return 'UTF-16 LE' }
  if ($bytes.Count -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) { return 'UTF-16 BE' }
  # Sin BOM: revisar si bytes >127 forman UTF-8 valido; si no, asumir Windows-1252
  $raw = [System.IO.File]::ReadAllBytes($path)
  $sample = $raw | Select-Object -First 4096
  $isUtf8 = $true; $i = 0
  while ($i -lt $sample.Count) {
    $b = $sample[$i]
    if ($b -lt 0x80) { $i++; continue }
    elseif ($b -ge 0xC2 -and $b -le 0xDF) { if ($i+1 -ge $sample.Count -or $sample[$i+1] -lt 0x80) { $isUtf8=$false; break }; $i+=2 }
    elseif ($b -ge 0xE0 -and $b -le 0xEF) { if ($i+2 -ge $sample.Count) { break }; $i+=3 }
    else { $isUtf8 = $false; break }
  }
  if ($isUtf8) { return 'UTF-8 (sin BOM)' } else { return 'Windows-1252 / latin1 (probable)' }
}

$files = Get-ChildItem $root -Recurse -Filter *.csv -File
if ($files.Count -eq 0) {
  Write-Output "No se encontraron .csv bajo $root"
  exit 0
}

foreach ($f in $files) {
  $rel = $f.FullName.Substring((Resolve-Path $root).Path.Length).TrimStart('\')
  $sizeMB = [math]::Round($f.Length / 1MB, 2)
  $first3 = Get-Content $f.FullName -TotalCount 3
  $header = if ($first3.Count -ge 1) { $first3[0] } else { '' }
  $del = Detect-Delimiter $header
  $enc = Detect-Encoding $f.FullName
  $cols = $header.Split($del.Char).Count
  $rows = (Get-Content $f.FullName | Measure-Object -Line).Lines

  Write-Output "==================================================================="
  Write-Output "ARCHIVO : $rel"
  Write-Output "TAMANO  : $sizeMB MB   |   FILAS: $rows (incl. encabezado)"
  Write-Output "DELIM   : $($del.Name)   |   COLUMNAS: $cols   |   ENCODING: $enc"
  Write-Output "-- HEADER --"
  Write-Output $header
  if ($first3.Count -ge 2) { Write-Output "-- FILA 1 --"; Write-Output $first3[1] }
  if ($first3.Count -ge 3) { Write-Output "-- FILA 2 --"; Write-Output $first3[2] }
  Write-Output ""
}

Write-Output "==================================================================="
Write-Output "Total: $($files.Count) archivo(s) CSV."
