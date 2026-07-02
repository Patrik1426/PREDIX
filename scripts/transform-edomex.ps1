<#
  transform-edomex.ps1 — Despivota los CSV Edomex (formato ancho: 1 col por mes)
  a formato LARGO normalizado (1 fila por municipio-anio-mes-tipo-subtipo-modalidad).

  Input : data/sesnsp/_edomex/EDOMEX_*.csv   (ya filtrados, UTF-8)
  Output: data/sesnsp/_normalized/
            - delitos_long.csv   (delitos 2015-2025 + 2026 combinados)
            - victimas_long.csv  (victimas 2026, +sexo +rango_edad)

  NOTA: usa indices por POSICION (no nombres) para evitar la corrupcion de
  literales acentuados que sufre PowerShell 5.1 al leer .ps1 sin BOM.

  Layout fijo SESNSP municipal:
    0 Anio | 1 Clave_Ent | 2 Entidad | 3 Cve.Municipio | 4 Municipio
    5 Bien juridico | 6 Tipo | 7 Subtipo | 8 Modalidad
    Delitos  (21 cols): meses en 9..20
    Victimas (23 cols): 9 Sexo | 10 Rango edad | meses en 11..22

  Uso:
    powershell -ExecutionPolicy Bypass -File scripts\transform-edomex.ps1
#>

param(
  [string]$InDir,   # override carpeta de entrada (default: data/sesnsp/_edomex) — usado por el test
  [string]$OutDir   # override carpeta de salida (default: data/sesnsp/_normalized)
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName Microsoft.VisualBasic
$root   = Join-Path $PSScriptRoot "..\data\sesnsp"
$inDir  = if ($InDir)  { $InDir }  else { Join-Path $root "_edomex" }
$outDir = if ($OutDir) { $OutDir } else { Join-Path $root "_normalized" }
New-Item -ItemType Directory -Force $outDir | Out-Null

$encUtf8 = New-Object System.Text.UTF8Encoding($false)

$delitosOut  = Join-Path $outDir "delitos_long.csv"
$victimasOut = Join-Path $outDir "victimas_long.csv"
$wDel = New-Object System.IO.StreamWriter($delitosOut, $false, $encUtf8)
$wVic = New-Object System.IO.StreamWriter($victimasOut, $false, $encUtf8)
$wDel.WriteLine("anio,mes,cve_ent,entidad,cve_muni,municipio,bien_juridico,tipo,subtipo,modalidad,fuero,cantidad")
$wVic.WriteLine("anio,mes,cve_ent,entidad,cve_muni,municipio,bien_juridico,tipo,subtipo,modalidad,sexo,rango_edad,fuero,cantidad")

function Q([string]$s) { '"' + $s.Trim() + '"' }   # campo de texto entrecomillado

$files = Get-ChildItem $inDir -Filter *.csv -File
$stats = @{}

foreach ($f in $files) {
  $parser = New-Object Microsoft.VisualBasic.FileIO.TextFieldParser($f.FullName, $encUtf8)
  $parser.TextFieldType = [Microsoft.VisualBasic.FileIO.FieldType]::Delimited
  $parser.SetDelimiters(',')
  $parser.HasFieldsEnclosedInQuotes = $true
  $parser.TrimWhiteSpace = $true

  $hdr = $parser.ReadFields()
  $nCols = $hdr.Count
  $isVic = $nCols -ge 23
  $monthStart = if ($isVic) { 11 } else { 9 }

  $emitted = 0; $bad = 0
  while (-not $parser.EndOfData) {
    try { $p = $parser.ReadFields() } catch { $bad++; continue }
    if ($p.Count -ne $nCols) { $bad++; continue }

    $anio = $p[0].Trim(); $ent = $p[1].Trim(); $entN = $p[2].Trim()
    $cveM = $p[3].Trim(); $muni = $p[4].Trim()
    $bien = $p[5].Trim(); $tipo = $p[6].Trim(); $sub = $p[7].Trim(); $mod = $p[8].Trim()

    for ($m = 0; $m -lt 12; $m++) {
      $val = $p[$monthStart + $m].Trim()
      if ($val -eq '' -or $val -eq '0') { continue }   # vacío o cero: no se almacena (lossless en SUM; elimina 15999)
      $mes = $m + 1

      if ($isVic) {
        $sexo = $p[9].Trim(); $rango = $p[10].Trim()
        $wVic.WriteLine(("{0},{1},{2},{3},{4},{5},{6},{7},{8},{9},{10},{11},comun,{12}" -f `
          $anio,$mes,$ent,(Q $entN),$cveM,(Q $muni),(Q $bien),(Q $tipo),(Q $sub),(Q $mod),(Q $sexo),(Q $rango),$val))
      } else {
        $wDel.WriteLine(("{0},{1},{2},{3},{4},{5},{6},{7},{8},{9},comun,{10}" -f `
          $anio,$mes,$ent,(Q $entN),$cveM,(Q $muni),(Q $bien),(Q $tipo),(Q $sub),(Q $mod),$val))
      }
      $emitted++
    }
  }
  $parser.Close()
  $stats[$f.Name] = @{ Emitted = $emitted; Bad = $bad; Vic = $isVic }
}

$wDel.Close(); $wVic.Close()

foreach ($k in $stats.Keys) {
  Write-Output ("{0}: {1} filas largas (mal formadas: {2})" -f $k, $stats[$k].Emitted, $stats[$k].Bad)
}
$delMB = [math]::Round((Get-Item $delitosOut).Length/1MB,2)
$vicMB = [math]::Round((Get-Item $victimasOut).Length/1MB,2)
Write-Output "-------------------------------------------------------------------"
Write-Output "delitos_long.csv  : $delMB MB"
Write-Output "victimas_long.csv : $vicMB MB"
Write-Output "Salida en: $outDir"