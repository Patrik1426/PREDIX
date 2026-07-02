<#
  validate-data.ps1 — QA GATE. Corre DESPUES de transform-edomex.ps1 y ANTES de load-sesnsp.ts.
  Valida la integridad del dato normalizado. Si falla algo crítico → exit 1 (no cargar).

  Cubre:
    1. Reconciliación: suma origen (_edomex, ancho) == suma salida (_normalized, largo)
    2. Anomalía municipios: cve_muni fuera del catálogo INEGI Edomex (15001-15125)
    3. Validación de dominio: mes 1-12, cantidad>=0 numérica, anio 2015-2026
    4. Duplicados: unicidad de la llave de negocio
    5. Truncamiento: largo máximo de campos vs límites varchar del schema
    7. Provenance: SHA256 + filas de los CSV crudos → MANIFEST.txt

  Uso: powershell -ExecutionPolicy Bypass -File scripts\validate-data.ps1
#>

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName Microsoft.VisualBasic
$root = Join-Path $PSScriptRoot "..\data\sesnsp"
$edo  = Join-Path $root "_edomex"
$norm = Join-Path $root "_normalized"
$enc  = [System.Text.Encoding]::UTF8

$fails = @()   # errores críticos
$warns = @()   # advertencias

function New-Parser([string]$path) {
  $p = New-Object Microsoft.VisualBasic.FileIO.TextFieldParser($path, $enc)
  $p.SetDelimiters(','); $p.HasFieldsEnclosedInQuotes = $true
  return $p
}

# ── Suma de meses en archivo ANCHO (_edomex) ──
function Sum-Wide([string]$path) {
  $p = New-Parser $path
  $hdr = $p.ReadFields(); $n = $hdr.Count
  $monthStart = if ($n -ge 23) { 11 } else { 9 }
  $sum = [int64]0
  while (-not $p.EndOfData) {
    try { $r = $p.ReadFields() } catch { continue }
    if ($r.Count -ne $n) { continue }
    for ($m = 0; $m -lt 12; $m++) {
      $v = $r[$monthStart + $m].Trim()
      if ($v -ne '') { $sum += [int]$v }
    }
  }
  $p.Close(); return $sum
}

# ── Pase único de QA sobre archivo LARGO (_normalized) ──
function Check-Long([string]$path, [bool]$isVic) {
  $p = New-Parser $path
  $null = $p.ReadFields()  # header
  # indices long
  $iAnio=0; $iMes=1; $iEnt=2; $iEntN=3; $iMuni=4; $iMuniN=5; $iBien=6; $iTipo=7; $iSub=8; $iMod=9
  if ($isVic) { $iSexo=10; $iRango=11; $iCant=13 } else { $iCant=11 }

  $sum=[int64]0; $rows=0
  $badMes=0; $badCant=0; $badAnio=0
  $muni = @{}                     # cve_muni -> municipio
  $badMuni = @{}                  # cve_muni fuera de catalogo -> municipio
  $dups = New-Object 'System.Collections.Generic.HashSet[string]'
  $dupCount=0; $dupSample=@()
  $maxLen = @{ entidad=0; municipio=0; bien=0; tipo=0; sub=0; mod=0; sexo=0; rango=0 }

  while (-not $p.EndOfData) {
    try { $r = $p.ReadFields() } catch { continue }
    $rows++
    $anio=$r[$iAnio]; $mes=$r[$iMes]; $cve=$r[$iMuni]

    # cantidad
    $cantOk = [int]::TryParse($r[$iCant], [ref]([int]$null))
    $c = 0; [void][int]::TryParse($r[$iCant], [ref]$c)
    if (-not $cantOk -or $c -lt 0) { $badCant++ } else { $sum += $c }

    # dominio
    $mn=0; [void][int]::TryParse($mes,[ref]$mn); if ($mn -lt 1 -or $mn -gt 12) { $badMes++ }
    $an=0; [void][int]::TryParse($anio,[ref]$an); if ($an -lt 2015 -or $an -gt 2026) { $badAnio++ }

    # catalogo municipios INEGI Edomex 15001-15125
    $cn=0; [void][int]::TryParse($cve,[ref]$cn)
    $muni[$cve] = $r[$iMuniN]
    if ($cn -lt 15001 -or $cn -gt 15125) { $badMuni[$cve] = $r[$iMuniN] }

    # duplicados (llave de negocio)
    $key = if ($isVic) {
      "$anio|$mes|$cve|$($r[$iBien])|$($r[$iTipo])|$($r[$iSub])|$($r[$iMod])|$($r[$iSexo])|$($r[$iRango])"
    } else {
      "$anio|$mes|$cve|$($r[$iBien])|$($r[$iTipo])|$($r[$iSub])|$($r[$iMod])"
    }
    if (-not $dups.Add($key)) { $dupCount++; if ($dupSample.Count -lt 3) { $dupSample += $key } }

    # truncamiento (largos)
    if ($r[$iEntN].Length -gt $maxLen.entidad)  { $maxLen.entidad  = $r[$iEntN].Length }
    if ($r[$iMuniN].Length -gt $maxLen.municipio){ $maxLen.municipio= $r[$iMuniN].Length }
    if ($r[$iBien].Length  -gt $maxLen.bien)     { $maxLen.bien     = $r[$iBien].Length }
    if ($r[$iTipo].Length  -gt $maxLen.tipo)     { $maxLen.tipo     = $r[$iTipo].Length }
    if ($r[$iSub].Length   -gt $maxLen.sub)      { $maxLen.sub      = $r[$iSub].Length }
    if ($r[$iMod].Length   -gt $maxLen.mod)      { $maxLen.mod      = $r[$iMod].Length }
    if ($isVic) {
      if ($r[$iSexo].Length  -gt $maxLen.sexo)  { $maxLen.sexo  = $r[$iSexo].Length }
      if ($r[$iRango].Length -gt $maxLen.rango) { $maxLen.rango = $r[$iRango].Length }
    }
  }
  $p.Close()
  return [pscustomobject]@{
    Rows=$rows; Sum=$sum; BadMes=$badMes; BadCant=$badCant; BadAnio=$badAnio
    Munis=$muni.Count; BadMuni=$badMuni; DupCount=$dupCount; DupSample=$dupSample; MaxLen=$maxLen
  }
}

Write-Output "==================== QA: validate-data ===================="

# ── 1. Reconciliación ──
Write-Output "`n[1] Reconciliación origen↔salida (suma de cantidad)"
$delWide = (Get-ChildItem $edo -Filter *.csv | Where-Object { $_.Name -notlike '*ctimas*' } | ForEach-Object { Sum-Wide $_.FullName } | Measure-Object -Sum).Sum
$vicWide = (Get-ChildItem $edo -Filter *.csv | Where-Object { $_.Name -like  '*ctimas*' } | ForEach-Object { Sum-Wide $_.FullName } | Measure-Object -Sum).Sum

$del = Check-Long (Join-Path $norm "delitos_long.csv") $false
$vic = Check-Long (Join-Path $norm "victimas_long.csv") $true

Write-Output ("  delitos : origen={0}  salida={1}  {2}" -f $delWide, $del.Sum, $(if ($delWide -eq $del.Sum) { 'OK ✓' } else { 'MISMATCH ✗' }))
Write-Output ("  victimas: origen={0}  salida={1}  {2}" -f $vicWide, $vic.Sum, $(if ($vicWide -eq $vic.Sum) { 'OK ✓' } else { 'MISMATCH ✗' }))
if ($delWide -ne $del.Sum) { $fails += "Reconciliación delitos: $delWide != $($del.Sum)" }
if ($vicWide -ne $vic.Sum) { $fails += "Reconciliación victimas: $vicWide != $($vic.Sum)" }

# ── 2. Anomalía municipios ──
Write-Output "`n[2] Catálogo de municipios (INEGI 15001-15125)"
Write-Output ("  delitos : {0} municipios distintos" -f $del.Munis)
Write-Output ("  victimas: {0} municipios distintos" -f $vic.Munis)
foreach ($pair in @(@('delitos',$del),@('victimas',$vic))) {
  $name=$pair[0]; $o=$pair[1]
  if ($o.BadMuni.Count -gt 0) {
    $warns += "${name}: $($o.BadMuni.Count) cve_muni fuera de catálogo"
    Write-Output "  ⚠ $name — claves fuera de 15001-15125:"
    $o.BadMuni.GetEnumerator() | ForEach-Object { Write-Output ("     {0} = {1}" -f $_.Key, $_.Value) }
  }
}

# ── 3. Validación de dominio ──
Write-Output "`n[3] Validación de dominio"
foreach ($pair in @(@('delitos',$del),@('victimas',$vic))) {
  $name=$pair[0]; $o=$pair[1]
  Write-Output ("  {0}: mes inválido={1}  cantidad inválida={2}  anio inválido={3}" -f $name,$o.BadMes,$o.BadCant,$o.BadAnio)
  if ($o.BadMes -gt 0)  { $fails += "${name}: $($o.BadMes) mes fuera de 1-12" }
  if ($o.BadCant -gt 0) { $fails += "${name}: $($o.BadCant) cantidad inválida/negativa" }
  if ($o.BadAnio -gt 0) { $fails += "${name}: $($o.BadAnio) anio fuera de 2015-2026" }
}

# ── 4. Duplicados ──
Write-Output "`n[4] Duplicados (llave de negocio)"
foreach ($pair in @(@('delitos',$del),@('victimas',$vic))) {
  $name=$pair[0]; $o=$pair[1]
  Write-Output ("  {0}: {1} duplicados" -f $name,$o.DupCount)
  if ($o.DupCount -gt 0) { $warns += "${name}: $($o.DupCount) filas duplicadas"; $o.DupSample | ForEach-Object { Write-Output "     ej: $_" } }
}

# ── 5. Truncamiento (largo máx vs varchar del schema) ──
Write-Output "`n[5] Truncamiento (largo máx observado vs límite varchar)"
$limits = @{ entidad=64; municipio=128; bien=128; tipo=128; sub=160; mod=255; sexo=32; rango=32 }
$labels = @{ entidad='entidad'; municipio='municipio'; bien='bien_juridico'; tipo='tipo'; sub='subtipo'; mod='modalidad'; sexo='sexo'; rango='rango_edad' }
$combined = @{}
foreach ($k in $del.MaxLen.Keys) { $combined[$k] = [math]::Max($del.MaxLen[$k], $vic.MaxLen[$k]) }
foreach ($k in $combined.Keys | Sort-Object) {
  $max=$combined[$k]; $lim=$limits[$k]
  $flag = if ($max -gt $lim) { '✗ EXCEDE' } else { 'OK' }
  Write-Output ("  {0,-14} max={1,4}  límite={2,4}  {3}" -f $labels[$k],$max,$lim,$flag)
  if ($max -gt $lim) { $fails += "$($labels[$k]): largo $max > varchar($lim)" }
}

# ── 7. Provenance / MANIFEST ──
Write-Output "`n[7] Provenance (MANIFEST.txt)"
$manifest = Join-Path $norm "MANIFEST.txt"
$lines = @("# MANIFEST — provenance de la ingesta SESNSP", "# Generado: $(Get-Date -Format o)", "")
Get-ChildItem $root -Recurse -Filter *.csv | Where-Object { $_.FullName -notlike "*\_edomex\*" -and $_.FullName -notlike "*\_normalized\*" } | ForEach-Object {
  $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
  $rows = (Get-Content $_.FullName | Measure-Object -Line).Lines
  $rel  = $_.FullName.Substring((Resolve-Path $root).Path.Length).TrimStart('\')
  $lines += "ARCHIVO : $rel"
  $lines += "  SHA256: $hash"
  $lines += ("  FILAS : {0}   TAMANO: {1:N1} MB" -f $rows, ($_.Length/1MB))
  $lines += ""
}
$lines += "SALIDA delitos_long.csv : $($del.Rows) filas, suma=$($del.Sum)"
$lines += "SALIDA victimas_long.csv: $($vic.Rows) filas, suma=$($vic.Sum)"
[System.IO.File]::WriteAllLines($manifest, $lines, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "  escrito: $manifest"

# ── Veredicto ──
Write-Output "`n==================== VEREDICTO ===================="
if ($warns.Count -gt 0) { Write-Output "ADVERTENCIAS:"; $warns | ForEach-Object { Write-Output "  ⚠ $_" } }
if ($fails.Count -gt 0) {
  Write-Output "FALLAS CRÍTICAS:"; $fails | ForEach-Object { Write-Output "  ✗ $_" }
  Write-Output "`nRESULTADO: ✗ FAIL — NO cargar a BD."
  exit 1
} else {
  Write-Output "RESULTADO: ✓ PASS — dato apto para carga."
  exit 0
}
