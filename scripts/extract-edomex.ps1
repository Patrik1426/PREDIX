<#
  extract-edomex.ps1 — Streamea los CSV grandes de SESNSP, filtra solo Estado de México
  (Clave_Ent = 15), escribe un CSV recortado y reporta los tipos de delito distintos.

  - Lee con encoding Windows-1252 (acentos correctos).
  - Streaming linea por linea: NO carga el archivo completo en memoria.
  - Salida recortada en data/sesnsp/_edomex/ (gitignored por *.csv).

  Uso:
    powershell -ExecutionPolicy Bypass -File scripts\extract-edomex.ps1
#>

$ErrorActionPreference = "Stop"
$root   = Join-Path $PSScriptRoot "..\data\sesnsp"
$outDir = Join-Path $root "_edomex"
New-Item -ItemType Directory -Force $outDir | Out-Null

$enc1252 = [System.Text.Encoding]::GetEncoding(1252)
$encUtf8 = New-Object System.Text.UTF8Encoding($false)  # sin BOM

# Indices de columna (0-based) segun el header SESNSP municipal
$IDX_CLAVE_ENT = 1
$IDX_ENTIDAD   = 2
$IDX_MUNI      = 4
$IDX_TIPO      = 6

$inputs = Get-ChildItem $root -Recurse -Filter *.csv -File |
          Where-Object { $_.FullName -notlike "*\_edomex\*" }

foreach ($f in $inputs) {
  $outPath = Join-Path $outDir ("EDOMEX_" + $f.Name)
  $reader = New-Object System.IO.StreamReader($f.FullName, $enc1252)
  $writer = New-Object System.IO.StreamWriter($outPath, $false, $encUtf8)

  $tipos     = @{}   # tipo de delito -> filas
  $munis     = @{}   # municipio -> $true
  $header    = $null
  $lineNo    = 0
  $kept      = 0

  try {
    while (($line = $reader.ReadLine()) -ne $null) {
      $lineNo++
      if ($lineNo -eq 1) { $header = $line; $writer.WriteLine($line); continue }

      $parts = $line.Split(',')
      if ($parts.Count -lt 21) { continue }

      $claveEnt = $parts[$IDX_CLAVE_ENT].Trim()
      $entidad  = $parts[$IDX_ENTIDAD].Trim()

      if ($claveEnt -eq '15' -or $entidad -eq 'México') {
        $writer.WriteLine($line)
        $kept++
        $t = $parts[$IDX_TIPO].Trim()
        if ($tipos.ContainsKey($t)) { $tipos[$t]++ } else { $tipos[$t] = 1 }
        $munis[$parts[$IDX_MUNI].Trim()] = $true
      }
    }
  } finally {
    $reader.Close(); $writer.Close()
  }

  $outMB = [math]::Round((Get-Item $outPath).Length / 1MB, 2)
  Write-Output "==================================================================="
  Write-Output "FUENTE   : $($f.Name)"
  Write-Output "EDOMEX   : $kept filas  ->  $outPath ($outMB MB)"
  Write-Output "MUNICIPIOS distintos: $($munis.Count)"
  Write-Output "-- TIPOS DE DELITO (distintos, con # filas) --"
  $tipos.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
    Write-Output ("  {0,7}  {1}" -f $_.Value, $_.Key)
  }
  Write-Output ""
}

Write-Output "==================================================================="
Write-Output "Listo. CSV recortados en: $outDir"
